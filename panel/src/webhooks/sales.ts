import { hashEmail, hashPhone } from "../lib/crypto";

/** Contrato v1 del sistema de cobros propio. Ver docs/CONTRATO-VENTAS.md. */
export const SALE_TYPES = [
  "orden.pagada",
  "cuota.cobrada",
  "cuota.fallida",
  "reembolso",
  "contracargo",
  "contracargo.resuelto",
  "checkout.abandonado",
] as const;
export type SaleType = (typeof SALE_TYPES)[number];
export const GATEWAYS = ["stripe", "authorize_net", "paypal", "otro"] as const;

export interface SaleEvent {
  eventId: string;
  type: SaleType;
  occurredAt: string;
  orderId: string;
  launchId: string | null;
  product: string | null;
  planType: "unico" | "cuotas" | null;
  installmentNumber: number | null;
  installmentsTotal: number | null;
  installmentCents: number | null;
  amountCents: number;
  currency: string;
  feeCents: number | null;
  gateway: (typeof GATEWAYS)[number];
  gatewayTxnId: string | null;
  emailHash: string | null;
  phoneHash: string | null;
  ghlContactId: string | null;
  reason: string | null;
  disputeStatus: "abierto" | "ganado" | "perdido" | null;
  isTest: boolean;
}

type J = Record<string, unknown>;
const s = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);

/** Valida y normaliza un evento. Devuelve la lista de errores si no cumple el contrato. */
export async function parseSaleEvent(body: unknown): Promise<SaleEvent | { errors: string[] }> {
  const errors: string[] = [];
  if (!body || typeof body !== "object" || Array.isArray(body)) return { errors: ["cuerpo JSON inválido"] };
  const b = body as J;
  const plan = (b.plan && typeof b.plan === "object" ? b.plan : {}) as J;
  const cliente = (b.cliente && typeof b.cliente === "object" ? b.cliente : {}) as J;

  const eventId = s(b.id, 120);
  if (!eventId) errors.push("id requerido");
  const type = s(b.tipo) as SaleType | null;
  if (!type || !SALE_TYPES.includes(type)) errors.push(`tipo debe ser uno de: ${SALE_TYPES.join(", ")}`);
  const occurred = s(b.ocurrido_en);
  const occurredDate = occurred ? new Date(occurred) : null;
  if (!occurred || !/Z$|[+-]\d{2}:\d{2}$/.test(occurred) || Number.isNaN(occurredDate?.getTime()))
    errors.push("ocurrido_en requerido en ISO-8601 con zona (ej. 2026-11-18T01:12:00Z)");
  const orderId = s(b.orden_id, 120);
  if (!orderId) errors.push("orden_id requerido");
  const amount = int(b.monto_centavos);
  if (amount === null || amount < 0) errors.push("monto_centavos requerido (entero ≥ 0)");
  const currency = (s(b.moneda) ?? "USD").toUpperCase();
  if (currency !== "USD") errors.push("moneda: solo USD por ahora");
  const gateway = (s(b.gateway) ?? "") as SaleEvent["gateway"];
  if (!GATEWAYS.includes(gateway)) errors.push(`gateway debe ser uno de: ${GATEWAYS.join(", ")}`);
  const fee = b.comision_centavos === undefined || b.comision_centavos === null ? null : int(b.comision_centavos);
  if (b.comision_centavos != null && fee === null) errors.push("comision_centavos debe ser entero");

  const planType = s(plan.tipo) as SaleEvent["planType"];
  if (planType && planType !== "unico" && planType !== "cuotas") errors.push("plan.tipo: unico | cuotas");
  const nInst = int(plan.cuota_numero);
  const totalInst = int(plan.cuotas_total);
  if (planType === "cuotas" && (nInst === null || totalInst === null || nInst < 1 || nInst > totalInst))
    errors.push("plan cuotas requiere cuota_numero y cuotas_total válidos");
  if ((type === "cuota.cobrada" || type === "cuota.fallida") && planType !== "cuotas")
    errors.push(`${type} requiere plan.tipo = cuotas`);

  const dispute = s(b.estado_contracargo) as SaleEvent["disputeStatus"];
  if (dispute && !["abierto", "ganado", "perdido"].includes(dispute)) errors.push("estado_contracargo: abierto | ganado | perdido");

  if (errors.length) return { errors };
  return {
    eventId: eventId!,
    type: type!,
    occurredAt: occurredDate!.toISOString(),
    orderId: orderId!,
    launchId: s(b.lanzamiento, 80),
    product: s(b.producto),
    planType,
    installmentNumber: nInst,
    installmentsTotal: totalInst,
    installmentCents: int(plan.monto_cuota_centavos),
    amountCents: amount!,
    currency,
    feeCents: fee,
    gateway,
    gatewayTxnId: s(b.gateway_transaccion_id),
    emailHash: await hashEmail(s(cliente.email)),
    phoneHash: await hashPhone(s(cliente.telefono)),
    ghlContactId: s(cliente.ghl_contact_id, 60),
    reason: s(b.motivo),
    disputeStatus: dispute,
    isTest: b.prueba === true,
  };
}

export function salesSecretName(system: string): string | null {
  return /^[a-z0-9_]{1,40}$/.test(system) ? `VENTAS_WEBHOOK_SECRET_${system.toUpperCase()}` : null;
}
