import { describe, expect, it } from "vitest";
import {
  committedRevenue, conversion, cpa, cplPaid, cplTotal, netRevenue, netSales, roas, showUp,
} from "../src/metrics/definitions";
import { countsAtSameCutoff } from "../src/metrics/cutoff";

const sales = { purchases: 50, refunds: 3, disputes: 1 };
const rev = {
  grossCollectedCents: 50 * 78500,
  pendingInstallmentsCents: 600000,
  refundedCents: 3 * 78500,
  disputedCents: 78500,
  feesCents: 120000,
};

describe("definiciones de SPEC.md", () => {
  it("CPL pagado y total", () => {
    expect(cplPaid(1_650_000, 1100)).toBe(1500); // $16,500 / 1,100 = $15.00
    expect(cplTotal(1_650_000, 1500)).toBe(1100);
  });
  it("show up = pico / registrados al inicio", () => {
    expect(showUp(420, 1400)).toBeCloseTo(0.3);
  });
  it("ventas netas y conversión", () => {
    expect(netSales(sales)).toBe(46);
    expect(conversion(sales, 1400)).toBeCloseTo(46 / 1400);
  });
  it("ingreso comprometido incluye cuotas por cobrar; neto descuenta comisiones y reembolsos", () => {
    expect(committedRevenue(rev)).toBe(3_925_000 - 235_500 - 78_500 + 600_000);
    expect(netRevenue(rev)).toBe(3_925_000 - 120_000 - 235_500 - 78_500);
  });
  it("CPA y ROAS", () => {
    expect(cpa(1_650_000, sales)).toBeCloseTo(1_650_000 / 46);
    expect(roas(rev, 1_650_000)).toBeCloseTo(committedRevenue(rev) / 1_650_000);
  });
  it("nunca devuelve cero silencioso: denominador 0 o dato faltante → null", () => {
    expect(cplPaid(1000, 0)).toBeNull();
    expect(cplTotal(null, 10)).toBeNull();
    expect(showUp(null, 100)).toBeNull();
    expect(cpa(1000, { purchases: 0, refunds: 0, disputes: 0 })).toBeNull();
    expect(roas(rev, 0)).toBeNull();
  });
});

describe("comparación al mismo corte horario", () => {
  const tz = "America/Chicago";
  it("cuenta solo hasta la misma hora local en días anteriores y marca hoy como parcial", () => {
    // Ahora: mié 4 nov 2026 14:00 CST (20:00 UTC)
    const now = new Date("2026-11-04T20:00:00Z");
    const events = [
      new Date("2026-11-03T15:00:00Z"), // mar 09:00 → cuenta
      new Date("2026-11-04T01:00:00Z"), // mar 19:00 CST → después del corte, no cuenta
      new Date("2026-11-04T16:00:00Z"), // mié 10:00 → cuenta
      new Date("2026-11-04T19:59:00Z"), // mié 13:59 → cuenta
    ];
    const rows = countsAtSameCutoff(events, now, tz, ["2026-11-03", "2026-11-04"]);
    expect(rows).toEqual([
      { day: "2026-11-03", countAtCutoff: 1, partial: false },
      { day: "2026-11-04", countAtCutoff: 2, partial: true },
    ]);
  });
});
