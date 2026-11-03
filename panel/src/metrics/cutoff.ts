import { localDayKey, minutesOfDay } from "../lib/time";

/**
 * Comparación "al mismo corte horario" (SPEC §Lectura y alertas):
 * para cada día, cuenta los eventos ocurridos hasta la misma hora local del corte.
 * Nunca compara el día en curso contra días completos.
 */
export interface CutoffRow {
  day: string; // YYYY-MM-DD local
  countAtCutoff: number;
  partial: boolean; // true solo para el día en curso
}

export function countsAtSameCutoff(
  eventsUtc: Date[],
  now: Date,
  timeZone: string,
  days: string[], // días locales a comparar (incluye hoy)
): CutoffRow[] {
  const cutoff = minutesOfDay(now, timeZone);
  const today = localDayKey(now, timeZone);
  const counts = new Map<string, number>(days.map((d) => [d, 0]));
  for (const e of eventsUtc) {
    const d = localDayKey(e, timeZone);
    if (!counts.has(d)) continue;
    if (minutesOfDay(e, timeZone) <= cutoff) counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return days.map((d) => ({ day: d, countAtCutoff: counts.get(d) ?? 0, partial: d === today }));
}
