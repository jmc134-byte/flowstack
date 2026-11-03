import { hashEmail, hashPhone, sha256Hex, timingSafeEqual } from "../lib/crypto";

export const GHL_EVENTS = ["registro", "compra", "interesadonopago"] as const;
export type GhlEvent = (typeof GHL_EVENTS)[number] | "otro";

export interface GhlParsedEvent {
  dedupeKey: string;
  locationId: string;
  contactId: string;
  event: GhlEvent;
  tags: string[];
  emailHash: string | null;
  phoneHash: string | null;
  attribution: Record<string, string>;
}

type Json = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function pick(obj: Json, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = str(obj[k]);
    if (v) return v;
  }
  return null;
}

function parseTags(v: unknown): string[] {
  const raw = Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [];
  const tags = raw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(tags)].sort();
}

/** Campos de atribución que nos interesan (UTM y variante de landing). Sin datos personales. */
function extractAttribution(...sources: Json[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const src of sources) {
    for (const [k, v] of Object.entries(src)) {
      const key = k.toLowerCase();
      const val = str(v);
      if (!val) continue;
      if (/^utm_?(source|medium|campaign|content|term)$/.test(key) || /landing|variante|variant/.test(key) || key === "fbclid") {
        out[key.replace(/^utm(?!_)/, "utm_")] = val.slice(0, 300);
      }
    }
  }
  return out;
}

/**
 * Interpreta el cuerpo del Custom Webhook de un workflow de GHL.
 * El tipo de evento viene en la URL (?evento=registro|compra|interesadonopago),
 * porque cada workflow tiene su propia acción de webhook.
 */
export async function parseGhlWebhook(
  locationId: string,
  eventParam: string | null,
  body: unknown,
): Promise<GhlParsedEvent | { error: string }> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "cuerpo JSON inválido" };
  const b = body as Json;
  const custom = (b.customData && typeof b.customData === "object" ? b.customData : {}) as Json;

  const contactId = pick(b, "contact_id", "contactId", "id") ?? pick(custom, "contact_id", "contactId");
  if (!contactId) return { error: "falta contact_id" };

  const ev = (eventParam ?? pick(custom, "evento") ?? "").toLowerCase();
  const event: GhlEvent = (GHL_EVENTS as readonly string[]).includes(ev) ? (ev as GhlEvent) : "otro";

  const tags = parseTags(b.tags ?? custom.tags);
  const email = pick(b, "email") ?? pick(custom, "email");
  const phone = pick(b, "phone") ?? pick(custom, "phone");

  // Mismo contacto + mismo evento + mismas etiquetas = mismo evento (reintentos de GHL).
  const dedupeKey = await sha256Hex([locationId, contactId, event, tags.join("|")].join("::"));

  return {
    dedupeKey,
    locationId,
    contactId,
    event,
    tags,
    emailHash: await hashEmail(email),
    phoneHash: await hashPhone(phone),
    attribution: extractAttribution(b, custom),
  };
}

export function checkGhlSecret(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 32 || !header) return false;
  return timingSafeEqual(header, secret);
}
