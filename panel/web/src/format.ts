import { formatDayEs, formatTimeEs, formatUsd } from "../../src/lib/time";

export const MIAMI = "America/New_York";
export const usd = (cents: number | null | undefined, decimals = 0) => (cents === null || cents === undefined ? "—" : formatUsd(cents, decimals));
export const int = (n: number | null | undefined) => (n === null || n === undefined ? "—" : Math.round(n).toLocaleString("en-US"));
export const pct = (r: number | null | undefined, d = 1) => (r === null || r === undefined ? "—" : `${(r * 100).toFixed(d)} %`);
export const day = (iso: string | Date, tz: string) => formatDayEs(typeof iso === "string" ? new Date(iso) : iso, tz);
export const time = (iso: string | Date, tz: string) => formatTimeEs(typeof iso === "string" ? new Date(iso) : iso, tz);
export const dayTime = (iso: string | null, tz: string) => (iso ? `${day(iso, tz)} · ${time(iso, tz)}` : "—");
/** "YYYY-MM-DD" → "mar 17 nov" */
export const dayKey = (k: string) => formatDayEs(new Date(`${k}T12:00:00Z`), "UTC");

/** Hace cuánto (para la hora de actualización de cada fuente). */
export function ago(iso: string | null): string {
  if (!iso) return "nunca";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "hace segundos";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} días`;
}

export const TZ_LABEL: Record<string, string> = {
  "America/Chicago": "Chicago",
  "America/New_York": "Miami",
  "America/Los_Angeles": "Los Ángeles",
  "America/Denver": "Denver",
  "America/Bogota": "Bogotá",
  "America/Mexico_City": "CDMX",
  "America/Caracas": "Caracas",
};
export const tzName = (tz: string) => TZ_LABEL[tz] ?? tz.split("/").pop()!.replace(/_/g, " ");
export const usd2 = (cents: number | null | undefined) => usd(cents, 2);
