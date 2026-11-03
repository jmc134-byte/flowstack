import { hashEmail } from "../lib/crypto";

/**
 * Conector de GHL / LeadConnector API v2 (solo lectura, token de integración privada por subcuenta).
 * Verificado el 2 nov 2026 (docs/FASE-0-PLAN.md §1.2):
 *  - Base https://services.leadconnectorhq.com, header Version: 2021-07-28 para contactos.
 *  - POST /contacts/search (GET /contacts/ está obsoleto), pageLimit ≤ 100, paginación con searchAfter.
 *  - La sintaxis exacta del filtro por etiqueta está [sin verificar]: se confirma contra la subcuenta real
 *    en la primera conciliación; por eso el filtro es configurable.
 *  - 100 solicitudes / 10 s y 200,000 / día por subcuenta.
 */
export const GHL_API = "https://services.leadconnectorhq.com";
export const GHL_VERSION_CONTACTS = "2021-07-28";

export interface GhlContactRow {
  contactId: string;
  dateAdded: string | null;
  tags: string[];
  emailHash: string | null;
  source: string | null;
  attribution: Record<string, string>;
}

export interface GhlPage {
  rows: GhlContactRow[];
  searchAfter: unknown[] | null;
  remainingBurst: number | null;
}

export class GhlApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
  get isRateLimit() {
    return this.status === 429;
  }
}

type Fetch = typeof fetch;

export type GhlFilter = { field: string; operator: string; value: unknown };

/** Filtro por etiqueta propuesto (a confirmar contra la API real). */
export const tagFilter = (tag: string): GhlFilter => ({ field: "tags", operator: "contains", value: tag });

const ATTR_KEYS = ["utmSource", "utmMedium", "utmContent", "campaign", "campaignId", "medium", "url", "referrer"];

function pickAttribution(attrs: unknown): Record<string, string> {
  const first = Array.isArray(attrs) ? attrs.find((a) => a && a.isFirst) ?? attrs[0] : null;
  const out: Record<string, string> = {};
  if (first && typeof first === "object") {
    for (const k of ATTR_KEYS) {
      const v = (first as Record<string, unknown>)[k];
      if (typeof v === "string" && v) {
        // De la URL solo guardamos dominio + ruta (sin query, que puede traer datos personales).
        out[k] = k === "url" || k === "referrer" ? stripQuery(v) : v.slice(0, 300);
      }
    }
    if (typeof (first as Record<string, unknown>).fbclid === "string") out.fbclid = "1";
  }
  return out;
}

function stripQuery(u: string): string {
  try {
    const url = new URL(u);
    return `${url.host}${url.pathname}`;
  } catch {
    return u.split("?")[0]!.slice(0, 300);
  }
}

export async function mapContact(c: Record<string, any>): Promise<GhlContactRow> {
  return {
    contactId: String(c.id),
    dateAdded: c.dateAdded ? new Date(c.dateAdded).toISOString() : null,
    tags: Array.isArray(c.tags) ? [...new Set<string>(c.tags.map((t: string) => String(t).trim().toLowerCase()))].sort() : [],
    emailHash: await hashEmail(c.email),
    source: typeof c.source === "string" ? c.source : null,
    attribution: pickAttribution(c.attributions),
  };
}

export async function searchContactsPage(
  fetchFn: Fetch,
  token: string,
  locationId: string,
  filters: GhlFilter[],
  searchAfter: unknown[] | null,
): Promise<GhlPage> {
  const body: Record<string, unknown> = {
    locationId,
    pageLimit: 100,
    filters,
    sort: [{ field: "dateAdded", direction: "asc" }],
  };
  if (searchAfter) body.searchAfter = searchAfter;
  const res = await fetchFn(`${GHL_API}/contacts/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Version: GHL_VERSION_CONTACTS,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, any>;
  if (!res.ok) throw new GhlApiError(`GHL ${res.status}: ${json.message ?? "error"}`, res.status);
  const contacts: Record<string, any>[] = Array.isArray(json.contacts) ? json.contacts : [];
  const rows = await Promise.all(contacts.map(mapContact));
  const last = contacts[contacts.length - 1];
  // [sin verificar] se asume que cada contacto trae su propio `searchAfter` para paginar.
  const next = contacts.length === 100 && Array.isArray(last?.searchAfter) ? last.searchAfter : null;
  const rem = Number(res.headers.get("x-ratelimit-remaining"));
  return { rows, searchAfter: next, remainingBurst: Number.isFinite(rem) ? rem : null };
}

/** Enlace al contacto en GHL (formato a confirmar con el usuario; puede cambiar con marca blanca). */
export function ghlContactUrl(locationId: string, contactId: string, appHost = "app.gohighlevel.com"): string {
  return `https://${appHost}/v2/location/${encodeURIComponent(locationId)}/contacts/detail/${encodeURIComponent(contactId)}`;
}
