import { describe, expect, it } from "vitest";
import { parseSaleEvent, type SaleEvent } from "../src/webhooks/sales";
import { summarizeSales } from "../src/metrics/sales";
import { committedRevenue, netRevenue, netSales } from "../src/metrics/definitions";
import { sha256Hex } from "../src/lib/crypto";

const base = {
  moneda: "USD", gateway: "stripe", lanzamiento: "tm2", producto: "TAX MASTER",
  cliente: { email: "Ana@Example.com", telefono: "+1 305 555 0101" },
};
let seq = 0;
async function ev(extra: Record<string, unknown>): Promise<SaleEvent> {
  const r = await parseSaleEvent({ ...base, id: `e${++seq}`, ocurrido_en: new Date(Date.UTC(2026, 10, 18, 1, seq)).toISOString(), ...extra });
  if ("errors" in r) throw new Error(r.errors.join("; "));
  return r;
}
const unico = (orden: string, extra: Record<string, unknown> = {}) =>
  ev({ tipo: "orden.pagada", orden_id: orden, monto_centavos: 78500, comision_centavos: 2307, plan: { tipo: "unico" }, ...extra });
const cuota = (tipo: string, orden: string, n: number, extra: Record<string, unknown> = {}) =>
  ev({ tipo, orden_id: orden, monto_centavos: 29500, comision_centavos: 886, gateway: "authorize_net",
       plan: { tipo: "cuotas", cuota_numero: n, cuotas_total: 3, monto_cuota_centavos: 29500 }, ...extra });

describe("contrato de ventas v1", () => {
  it("normaliza y guarda solo hashes del cliente", async () => {
    const e = await unico("o1");
    expect(e.emailHash).toBe(await sha256Hex("ana@example.com"));
    expect(JSON.stringify(e)).not.toMatch(/Ana|305/);
    expect(e.occurredAt).toMatch(/Z$/);
  });
  it("rechaza eventos incompletos con errores legibles", async () => {
    const r = await parseSaleEvent({ id: "x", tipo: "cuota.cobrada", ocurrido_en: "2026-11-18 10:00", orden_id: "o", monto_centavos: 1.5, gateway: "venmo" });
    expect("errors" in r && r.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe("resumen de ventas", () => {
  it("compras, mix, cuotas, reembolsos, contracargos e ingresos", async () => {
    const events = [
      await unico("o1"),
      await unico("o2"),
      await ev({ tipo: "reembolso", orden_id: "o2", monto_centavos: 78500 }),        // garantía 7 días
      await unico("o3"),
      await ev({ tipo: "contracargo", orden_id: "o3", monto_centavos: 78500, estado_contracargo: "abierto" }),
      await cuota("orden.pagada", "c1", 1),
      await cuota("cuota.cobrada", "c1", 2),
      await cuota("orden.pagada", "c2", 1),
      await cuota("cuota.fallida", "c2", 2),
      await cuota("orden.pagada", "c2", 1),                                         // duplicado lógico: no suma
      await ev({ tipo: "checkout.abandonado", orden_id: "a1", monto_centavos: 78500 }),
      await unico("t1", { prueba: true }),                                          // evento de prueba: se ignora
    ];
    const s = summarizeSales(events);
    expect(s.counts).toEqual({ purchases: 5, refunds: 1, disputes: 1 });
    expect(netSales(s.counts)).toBe(3);
    expect(s.mix).toEqual({ unico: 3, cuotas: 2 });
    expect(s.installments).toEqual({ collected: 3, pending: 3, failed: 1 });
    expect(s.failedOrders).toEqual(["c2"]);
    expect(s.abandonedCheckouts).toBe(1);
    const gross = 3 * 78500 + 3 * 29500;
    expect(s.revenue).toEqual({
      grossCollectedCents: gross,
      pendingInstallmentsCents: 3 * 29500,
      refundedCents: 78500,
      disputedCents: 78500,
      feesCents: 3 * 2307 + 3 * 886,
    });
    expect(s.feesComplete).toBe(true);
    expect(committedRevenue(s.revenue)).toBe(gross - 78500 - 78500 + 3 * 29500);
    expect(netRevenue(s.revenue)).toBe(gross - (3 * 2307 + 3 * 886) - 78500 - 78500);
  });
  it("contracargo ganado no resta; comisión desconocida marca el neto como incompleto", async () => {
    const s = summarizeSales([
      await unico("o9", { comision_centavos: null }),
      await ev({ tipo: "contracargo", orden_id: "o9", monto_centavos: 78500 }),
      await ev({ tipo: "contracargo.resuelto", orden_id: "o9", monto_centavos: 0, estado_contracargo: "ganado" }),
    ]);
    expect(s.counts).toEqual({ purchases: 1, refunds: 0, disputes: 0 });
    expect(s.revenue.disputedCents).toBe(0);
    expect(s.feesComplete).toBe(false);
  });
});
