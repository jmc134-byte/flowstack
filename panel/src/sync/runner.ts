import {
  fetchAccountTimezone, fetchActivitiesPage, fetchInsightsPage, MetaApiError, type MetaCreds,
} from "../connectors/meta";
import { GhlApiError, searchContactsPage, tagFilter } from "../connectors/ghl";
import { localDayKey } from "../lib/time";

/**
 * Despachador de sincronización por pedazos (plan gratis de Workers, docs/FASE-0-PLAN.md §4.2):
 * cada minuto corre como máximo MAX_STEPS pasos; cada paso hace UNA llamada a la API y guarda el avance
 * en `sync_state`. Idempotente (upserts) y con reintentos con espera exponencial.
 */
export const MAX_STEPS = 2;

export interface SyncEnv {
  DB: D1Database;
  META_TOKEN?: string;
  META_APP_SECRET?: string;
  META_AD_ACCOUNTS?: string; // "act_123,act_456"
  META_BACKFILL_SINCE?: string; // YYYY-MM-DD; por defecto 2026-10-01 (cubre TAX MASTER ed. 1)
  GHL_LOCATIONS?: string; // "kZT0P8HbGrGXuUGi7QJy,..."
  SYNC_ACTIVE?: string; // "1" en semanas de lanzamiento → cada 15 min; si no, cada 60
  [key: string]: unknown; // GHL_PIT_<LOCATION>, GHL_TAGS_<LOCATION>
}

interface JobDef {
  job: string;
  connection: string;
  source: string;
  run: (cursor: any) => Promise<{ cursor: any; done: boolean; rows: number }>;
}

const list = (v: unknown) => (typeof v === "string" ? v.split(",").map((x) => x.trim()).filter(Boolean) : []);
const addMinutes = (d: Date, m: number) => new Date(d.getTime() + m * 60_000);
const shiftDay = (day: string, delta: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

export function intervalMinutes(env: SyncEnv): number {
  return env.SYNC_ACTIVE === "1" ? 15 : 60;
}

/** Trabajos según las credenciales presentes. Las fuentes sin credenciales se reportan, no se ocultan. */
export function buildJobs(env: SyncEnv, fetchFn: typeof fetch, now: Date): { jobs: JobDef[]; missing: Array<{ connection: string; source: string; detail: string }> } {
  const jobs: JobDef[] = [];
  const missing: Array<{ connection: string; source: string; detail: string }> = [];

  const accounts = list(env.META_AD_ACCOUNTS);
  if (accounts.length && (!env.META_TOKEN || !env.META_APP_SECRET)) {
    for (const a of accounts) missing.push({ connection: `meta:${a}`, source: "meta", detail: "faltan META_TOKEN o META_APP_SECRET" });
  } else if (env.META_TOKEN && env.META_APP_SECRET) {
    const creds: MetaCreds = { token: env.META_TOKEN, appSecret: env.META_APP_SECRET };
    for (const acct of accounts) {
      jobs.push({
        job: `meta:insights:${acct}`,
        connection: `meta:${acct}`,
        source: "meta",
        run: async (cursor) => {
          let c = cursor;
          if (!c) {
            const tz = await fetchAccountTimezone(fetchFn, creds, acct);
            const today = localDayKey(now, tz);
            // Primera vez: desde la fecha de carga histórica; después: últimos 3 días (Meta ajusta datos recientes).
            return { cursor: { tz, since: env.META_BACKFILL_SINCE ?? "2026-10-01", until: today, after: null, backfilled: false }, done: false, rows: 0 };
          }
          const page = await fetchInsightsPage(fetchFn, creds, acct, "ad", c.since, c.until, c.after);
          await upsertMetaRows(env.DB, acct, page.rows);
          if (page.nextAfter) return { cursor: { ...c, after: page.nextAfter }, done: false, rows: page.rows.length };
          const today = localDayKey(now, c.tz);
          return { cursor: { ...c, since: shiftDay(today, -3), until: today, after: null, backfilled: true }, done: true, rows: page.rows.length };
        },
      });
      jobs.push({
        job: `meta:activities:${acct}`,
        connection: `meta:${acct}`,
        source: "meta",
        // La API devuelve primero lo más reciente; con INSERT OR IGNORE se acumula el historial desde hoy.
        run: async () => {
          const page = await fetchActivitiesPage(fetchFn, creds, acct, null);
          await upsertActivities(env.DB, acct, page.rows);
          return { cursor: null, done: true, rows: page.rows.length };
        },
      });
    }
  }

  for (const loc of list(env.GHL_LOCATIONS)) {
    const token = env[`GHL_PIT_${loc}`];
    const tags = list(env[`GHL_TAGS_${loc}`]);
    if (typeof token !== "string" || !token) {
      missing.push({ connection: `ghl:${loc}`, source: "ghl", detail: `falta GHL_PIT_${loc}` });
      continue;
    }
    for (const tag of tags) {
      jobs.push({
        job: `ghl:contacts:${loc}:${tag}`,
        connection: `ghl:${loc}`,
        source: "ghl",
        run: async (cursor) => {
          const page = await searchContactsPage(fetchFn, token, loc, [tagFilter(tag)], cursor?.searchAfter ?? null);
          await upsertGhlContacts(env.DB, loc, page.rows);
          return page.searchAfter
            ? { cursor: { searchAfter: page.searchAfter }, done: false, rows: page.rows.length }
            : { cursor: null, done: true, rows: page.rows.length };
        },
      });
    }
  }
  return { jobs, missing };
}

export async function runDueJobs(env: SyncEnv, fetchFn: typeof fetch = fetch, now = new Date()) {
  const { jobs, missing } = buildJobs(env, fetchFn, now);
  const nowIso = now.toISOString();
  for (const m of missing) {
    await env.DB.prepare(
      `INSERT INTO connections (id, source, status, last_error_at, last_error) VALUES (?1, ?2, 'sin_credenciales', ?3, ?4)
       ON CONFLICT(id) DO UPDATE SET status='sin_credenciales', last_error_at=?3, last_error=?4`,
    ).bind(m.connection, m.source, nowIso, m.detail).run();
  }
  if (!jobs.length) return [];

  const { results } = await env.DB.prepare(`SELECT job, cursor, next_run_at, attempts FROM sync_state`).all<{
    job: string; cursor: string | null; next_run_at: string; attempts: number;
  }>();
  const state = new Map(results.map((r) => [r.job, r]));
  const due = jobs
    .filter((j) => (state.get(j.job)?.next_run_at ?? "") <= nowIso)
    .sort((a, b) => (state.get(a.job)?.next_run_at ?? "").localeCompare(state.get(b.job)?.next_run_at ?? ""))
    .slice(0, MAX_STEPS);

  const outcomes: Array<{ job: string; ok: boolean; rows: number; error?: string }> = [];
  for (const j of due) {
    const prev = state.get(j.job);
    const cursor = prev?.cursor ? JSON.parse(prev.cursor) : null;
    try {
      const r = await j.run(cursor);
      const next = r.done ? addMinutes(now, intervalMinutes(env)) : now; // si no terminó, sigue el próximo minuto
      await env.DB.prepare(
        `INSERT INTO sync_state (job, cursor, next_run_at, last_ok_at, last_error, attempts) VALUES (?1, ?2, ?3, ?4, NULL, 0)
         ON CONFLICT(job) DO UPDATE SET cursor=?2, next_run_at=?3, last_ok_at=?4, last_error=NULL, attempts=0`,
      ).bind(j.job, r.cursor ? JSON.stringify(r.cursor) : null, next.toISOString(), nowIso).run();
      if (r.done || r.rows > 0) {
        await env.DB.prepare(
          `INSERT INTO connections (id, source, status, last_data_at) VALUES (?1, ?2, 'ok', ?3)
           ON CONFLICT(id) DO UPDATE SET status='ok', last_data_at=?3`,
        ).bind(j.connection, j.source, nowIso).run();
      }
      outcomes.push({ job: j.job, ok: true, rows: r.rows });
    } catch (e) {
      const attempts = (prev?.attempts ?? 0) + 1;
      const rateLimited = (e instanceof MetaApiError || e instanceof GhlApiError) && e.isRateLimit;
      const backoff = Math.min(60, 2 ** attempts) * (rateLimited ? 5 : 1); // minutos
      const msg = e instanceof Error ? e.message : String(e);
      await env.DB.prepare(
        `INSERT INTO sync_state (job, cursor, next_run_at, last_error, attempts) VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT(job) DO UPDATE SET next_run_at=?3, last_error=?4, attempts=?5`,
      ).bind(j.job, prev?.cursor ?? null, addMinutes(now, backoff).toISOString(), msg.slice(0, 500), attempts).run();
      await env.DB.prepare(
        `INSERT INTO connections (id, source, status, last_error_at, last_error) VALUES (?1, ?2, 'error', ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET status='error', last_error_at=?3, last_error=?4`,
      ).bind(j.connection, j.source, nowIso, msg.slice(0, 500)).run();
      outcomes.push({ job: j.job, ok: false, rows: 0, error: msg });
    }
  }
  return outcomes;
}

async function upsertMetaRows(db: D1Database, acct: string, rows: Awaited<ReturnType<typeof fetchInsightsPage>>["rows"]) {
  if (!rows.length) return;
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO meta_insights_daily (account_id, level, entity_id, date, campaign_id, campaign_name, adset_id, adset_name,
       ad_id, ad_name, spend_cents, impressions, clicks, link_clicks, leads, purchases, actions, fetched_at)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18)
     ON CONFLICT(account_id, level, entity_id, date) DO UPDATE SET campaign_name=?6, adset_name=?8, ad_name=?10,
       spend_cents=?11, impressions=?12, clicks=?13, link_clicks=?14, leads=?15, purchases=?16, actions=?17, fetched_at=?18`,
  );
  await db.batch(rows.map((r) => stmt.bind(
    acct, r.level, r.entityId, r.date, r.campaignId, r.campaignName, r.adsetId, r.adsetName, r.adId, r.adName,
    r.spendCents, r.impressions, r.clicks, r.linkClicks, r.leads, r.purchases, r.actionsJson, now,
  )));
}

async function upsertActivities(db: D1Database, acct: string, rows: Awaited<ReturnType<typeof fetchActivitiesPage>>["rows"]) {
  if (!rows.length) return;
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO meta_activities (account_id, event_time, event_type, translated, object_id, object_name, object_type, actor_name, extra_data)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9)`,
  );
  await db.batch(rows.map((a) => stmt.bind(acct, a.eventTime, a.eventType, a.translated, a.objectId ?? "", a.objectName, a.objectType, a.actorName, a.extraData)));
}

async function upsertGhlContacts(db: D1Database, loc: string, rows: Awaited<ReturnType<typeof searchContactsPage>>["rows"]) {
  if (!rows.length) return;
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO ghl_contacts (location_id, contact_id, date_added, tags, email_hash, source, attribution, synced_at)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8)
     ON CONFLICT(location_id, contact_id) DO UPDATE SET date_added=?3, tags=?4, email_hash=?5, source=?6, attribution=?7, synced_at=?8`,
  );
  await db.batch(rows.map((r) => stmt.bind(loc, r.contactId, r.dateAdded, JSON.stringify(r.tags), r.emailHash, r.source, JSON.stringify(r.attribution), now)));
}
