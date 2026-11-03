import { hmacSha256Hex, timingSafeEqual } from "./crypto";

/**
 * Verifica el header `Stripe-Signature` (docs.stripe.com/webhooks).
 * Formato: `t=<unix>,v1=<hex>[,v1=<hex>...]`. Mensaje firmado: `${t}.${rawBody}`,
 * HMAC-SHA256 con el secreto `whsec_...`. Tolerancia por defecto: 300 s.
 */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
  toleranceSeconds = 300,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!header) return { ok: false, reason: "falta Stripe-Signature" };
  let t: number | null = null;
  const v1: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (!k || v === undefined) continue;
    if (k.trim() === "t") t = Number(v);
    if (k.trim() === "v1") v1.push(v.trim());
  }
  if (t === null || !Number.isFinite(t)) return { ok: false, reason: "sin timestamp" };
  if (v1.length === 0) return { ok: false, reason: "sin firma v1" };
  if (Math.abs(nowSeconds - t) > toleranceSeconds) return { ok: false, reason: "fuera de tolerancia" };
  const expected = await hmacSha256Hex(secret, `${t}.${rawBody}`);
  return v1.some((sig) => timingSafeEqual(sig, expected))
    ? { ok: true }
    : { ok: false, reason: "firma inválida" };
}
