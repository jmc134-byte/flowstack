/**
 * Definiciones de docs/SPEC.md §Definiciones. No cambiarlas sin aviso.
 * Todas devuelven `null` cuando el denominador es 0 o falta un dato:
 * el panel muestra "sin datos", nunca un cero silencioso.
 * Montos en centavos.
 */

const ratio = (num: number | null, den: number | null): number | null =>
  num === null || den === null || den === 0 ? null : num / den;

/** CPL pagado = gasto de Meta / registrados atribuidos a Meta. */
export const cplPaid = (metaSpendCents: number | null, metaAttributedRegistrations: number | null) =>
  ratio(metaSpendCents, metaAttributedRegistrations);

/** CPL total = gasto / registrados totales. */
export const cplTotal = (totalSpendCents: number | null, totalRegistrations: number | null) =>
  ratio(totalSpendCents, totalRegistrations);

/** Show up = pico de conectados / registrados al inicio de la clase. */
export const showUp = (peakConcurrentViewers: number | null, registrationsAtClassStart: number | null) =>
  ratio(peakConcurrentViewers, registrationsAtClassStart);

export interface SalesCounts {
  purchases: number;
  refunds: number;
  disputes: number;
}

/** Ventas netas = compras − reembolsos − contracargos. */
export const netSales = ({ purchases, refunds, disputes }: SalesCounts) => purchases - refunds - disputes;

/** Conversión = ventas netas / registrados. */
export const conversion = (sales: SalesCounts, registrations: number | null) =>
  ratio(netSales(sales), registrations);

export interface RevenueInputs {
  grossCollectedCents: number; // cobrado bruto (pagos únicos + cuotas cobradas)
  pendingInstallmentsCents: number; // cuotas por cobrar de planes activos
  refundedCents: number;
  disputedCents: number; // contracargos perdidos o en curso
  feesCents: number; // comisiones de la pasarela (Stripe, Authorize.net, PayPal)
}

/** Ingreso comprometido = cobrado − reembolsos − contracargos + cuotas por cobrar. */
export const committedRevenue = (r: RevenueInputs) =>
  r.grossCollectedCents - r.refundedCents - r.disputedCents + r.pendingInstallmentsCents;

/** Ingreso neto = cobrado − comisiones de las pasarelas − reembolsos (y contracargos). */
export const netRevenue = (r: RevenueInputs) =>
  r.grossCollectedCents - r.feesCents - r.refundedCents - r.disputedCents;

/** CPA = gasto total / ventas netas. */
export const cpa = (totalSpendCents: number | null, sales: SalesCounts) =>
  ratio(totalSpendCents, netSales(sales));

/** ROAS = ingreso comprometido / gasto. */
export const roas = (r: RevenueInputs, totalSpendCents: number | null) =>
  ratio(committedRevenue(r), totalSpendCents);

/** Valor con procedencia: cada número dice de qué fuente sale y a qué hora se actualizó. */
export interface MetricValue<T = number | null> {
  value: T;
  source: string; // ej. "Meta + GHL"
  updatedAt: string | null; // ISO UTC del dato más viejo usado
  partial: boolean; // día en curso
  estimated: boolean;
}
