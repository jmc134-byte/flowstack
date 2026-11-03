/** Utilidades de zona horaria y formato (es, USD). Guardamos en UTC y mostramos en la zona del lanzamiento. */

const DAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  weekday: number; // 0 = domingo
}

export function localParts(date: Date, timeZone: string): LocalParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday ?? "");
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    weekday: wd,
  };
}

/** Clave de día local, ej. "2026-11-17". */
export function localDayKey(date: Date, timeZone: string): string {
  const p = localParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

/** Minutos desde la medianoche local. */
export function minutesOfDay(date: Date, timeZone: string): number {
  const p = localParts(date, timeZone);
  return p.hour * 60 + p.minute;
}

/** "mar 17 nov" */
export function formatDayEs(date: Date, timeZone: string): string {
  const p = localParts(date, timeZone);
  return `${DAYS[p.weekday]} ${p.day} ${MONTHS[p.month - 1]}`;
}

/** "7:30 PM" */
export function formatTimeEs(date: Date, timeZone: string): string {
  const p = localParts(date, timeZone);
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${h12}:${String(p.minute).padStart(2, "0")} ${p.hour < 12 ? "AM" : "PM"}`;
}

/** "$16,500" (centavos → USD, sin decimales salvo que se pidan). */
export function formatUsd(cents: number, decimals = 0): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents) / 100;
  const [int, dec] = abs.toFixed(decimals).split(".");
  const withCommas = (int ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}$${withCommas}${dec ? "." + dec : ""}`;
}
