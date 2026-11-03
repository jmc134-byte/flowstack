import { redactPII } from "../lib/redact";

export interface StripeParsedEvent {
  eventId: string;
  type: string;
  createdAt: string;
  livemode: boolean;
  redactedPayload: string;
}

/** Valida la forma mínima de un evento de Stripe y le quita los datos personales. */
export async function parseStripeEvent(rawBody: string): Promise<StripeParsedEvent | { error: string }> {
  let ev: Record<string, unknown>;
  try {
    ev = JSON.parse(rawBody);
  } catch {
    return { error: "JSON inválido" };
  }
  if (typeof ev.id !== "string" || !ev.id.startsWith("evt_")) return { error: "falta event.id" };
  if (typeof ev.type !== "string") return { error: "falta event.type" };
  if (typeof ev.created !== "number") return { error: "falta event.created" };
  return {
    eventId: ev.id,
    type: ev.type,
    createdAt: new Date(ev.created * 1000).toISOString(),
    livemode: ev.livemode === true,
    redactedPayload: JSON.stringify(await redactPII(ev)),
  };
}

/** Alias de cuenta seguro para nombre de secreto: letras, números y guion bajo. */
export function stripeSecretName(account: string): string | null {
  return /^[a-z0-9_]{1,40}$/.test(account) ? `STRIPE_WEBHOOK_SECRET_${account.toUpperCase()}` : null;
}
