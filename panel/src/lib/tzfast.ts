import { localParts } from "./time";

/**
 * Conversión UTC → hora local barata para muchos eventos (plan gratis: 10 ms de CPU).
 * Calcula el desfase de la zona una vez por hora UTC y lo reutiliza.
 */
export function makeLocalizer(timeZone: string) {
  const cache = new Map<number, number>();
  const offsetMs = (ms: number) => {
    const hour = Math.floor(ms / 3_600_000);
    let off = cache.get(hour);
    if (off === undefined) {
      const p = localParts(new Date(hour * 3_600_000), timeZone);
      off = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - hour * 3_600_000;
      cache.set(hour, off);
    }
    return off;
  };
  return {
    /** Fecha "falsa" cuyos getters UTC dan la hora local. */
    shift(ms: number): Date {
      return new Date(ms + offsetMs(ms));
    },
    dayKey(ms: number): string {
      return new Date(ms + offsetMs(ms)).toISOString().slice(0, 10);
    },
    minutesOfDay(ms: number): number {
      const d = new Date(ms + offsetMs(ms));
      return d.getUTCHours() * 60 + d.getUTCMinutes();
    },
    /** Hora local (0-23) */
    hour(ms: number): number {
      return new Date(ms + offsetMs(ms)).getUTCHours();
    },
  };
}

/** Convierte una hora local (YYYY-MM-DDTHH:mm) de una zona a ISO UTC. */
export function localToUtcIso(local: string, timeZone: string): string {
  const [d, t = "00:00"] = local.split("T");
  const [y, m, day] = d!.split("-").map(Number);
  const [hh, mm] = t.split(":").map(Number);
  const guess = Date.UTC(y!, m! - 1, day!, hh!, mm!);
  // Dos iteraciones bastan alrededor de cambios de horario.
  let ts = guess;
  for (let i = 0; i < 2; i++) {
    const p = localParts(new Date(ts), timeZone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    ts += guess - asUtc;
  }
  return new Date(ts).toISOString();
}
