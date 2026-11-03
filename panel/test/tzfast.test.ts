import { describe, expect, it } from "vitest";
import { localToUtcIso, makeLocalizer } from "../src/lib/tzfast";
import { localDayKey, minutesOfDay } from "../src/lib/time";

describe("zona horaria rápida", () => {
  it("coincide con Intl en muchas horas, incluido el cambio de horario del 1 nov 2026", () => {
    const tz = "America/Chicago";
    const L = makeLocalizer(tz);
    for (let ms = Date.UTC(2026, 9, 30); ms < Date.UTC(2026, 10, 4); ms += 17 * 60_000) {
      const d = new Date(ms);
      expect(L.dayKey(ms)).toBe(localDayKey(d, tz));
      expect(L.minutesOfDay(ms)).toBe(minutesOfDay(d, tz));
    }
  });
  it("local → UTC", () => {
    expect(localToUtcIso("2026-11-17T19:30", "America/New_York")).toBe("2026-11-18T00:30:00.000Z");
    expect(localToUtcIso("2026-11-03T00:00", "America/Chicago")).toBe("2026-11-03T06:00:00.000Z");
    expect(localToUtcIso("2026-10-20T19:30", "America/New_York")).toBe("2026-10-20T23:30:00.000Z");
  });
});
