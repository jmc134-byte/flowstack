import { Hono } from "hono";
import { checkGhlSecret, parseGhlWebhook } from "./webhooks/ghl";
import { parseStripeEvent, stripeSecretName } from "./webhooks/stripe";
import { verifyStripeSignature } from "./lib/stripeSignature";
import { parseSaleEvent, salesSecretName } from "./webhooks/sales";
import { runDueJobs } from "./sync/runner";

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

// ───── Página de estado (temporal, hasta que lleguen las pantallas) ─────
const STATUS_PAGE = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Panel de lanzamientos</title>
<style>:root{color-scheme:dark}body{margin:0;padding:24px 16px;font:17px/1.5 -apple-system,system-ui,sans-serif;background:#0f1115;color:#e8eaed}
h1{font-size:22px;margin:0 0 4px}p{color:#9aa0a6;margin:0 0 20px}.c{background:#1a1d23;border-radius:14px;padding:14px 16px;margin:0 0 10px}
.n{font-weight:600}.ok{color:#5bd68a}.error{color:#ff6b6b}.sin_credenciales,.unknown{color:#f5c451}small{color:#9aa0a6;display:block}</style></head>
<body><h1>Panel de lanzamientos</h1><p>Estado de las fuentes. Las pantallas llegan en las próximas entregas.</p><div id="l">Cargando…</div>
<script>
const fmt=t=>t?new Date(t).toLocaleString("es",{timeZone:"America/New_York",weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})+" (Miami)":"nunca";
const label={ok:"Funcionando",error:"Con errores",sin_credenciales:"Sin credenciales",unknown:"Sin datos"};
fetch("/api/salud").then(r=>r.json()).then(d=>{const el=document.getElementById("l");
if(!d.conexiones.length){el.textContent="Aún no hay fuentes conectadas.";return}
el.innerHTML="";for(const c of d.conexiones){const div=document.createElement("div");div.className="c";
const n=document.createElement("div");n.className="n";n.textContent=c.id;
const s=document.createElement("div");s.className=c.status;s.textContent=label[c.status]||c.status;
const m=document.createElement("small");m.textContent="Último dato: "+fmt(c.last_data_at)+(c.last_error?" · Error: "+c.last_error:"");
div.append(n,s,m);el.append(div)}}).catch(()=>{document.getElementById("l").textContent="No se pudo leer el estado."});
</script></body></html>`;
app.get("/", (c) => c.html(STATUS_PAGE));

app.notFound((c) => c.json({ ok: false, error: "no encontrado" }, 404));

export default {
  fetch: app.fetch,
  // Despachador único cada minuto (docs/FASE-0-PLAN.md §4.2).
  async scheduled(_event: ScheduledController, env: Env) {
    await markConnection(env.DB, "cron:despachador", "cron");
    await runDueJobs(env);
  },
} satisfies ExportedHandler<Env>;
