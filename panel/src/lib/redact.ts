import { hashEmail, hashPhone } from "./crypto";

/** Claves con datos personales que no necesitamos guardar. */
const DROP_KEYS = new Set([
  "name",
  "first_name",
  "last_name",
  "full_name",
  "address",
  "shipping",
  "shipping_details",
  "line1",
  "line2",
  "postal_code",
  "city",
  "state",
  "ip",
  "ip_address",
  "tax_ids",
  "individual_name",
]);
const EMAIL_KEYS = new Set(["email", "receipt_email", "customer_email"]);
const PHONE_KEYS = new Set(["phone"]);

/**
 * Copia profunda sin datos personales: emails y teléfonos se reemplazan por su
 * hash normalizado (`email_hash`, `phone_hash`); nombres y direcciones se eliminan.
 */
export async function redactPII(value: unknown): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map(redactPII));
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const key = k.toLowerCase();
    if (DROP_KEYS.has(key)) continue;
    if (EMAIL_KEYS.has(key)) {
      out[`${k}_hash`] = typeof v === "string" ? await hashEmail(v) : null;
      continue;
    }
    if (PHONE_KEYS.has(key)) {
      out[`${k}_hash`] = typeof v === "string" ? await hashPhone(v) : null;
      continue;
    }
    out[k] = await redactPII(v);
  }
  return out;
}
