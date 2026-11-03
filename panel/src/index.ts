import { Hono } from "hono";
import { checkGhlSecret, parseGhlWebhook } from "./webhooks/ghl";
import { parseStripeEvent, stripeSecretName } from "./webhooks/stripe";
import { verifyStripeSignature } from "./lib/stripeSignature";
import { parseSaleEvent, salesSecretName } from "./webhooks/sales";

export interface Env {
  DB: D1Database;
  GHL_WEBHOOK_SECRET?: string;
  [key: string]: unknown; // STRIPE_WEBHOOK_SECRET_<CUENTA>, VENTAS_WEBHOOK_SECRET_<SISTEMA>
}

const nowIso = () => new Date().toISOString();

async function markConnection(db: D1Database, id: string, source: string, error?: string) {
  const now = nowIso();
  if (error) {
    await db
      .prepare(
        `INSERT INTO connections (id, source, status, last_error_at, last_error) VALUES (?1, ?2, 'error', ?3, ?4)
         ON CONFLICT(id) DO UPDATE SET status='error', last_error_at=?3, last_error=?4`,
      )
      .bind(id, source, now, error.slice(0, 500))
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO connections (id, source, status, last_data_at) VALUES (?1, ?2, 'ok', ?3)
         ON CONFLICT(id) DO UPDATE SET status='ok', last_data_at=?3`,
      )
      .bind(id, source, now)
      .run();
  }
}

const app = new Hono<{ Bindings: Env }>();

// ───── GHL: Custom Webhook desde los workflows ─────
app.post("/api/webhooks/ghl/:locationId", async (c) => {
  const locationId = c.req.param("locationId");
  if (!/^[A-Za-z0-9]{10,40}$/.test(locationId)) return c.json({ ok: false, error: "locationId inválido" }, 400);
  if (!checkGhlSecret(c.req.header("x-panel-secret") ?? null, c.env.GHL_WEBHOOK_SECRET)) {
    return c.json({ ok: false, error: "no autorizado" }, 401);
  }
  const connId = `ghl:${locationId}`;
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    await markConnection(c.env.DB, connId, "ghl", "webhook con JSON inválido");
    return c.json({ ok: false, error: "JSON inválido" }, 400);
  }
  const parsed = await parseGhlWebhook(locationId, c.req.query("evento") ?? null, body);
  if ("error" in parsed) {
    await markConnection(c.env.DB, connId, "ghl", `webhook: ${parsed.error}`);
    return c.json({ ok: false, error: parsed.error }, 400);
  }
  const res = await c.env.DB.prepare(
    `INSERT OR IGNORE INTO ghl_webhook_events
       (dedupe_key, location_id, contact_id, event, tags, email_hash, phone_hash, attribution, received_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(
      parsed.dedupeKey,
      parsed.locationId,
      parsed.contactId,
      parsed.event,
      JSON.stringify(parsed.tags),
      parsed.emailHash,
      parsed.phoneHash,
      JSON.stringify(parsed.attribution),
      nowIso(),
    )
    .run();
  await markConnection(c.env.DB, connId, "ghl");
  return c.json({ ok: true, duplicado: res.meta.changes === 0 });
});

// ───── Stripe: webhooks firmados, uno por cuenta ─────
app.post("/api/webhooks/stripe/:account", async (c) => {
  const account = c.req.param("account");
  const secretName = stripeSecretName(account);
  const secret = secretName ? c.env[secretName] : undefined;
  if (typeof secret !== "string" || !secret.startsWith("whsec_")) {
    return c.json({ ok: false, error: "cuenta no configurada" }, 404);
  }
  const connId = `stripe:${account}`;
  const raw = await c.req.text();
  const sig = await verifyStripeSignature(raw, c.req.header("stripe-signature") ?? null, secret);
  // Una firma rechazada no cambia el estado de la conexión (cualquiera puede llamar a la URL).
  if (!sig.ok) {
    return c.json({ ok: false, error: sig.reason }, 400);
  }
  const ev = await parseStripeEvent(raw);
  if ("error" in ev) {
    await markConnection(c.env.DB, connId, "stripe", ev.error);
    return c.json({ ok: false, error: ev.error }, 400);
  }
  const res = await c.env.DB.prepare(
    `INSERT OR IGNORE INTO stripe_webhook_events
       (event_id, account, type, created_at, livemode, payload, received_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
  )
    .bind(ev.eventId, account, ev.type, ev.createdAt, ev.livemode ? 1 : 0, ev.redactedPayload, nowIso())
    .run();
  await markConnection(c.env.DB, connId, "stripe");
  return c.json({ ok: true, duplicado: res.meta.changes === 0 });
});

// ───── Sistema de cobros propio: contrato v1 (docs/CONTRATO-VENTAS.md) ─────
// Firma igual que Stripe: header X-Panel-Signature: t=<unix>,v1=<hex HMAC-SHA256 de "t.cuerpo">.
app.post("/api/webhooks/ventas/:system", async (c) => {
  const system = c.req.param("system");
  const secretName = salesSecretName(system);
  const secret = secretName ? c.env[secretName] : undefined;
  if (typeof secret !== "string" || secret.length < 32) return c.json({ ok: false, error: "sistema no configurado" }, 404);
  const raw = await c.req.text();
  const sig = await verifyStripeSignature(raw, c.req.header("x-panel-signature") ?? null, secret);
  if (!sig.ok) return c.json({ ok: false, error: sig.reason }, 401);
  const connId = `ventas:${system}`;
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    await markConnection(c.env.DB, connId, "ventas", "JSON inválido");
    return c.json({ ok: false, error: "JSON inválido" }, 400);
  }
  const ev = await parseSaleEvent(body);
  if ("errors" in ev) {
    await markConnection(c.env.DB, connId, "ventas", `evento rechazado: ${ev.errors.join("; ")}`);
    return c.json({ ok: false, errores: ev.errors }, 422);
  }
  const res = await c.env.DB.prepare(
    `INSERT OR IGNORE INTO sales_events (event_id, system, type, occurred_at, order_id, launch_id, product, plan_type,
       installment_number, installments_total, installment_cents, amount_cents, currency, fee_cents, gateway,
       gateway_txn_id, email_hash, phone_hash, ghl_contact_id, reason, dispute_status, received_at, is_test)
     VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20,?21,?22,?23)`,
  )
    .bind(
      ev.eventId, system, ev.type, ev.occurredAt, ev.orderId, ev.launchId, ev.product, ev.planType,
      ev.installmentNumber, ev.installmentsTotal, ev.installmentCents, ev.amountCents, ev.currency, ev.feeCents,
      ev.gateway, ev.gatewayTxnId, ev.emailHash, ev.phoneHash, ev.ghlContactId, ev.reason, ev.disputeStatus,
      nowIso(), ev.isTest ? 1 : 0,
    )
    .run();
  await markConnection(c.env.DB, connId, "ventas");
  return c.json({ ok: true, duplicado: res.meta.changes === 0 });
});

// ───── Estado de fuentes (sin datos de negocio ni personales) ─────
app.get("/api/salud", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, source, status, last_data_at, last_error_at, last_error FROM connections ORDER BY id`,
  ).all();
  return c.json({ ok: true, ahora: nowIso(), conexiones: results });
});

app.notFound((c) => c.json({ ok: false, error: "no encontrado" }, 404));

export default {
  fetch: app.fetch,
  // Despachador único cada minuto (docs/FASE-0-PLAN.md §4.2). Por ahora solo deja constancia
  // de que el cron está vivo; los conectores se agregan aquí en las siguientes entregas.
  async scheduled(_event: ScheduledController, env: Env) {
    await markConnection(env.DB, "cron:despachador", "cron");
  },
} satisfies ExportedHandler<Env>;
