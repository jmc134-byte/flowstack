import type { SaleEvent } from "../webhooks/sales";
import type { RevenueInputs, SalesCounts } from "./definitions";

/**
 * Resume los eventos de ventas por orden. Reglas (documentadas en docs/CONTRATO-VENTAS.md):
 * - Compra = orden con `orden.pagada` (en cuotas, ese evento es el cobro de la cuota 1).
 * - Una orden cuenta como reembolsada si lo reembolsado ≥ lo cobrado; los reembolsos parciales
 *   restan dinero pero no restan la venta.
 * - Contracargo cuenta si su último estado no es "ganado". Una orden se resta una sola vez.
 * - Cuotas pendientes = (cuotas_total − cuotas cobradas) × monto de cuota, para órdenes vigentes.
 * - Si algún pago no trae comisión, `feesComplete = false` (el neto se marca como estimado).
 */
export interface SalesSummary {
  counts: SalesCounts;
  revenue: RevenueInputs;
  feesComplete: boolean;
  mix: { unico: number; cuotas: number };
  installments: { collected: number; pending: number; failed: number };
  failedOrders: string[]; // órdenes con la última cuota fallida (para la lista de Ventas)
  abandonedCheckouts: number;
}

interface OrderState {
  paid: boolean;
  planType: "unico" | "cuotas" | null;
  total: number | null;
  installmentCents: number | null;
  collectedNumbers: Set<number>;
  collectedCents: number;
  refundedCents: number;
  disputeCents: number;
  disputeStatus: "abierto" | "ganado" | "perdido" | null;
  lastInstallmentFailed: boolean;
}

export function summarizeSales(events: SaleEvent[]): SalesSummary {
  const sorted = events.filter((e) => !e.isTest).sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const orders = new Map<string, OrderState>();
  let feesComplete = true;
  let feesCents = 0;
  let abandoned = 0;

  const get = (id: string): OrderState => {
    let o = orders.get(id);
    if (!o) {
      o = {
        paid: false, planType: null, total: null, installmentCents: null, collectedNumbers: new Set(),
        collectedCents: 0, refundedCents: 0, disputeCents: 0, disputeStatus: null, lastInstallmentFailed: false,
      };
      orders.set(id, o);
    }
    return o;
  };

  for (const e of sorted) {
    if (e.type === "checkout.abandonado") {
      abandoned++;
      continue;
    }
    const o = get(e.orderId);
    if (e.planType) o.planType = e.planType;
    if (e.installmentsTotal) o.total = e.installmentsTotal;
    if (e.installmentCents) o.installmentCents = e.installmentCents;
    switch (e.type) {
      case "orden.pagada":
      case "cuota.cobrada": {
        if (e.type === "orden.pagada") o.paid = true;
        const n = e.installmentNumber ?? 1;
        if (o.collectedNumbers.has(n) && o.planType === "cuotas") break; // cuota ya contada
        o.collectedNumbers.add(n);
        o.collectedCents += e.amountCents;
        o.lastInstallmentFailed = false;
        if (e.feeCents === null) feesComplete = false;
        else feesCents += e.feeCents;
        break;
      }
      case "cuota.fallida":
        if (!o.collectedNumbers.has(e.installmentNumber ?? -1)) o.lastInstallmentFailed = true;
        break;
      case "reembolso":
        o.refundedCents += e.amountCents;
        break;
      case "contracargo":
        o.disputeCents = Math.max(o.disputeCents, e.amountCents);
        o.disputeStatus = e.disputeStatus ?? "abierto";
        break;
      case "contracargo.resuelto":
        o.disputeStatus = e.disputeStatus ?? o.disputeStatus;
        break;
    }
  }

  let purchases = 0, refunds = 0, disputes = 0, unico = 0, cuotas = 0;
  let gross = 0, refunded = 0, disputed = 0, pendingCents = 0;
  let instCollected = 0, instPending = 0, instFailed = 0;
  const failedOrders: string[] = [];

  for (const [id, o] of orders) {
    gross += o.collectedCents;
    refunded += o.refundedCents;
    const activeDispute = o.disputeStatus !== null && o.disputeStatus !== "ganado";
    if (activeDispute) disputed += o.disputeCents;
    if (!o.paid) continue;
    purchases++;
    if (o.planType === "cuotas") cuotas++;
    else unico++;
    const fullyRefunded = o.collectedCents > 0 && o.refundedCents >= o.collectedCents;
    if (activeDispute) disputes++;
    else if (fullyRefunded) refunds++;
    if (o.planType === "cuotas" && o.total) {
      instCollected += o.collectedNumbers.size;
      if (!fullyRefunded && !activeDispute) {
        const remaining = Math.max(0, o.total - o.collectedNumbers.size);
        instPending += remaining;
        pendingCents += remaining * (o.installmentCents ?? 0);
        if (o.lastInstallmentFailed) {
          instFailed++;
          failedOrders.push(id);
        }
      }
    }
  }

  return {
    counts: { purchases, refunds, disputes },
    revenue: {
      grossCollectedCents: gross,
      pendingInstallmentsCents: pendingCents,
      refundedCents: refunded,
      disputedCents: disputed,
      feesCents: feesCents,
    },
    feesComplete,
    mix: { unico, cuotas },
    installments: { collected: instCollected, pending: instPending, failed: instFailed },
    failedOrders,
    abandonedCheckouts: abandoned,
  };
}
