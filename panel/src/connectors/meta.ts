import { hmacSha256Hex } from "../lib/crypto";

/**
 * Conector de Meta Marketing API (solo lectura, token de usuario del sistema con ads_read).
 * Verificado en developers.facebook.com el 2 nov 2026 (docs/FASE-0-PLAN.md §1.1):
 *  - GET /v26.0/act_{id}/insights con level, time_increment=1, time_range, use_unified_attribution_setting.
 *  - Fechas en la zona horaria de la cuenta publicitaria.
 *  - Leads = action_type 'lead'; compras = 'omni_purchase' ('purchase' a secas no existe).
 *  - GET /v26.0/act_{id}/activities (una semana por defecto).
 */
export const META_API = "https://graph.facebook.com/v26.0";

export const INSIGHT_FIELDS = [
  "campaign_id", "campaign_name", "adset_id", "adset_name", "ad_id", "ad_name",
  "spend", "impressions", "clicks", "inline_link_clicks", "actions", "date_start", "date_stop",
].join(",");

export const ACTIVITY_FIELDS = [
  "event_time", "event_type", "translated_event_type", "object_id", "object_name", "object_type",
  "actor_name", "extra_data",
].join(",");

export type MetaLevel = "campaign" | "adset" | "ad";

export interface MetaCreds {
  token: string;
  appSecret: string;
}

export interface MetaDailyRow {
  level: MetaLevel;
  entityId: string;
  date: string;
  campaignId: string | null;
  campaignName: string | null;
  adsetId: string | null;
  adsetName: string | null;
  adId: string | null;
  adName: string | null;
  spendCents: number;
  impressions: number;
  clicks: number;
  linkClicks: number | null;
  leads: number | null;
  purchases: number | null;
  actionsJson: string | null;
}

export interface MetaPage<T> {
  rows: T[];
  nextAfter: string | null;
  throttlePct: number | null; // máximo de app_id_util_pct / acc_id_util_pct
}

export class MetaApiError extends Error {
  constructor(message: string, readonly status: number, readonly code?: number) {
    super(message);
  }
  /** Errores por límite de uso: reintentar más tarde (códigos 4, 17, 32, 613, 80000-80014). */
  get isRateLimit(): boolean {
    return this.status === 429 || [4, 17, 32, 613].includes(this.code ?? -1) || ((this.code ?? 0) >= 80000 && (this.code ?? 0) <= 80014);
  }
}

type Fetch = typeof fetch;

async function metaGet(fetchFn: Fetch, path: string, params: Record<string, string>, creds: MetaCreds) {
  const qs = new URLSearchParams({
    ...params,
    access_token: creds.token,
    appsecret_proof: await hmacSha256Hex(creds.appSecret, creds.token),
  });
  const res = await fetchFn(`${META_API}${path}?${qs}`, { method: "GET" });
  const body = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok || body.error) {
    const err = body.error ?? {};
    throw new MetaApiError(`Meta ${res.status}: ${err.message ?? "error"}`, res.status, err.code);
  }
  return { body, throttlePct: parseThrottle(res.headers.get("x-fb-ads-insights-throttle")) };
}

export function parseThrottle(header: string | null): number | null {
  if (!header) return null;
  try {
    const h = JSON.parse(header);
    const vals = [h.app_id_util_pct, h.acc_id_util_pct].filter((v) => typeof v === "number");
    return vals.length ? Math.max(...vals) : null;
  } catch {
    return null;
  }
}

const num = (v: unknown): number | null => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function actionValue(actions: unknown, type: string): number | null {
  if (!Array.isArray(actions)) return null;
  const a = actions.find((x) => x && x.action_type === type);
  return a ? num(a.value) : null;
}

/** Convierte un registro de insights de la API a nuestra fila diaria. `spend` viene en la moneda de la cuenta. */
export function mapInsightRow(level: MetaLevel, r: Record<string, any>): MetaDailyRow {
  const entityId = (level === "campaign" ? r.campaign_id : level === "adset" ? r.adset_id : r.ad_id) as string;
  return {
    level,
    entityId,
    date: r.date_start,
    campaignId: r.campaign_id ?? null,
    campaignName: r.campaign_name ?? null,
    adsetId: r.adset_id ?? null,
    adsetName: r.adset_name ?? null,
    adId: r.ad_id ?? null,
    adName: r.ad_name ?? null,
    spendCents: Math.round((num(r.spend) ?? 0) * 100),
    impressions: num(r.impressions) ?? 0,
    clicks: num(r.clicks) ?? 0,
    linkClicks: num(r.inline_link_clicks),
    leads: actionValue(r.actions, "lead"),
    purchases: actionValue(r.actions, "omni_purchase"),
    actionsJson: Array.isArray(r.actions) ? JSON.stringify(r.actions) : null,
  };
}

/** Zona horaria de la cuenta publicitaria (campo `timezone_name` de AdAccount). */
export async function fetchAccountTimezone(fetchFn: Fetch, creds: MetaCreds, accountId: string): Promise<string> {
  const { body } = await metaGet(fetchFn, `/${accountId}`, { fields: "timezone_name,currency" }, creds);
  if (body.currency && body.currency !== "USD") throw new MetaApiError(`La cuenta ${accountId} no está en USD (${body.currency})`, 200);
  return String(body.timezone_name);
}

/**
 * Una página de insights diarios a nivel de anuncio (campaña y conjunto se agregan desde aquí).
 * El filtro por campañas del lanzamiento se aplica en el panel, no en la consulta. `since`/`until` en YYYY-MM-DD (zona de la cuenta). */
export async function fetchInsightsPage(
  fetchFn: Fetch,
  creds: MetaCreds,
  accountId: string,
  level: MetaLevel,
  since: string,
  until: string,
  after: string | null,
): Promise<MetaPage<MetaDailyRow>> {
  const params: Record<string, string> = {
    level,
    fields: INSIGHT_FIELDS,
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    use_unified_attribution_setting: "true",
    limit: "200",
  };
  if (after) params.after = after;
  const { body, throttlePct } = await metaGet(fetchFn, `/${accountId}/insights`, params, creds);
  const rows = (Array.isArray(body.data) ? body.data : []).map((r: Record<string, any>) => mapInsightRow(level, r));
  const nextAfter = body.paging?.next ? (body.paging?.cursors?.after ?? null) : null;
  return { rows, nextAfter, throttlePct };
}

export interface MetaActivity {
  eventTime: string;
  eventType: string;
  translated: string | null;
  objectId: string | null;
  objectName: string | null;
  objectType: string | null;
  actorName: string | null;
  extraData: string | null;
}

export async function fetchActivitiesPage(
  fetchFn: Fetch,
  creds: MetaCreds,
  accountId: string,
  after: string | null,
): Promise<MetaPage<MetaActivity>> {
  const params: Record<string, string> = { fields: ACTIVITY_FIELDS, limit: "100" };
  if (after) params.after = after;
  const { body, throttlePct } = await metaGet(fetchFn, `/${accountId}/activities`, params, creds);
  const rows: MetaActivity[] = (Array.isArray(body.data) ? body.data : []).map((a: Record<string, any>) => ({
    eventTime: new Date(a.event_time).toISOString(),
    eventType: String(a.event_type),
    translated: a.translated_event_type ?? null,
    objectId: a.object_id ?? null,
    objectName: a.object_name ?? null,
    objectType: a.object_type ?? null,
    actorName: a.actor_name ?? null,
    extraData: typeof a.extra_data === "string" ? a.extra_data : a.extra_data ? JSON.stringify(a.extra_data) : null,
  }));
  const nextAfter = body.paging?.next ? (body.paging?.cursors?.after ?? null) : null;
  return { rows, nextAfter, throttlePct };
}

/** Último cambio de campaña (para "resultados desde el último cambio"). */
export function lastChangeAt(activities: MetaActivity[], objectIds?: Set<string>): string | null {
  const relevant = activities.filter((a) => !objectIds || (a.objectId && objectIds.has(a.objectId)));
  return relevant.reduce<string | null>((max, a) => (max === null || a.eventTime > max ? a.eventTime : max), null);
}
