import { describe, expect, it } from "vitest";
import { formatDayEs, formatTimeEs, formatUsd, localDayKey } from "../src/lib/time";

describe("formato", () => {
  it("montos como $16,500", () => {
    expect(formatUsd(1_650_000)).toBe("$16,500");
    expect(formatUsd(78_500)).toBe("$785");
    expect(formatUsd(-12_345, 2)).toBe("-$123.45");
  });
  it("fechas como 'mar 17 nov' en la zona del lanzamiento", () => {
    // Clase 1 TM2: 7:30 PM Miami = 00:30 UTC del 18 nov
    const c1 = new Date("2026-11-18T00:30:00Z");
    expect(formatDayEs(c1, "America/New_York")).toBe("mar 17 nov");
    expect(formatTimeEs(c1, "America/New_York")).toBe("7:30 PM");
    expect(formatTimeEs(c1, "America/Chicago")).toBe("6:30 PM");
    expect(localDayKey(c1, "UTC")).toBe("2026-11-18");
  });
});
