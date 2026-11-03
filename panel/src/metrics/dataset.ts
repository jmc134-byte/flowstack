import type { LaunchDoc } from "../api/launches";
import type { SaleEvent } from "../webhooks/sales";

/** Todo lo que una pantalla necesita de un lanzamiento, ya leído de la base. Sin datos personales. */
export interface Dataset {
  now: number; // ms UTC
  launch: LaunchDoc;
  connections: Record<string, { status: string; last_data_at: string | null; last_error: string | null }>;
  /** Registrados únicos: [ms del registro, exacto (webhook) 1/0, atribuido a Meta 1/0, variante de landing | null] */
  registrations: Array<[number, number, number, string | null]> | null; // null = sin mapeo de GHL
  meta: {
    rows: Array<{
      date: string; campaign_id: string; campaign_name: string | null; ad_id: string; ad_name: string | null;
      spend_cents: number; impressions: number; clicks: number; link_clicks: number | null; leads: number | null;
    }>;
    timezone: string | null;
    lastChangeAt: string | null;
  } | null; // null = sin mapeo de Meta
  sales: SaleEvent[] | null; // null = sin fuente de ventas conectada
  salesContacts: Record<string, string>; // email_hash → contact_id de GHL (para enlaces)
  ghlLocation: string | null;
  youtube: Array<{ clase: number; video_id: string; samples: Array<[number, number | null, number | null, number | null]> }>; // [ms, conectados, likes, comentarios]
  manual: Array<{ id: number; kind: string; ref: string | null; value: number | null; text: string | null; measured_at: string }>;
}

export interface Metric<T = number | null> {
  value: T;
  source: string;
  updatedAt: string | null;
  partial?: boolean;
  estimated?: boolean;
  note?: string; // por qué falta o cómo se calculó
}
