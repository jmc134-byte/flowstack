// Envía un evento de prueba firmado al panel, para que el desarrollador del sistema de cobros
// verifique su integración. Uso:
//   PANEL_URL=https://... VENTAS_SECRET=... node scripts/enviar-venta-prueba.mjs [sistema]
import { createHmac, randomUUID } from "node:crypto";

const url = process.env.PANEL_URL ?? "http://localhost:8787";
const secret = process.env.VENTAS_SECRET;
const system = process.argv[2] ?? "principal";
if (!secret) throw new Error("Falta VENTAS_SECRET");

const evento = {
  id: `prueba-${randomUUID()}`,
  tipo: "orden.pagada",
  ocurrido_en: new Date().toISOString(),
  orden_id: "ORD-PRUEBA-1",
  lanzamiento: "tm2",
  producto: "TAX MASTER",
  plan: { tipo: "unico" },
  monto_centavos: 78500,
  moneda: "USD",
  comision_centavos: 2307,
  gateway: "stripe",
  gateway_transaccion_id: "pi_prueba",
  cliente: { email: "prueba@example.com" },
  prueba: true,
};
const body = JSON.stringify(evento);
const t = Math.floor(Date.now() / 1000);
const v1 = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
const res = await fetch(`${url}/api/webhooks/ventas/${system}`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-panel-signature": `t=${t},v1=${v1}` },
  body,
});
console.log(res.status, await res.text());
