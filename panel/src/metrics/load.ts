import type { Dataset } from "./dataset";
import { loadLaunch } from "../api/launches";
import type { SaleEvent } from "../webhooks/sales";

const META_SOURCES = "('facebook','fb','instagram','ig','meta')";

/** Lee de D1 todo lo que necesita un lanzamiento. El trabajo pesado va en SQL (no cuenta como CPU del Worker). */
export async function loadDataset(db: D1Database, launchId: string, now = Date.now()): Promise<Dataset | null> {
  const launch = await loadLaunch(db, launchId);
  if (!launch) return null;
  const refs = (source: string, kind: string) => launch.sources.filter((s) => s.source === source && s.ref_kind === kind).map((s) => s.ref_value);

  const location = refs("ghl", "location")[0] ?? null;
  const regTags = refs("ghl", "tag_registration").map((t) => t.toLowerCase());
  const accounts = refs("meta", "ad_account");
  const campaigns = refs("meta", "campaign");
  const salesSystems = refs("ventas", "sistema");
  const salesProducts = refs("ventas", "producto");
  const captureStart = launch.milestones.find((m) => m.kind === "capture_start")?.starts_at ?? null;
  const end = launch.milestones.find((m) => m.kind === "cart_close")?.starts_at ?? null;

  // ── Conexiones relevantes (las que nunca han enviado datos aparecen igual, como "sin datos")
  const expected = [
    ...(location ? [`ghl:${location}`] : []),
    ...accounts.map((a) => `meta:${a}`),
    ...salesSystems.map((s) => `ventas:${s}`),
    ...refs("youtube", "youtube_video").length ? ["youtube"] : [],
    "cron:despachador",
  ];
  const { results: connRows } = await db.prepare(`SELECT id, status, last_data_at, last_error FROM connections`).all<any>();
  const connections: Dataset["connections"] = {};
  for (const id of expected) connections[id] = { status: "unknown", last_data_at: null, last_error: null };
  for (const r of connRows) {
    if (expected.includes(r.id) || r.id.startsWith("ventas:") || r.id.startsWith("youtube")) connections[r.id] = { status: r.status, last_data_at: r.last_data_at, last_error: r.last_error };
  }

  // ── Registrados únicos (webhook = hora exacta; API = dateAdded, estimada)
  let registrations: Dataset["registrations"] = null;
  if (location && regTags.length) {
    const sql = `
      WITH tagset AS (SELECT value AS tag FROM json_each(?2)),
      wh AS (
        SELECT e.contact_id, MIN(e.received_at) t,
          MAX(CASE WHEN lower(COALESCE(json_extract(e.attribution,'$.utm_source'),'')) IN ${META_SOURCES}
                     OR json_extract(e.attribution,'$.fbclid') IS NOT NULL THEN 1 ELSE 0 END) meta,
          MAX(COALESCE(json_extract(e.attribution,'$.variante_landing'), json_extract(e.attribution,'$.variante'),
                       json_extract(e.attribution,'$.landing'), json_extract(e.attribution,'$.variant'))) variant
        FROM ghl_webhook_events e
        WHERE e.location_id=?1 AND EXISTS (SELECT 1 FROM json_each(e.tags) j JOIN tagset ON j.value=tagset.tag)
        GROUP BY e.contact_id),
      api AS (
        SELECT c.contact_id, c.date_added t,
          CASE WHEN lower(COALESCE(json_extract(c.attribution,'$.utmSource'),'')) IN ${META_SOURCES}
                 OR json_extract(c.attribution,'$.fbclid') IS NOT NULL THEN 1 ELSE 0 END meta,
          json_extract(c.attribution,'$.url') variant
        FROM ghl_contacts c
        WHERE c.location_id=?1 AND EXISTS (SELECT 1 FROM json_each(c.tags) j JOIN tagset ON j.value=tagset.tag))
      SELECT CAST(strftime('%s', wh.t) AS INTEGER) * 1000 AS ms, 1 AS exact, MAX(wh.meta, COALESCE(api.meta, 0)) AS meta, COALESCE(wh.variant, api.variant) AS variant
        FROM wh LEFT JOIN api ON api.contact_id = wh.contact_id
      UNION ALL
      SELECT CAST(strftime('%s', CASE WHEN ?3 IS NOT NULL AND api.t < ?3 THEN ?3 ELSE api.t END) AS INTEGER) * 1000 AS ms, 0 AS exact, api.meta AS meta, api.variant AS variant
        FROM api WHERE api.t IS NOT NULL AND api.contact_id NOT IN (SELECT contact_id FROM wh)`;
    registrations = (await db.prepare(sql).bind(location, JSON.stringify(regTags), captureStart).raw()) as Dataset["registrations"];
  }

  // ── Meta
  let meta: Dataset["meta"] = null;
  if (accounts.length) {
    const accJson = JSON.stringify(accounts);
    const campJson = JSON.stringify(campaigns);
    const since = captureStart ? captureStart.slice(0, 10) : "0000-00-00";
    const until = end ? end.slice(0, 10) : "9999-12-31";
    const filter = `account_id IN (SELECT value FROM json_each(?1)) AND (json_array_length(?2)=0 OR campaign_id IN (SELECT value FROM json_each(?2))) AND date >= ?3 AND date <= ?4`;
    const [rows, change, tz] = await db.batch([
      db.prepare(`SELECT date, campaign_id, MAX(campaign_name) campaign_name, ad_id, MAX(ad_name) ad_name, SUM(spend_cents) spend_cents,
          SUM(impressions) impressions, SUM(clicks) clicks, SUM(link_clicks) link_clicks, SUM(leads) leads
        FROM meta_insights_daily WHERE level='ad' AND ${filter} GROUP BY date, campaign_id, ad_id ORDER BY date`).bind(accJson, campJson, since, until),
      db.prepare(`SELECT MAX(event_time) t FROM meta_activities WHERE account_id IN (SELECT value FROM json_each(?1)) AND object_id IN (
          SELECT campaign_id FROM meta_insights_daily WHERE ${filter} UNION SELECT adset_id FROM meta_insights_daily WHERE ${filter}
          UNION SELECT ad_id FROM meta_insights_daily WHERE ${filter})`).bind(accJson, campJson, since, until),
      db.prepare(`SELECT json_extract(cursor,'$.tz') tz FROM sync_state WHERE job = 'meta:insights:' || ?1`).bind(accounts[0]),
    ]);
    meta = { rows: rows!.results as any, lastChangeAt: (change!.results[0] as any)?.t ?? null, timezone: (tz!.results[0] as any)?.tz ?? null };
  }

  // ── Ventas (sistema propio)
  let sales: SaleEvent[] | null = null;
  const salesContacts: Record<string, string> = {};
  const salesHasData = salesSystems.some((s) => connections[`ventas:${s}`]?.last_data_at);
  if (salesSystems.length && salesHasData) {
    const { results } = await db.prepare(
      `SELECT * FROM sales_events WHERE system IN (SELECT value FROM json_each(?1))
         AND (launch_id = ?2 OR (launch_id IS NULL AND product IN (SELECT value FROM json_each(?3)))) ORDER BY occurred_at`,
    ).bind(JSON.stringify(salesSystems), launchId, JSON.stringify(salesProducts)).all<any>();
    sales = results.map((r) => ({
      eventId: r.event_id, type: r.type, occurredAt: r.occurred_at, orderId: r.order_id, launchId: r.launch_id, product: r.product,
      planType: r.plan_type, installmentNumber: r.installment_number, installmentsTotal: r.installments_total, installmentCents: r.installment_cents,
      amountCents: r.amount_cents, currency: r.currency, feeCents: r.fee_cents, gateway: r.gateway, gatewayTxnId: r.gateway_txn_id,
      emailHash: r.email_hash, phoneHash: r.phone_hash, ghlContactId: r.ghl_contact_id, reason: r.reason, disputeStatus: r.dispute_status, isTest: r.is_test === 1,
    }));
    if (location) {
      const { results: links } = await db.prepare(
        `SELECT email_hash, contact_id FROM ghl_contacts WHERE location_id=?1 AND email_hash IN (SELECT email_hash FROM sales_events WHERE launch_id=?2 AND email_hash IS NOT NULL)
         UNION SELECT email_hash, contact_id FROM ghl_webhook_events WHERE location_id=?1 AND email_hash IN (SELECT email_hash FROM sales_events WHERE launch_id=?2 AND email_hash IS NOT NULL)`,
      ).bind(location, launchId).all<{ email_hash: string; contact_id: string }>();
      for (const l of links) salesContacts[l.email_hash] = l.contact_id;
    }
  }

  // ── YouTube
  const youtube: Dataset["youtube"] = [];
  for (const s of launch.sources.filter((x) => x.source === "youtube" && x.ref_kind === "youtube_video")) {
    let clase = 0;
    try { clase = Number(JSON.parse(s.extra ?? "{}").clase) || 0; } catch { /* sin clase */ }
    const samples = (await db.prepare(
      `SELECT CAST(strftime('%s', sampled_at) AS INTEGER) * 1000 AS ms, concurrent_viewers, like_count, comment_count FROM youtube_samples WHERE video_id=?1 ORDER BY sampled_at`,
    ).bind(s.ref_value).raw()) as Dataset["youtube"][number]["samples"];
    youtube.push({ clase, video_id: s.ref_value, samples });
  }

  const { results: manual } = await db.prepare(
    `SELECT id, kind, ref, value, text, measured_at FROM manual_entries WHERE launch_id=?1 ORDER BY measured_at`,
  ).bind(launchId).all<any>();

  return { now, launch, connections, registrations, meta, sales, salesContacts, ghlLocation: location, youtube, manual };
}
