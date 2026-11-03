import { describe, expect, it } from "vitest";
import { checkGhlSecret, parseGhlWebhook } from "../src/webhooks/ghl";
import { parseStripeEvent, stripeSecretName } from "../src/webhooks/stripe";
import { verifyStripeSignature } from "../src/lib/stripeSignature";
import { hmacSha256Hex, sha256Hex } from "../src/lib/crypto";

describe("webhook GHL", () => {
  it("extrae contacto, etiquetas y atribución, y guarda solo hashes", async () => {
    const r = await parseGhlWebhook("kZT0P8HbGrGXuUGi7QJy", "registro", {
      contact_id: "abc123",
      email: "  Ana@Example.com ",
      phone: "+1 (305) 555-0101",
      first_name: "Ana",
      tags: "RegistroTM2, lead",
      utm_source: "facebook",
      utm_content: "120200000001",
      customData: { variante_landing: "masterclass" },
    });
    if ("error" in r) throw new Error(r.error);
    expect(r.contactId).toBe("abc123");
    expect(r.event).toBe("registro");
    expect(r.tags).toEqual(["lead", "registrotm2"]);
    expect(r.emailHash).toBe(await sha256Hex("ana@example.com"));
    expect(r.phoneHash).toBe(await sha256Hex("13055550101"));
    expect(r.attribution).toEqual({ utm_source: "facebook", utm_content: "120200000001", variante_landing: "masterclass" });
    expect(JSON.stringify(r)).not.toContain("Ana");
  });
  it("misma entrega repetida → misma clave de deduplicación", async () => {
    const a = await parseGhlWebhook("loc1234567", "registro", { contact_id: "x", tags: ["b", "a"] });
    const b = await parseGhlWebhook("loc1234567", "registro", { contact_id: "x", tags: ["a", "b"] });
    if ("error" in a || "error" in b) throw new Error();
    expect(a.dedupeKey).toBe(b.dedupeKey);
  });
  it("rechaza cuerpo sin contacto", async () => {
    expect(await parseGhlWebhook("loc1234567", "registro", { email: "a@b.co" })).toEqual({ error: "falta contact_id" });
  });
  it("secreto: exige 32+ caracteres y coincidencia exacta", () => {
    const s = "x".repeat(40);
    expect(checkGhlSecret(s, s)).toBe(true);
    expect(checkGhlSecret("y".repeat(40), s)).toBe(false);
    expect(checkGhlSecret(null, s)).toBe(false);
    expect(checkGhlSecret("corto", "corto")).toBe(false);
  });
});

describe("webhook Stripe", () => {
  const secret = "whsec_test_secret";
  const body = JSON.stringify({
    id: "evt_1", type: "charge.succeeded", created: 1763424000, livemode: true,
    data: { object: { id: "ch_1", amount: 78500, billing_details: { email: "Ana@Example.com", name: "Ana Pérez", phone: "3055550101", address: { line1: "x" } } } },
  });
  it("acepta firma válida y rechaza alterada o vieja", async () => {
    const t = 1763424000;
    const sig = await hmacSha256Hex(secret, `${t}.${body}`);
    expect(await verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, t + 10)).toEqual({ ok: true });
    expect((await verifyStripeSignature(body + " ", `t=${t},v1=${sig}`, secret, t)).ok).toBe(false);
    expect((await verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, t + 301)).ok).toBe(false);
    expect((await verifyStripeSignature(body, null, secret, t)).ok).toBe(false);
  });
  it("quita datos personales y deja hash del email", async () => {
    const ev = await parseStripeEvent(body);
    if ("error" in ev) throw new Error(ev.error);
    expect(ev.redactedPayload).not.toMatch(/Ana|line1|3055550101/i);
    expect(ev.redactedPayload).toContain(await sha256Hex("ana@example.com"));
    expect(ev.redactedPayload).toContain('"amount":78500');
  });
  it("nombre de secreto por cuenta", () => {
    expect(stripeSecretName("northbound")).toBe("STRIPE_WEBHOOK_SECRET_NORTHBOUND");
    expect(stripeSecretName("../x")).toBeNull();
  });
});
