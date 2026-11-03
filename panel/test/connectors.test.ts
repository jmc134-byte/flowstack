import { describe, expect, it } from "vitest";
import { createFakeD1 } from "./fakeD1";
import { mapInsightRow, parseThrottle } from "../src/connectors/meta";
import { mapContact } from "../src/connectors/ghl";
import { runDueJobs } from "../src/sync/runner";
import { hmacSha256Hex } from "../src/lib/crypto";

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

describe("Meta: mapeo", () => {
  it("convierte gasto a centavos y toma lead / omni_purchase", () => {
    const r = mapInsightRow("ad", {
      campaign_id: "c1", adset_id: "s1", ad_id: "a1", ad_name: "Video 1", spend: "123.45", impressions: "1000",
      clicks: "50", inline_link_clicks: "40", date_start: "2026-11-03",
      actions: [{ action_type: "lead", value: "12" }, { action_type: "omni_purchase", value: "1" }, { action_type: "purchase", value: "9" }],
    });
    expect(r).toMatchObject({ entityId: "a1", spendCents: 12345, impressions: 1000, leads: 12, purchases: 1, date: "2026-11-03" });
  });
  it("lee el header de throttle", () => {
    expect(parseThrottle('{"app_id_util_pct":12.5,"acc_id_util_pct":80}')).toBe(80);
    expect(parseThrottle(null)).toBeNull();
  });
});

describe("GHL: mapeo sin datos personales", () => {
  it("solo hash del email; URL sin query", async () => {
    const c = await mapContact({
      id: "x1", email: "Ana@Example.com", firstName: "Ana", phone: "+13055550101", dateAdded: "2026-11-03T14:00:00.000Z",
      tags: ["RegistroTM2", "registrotm2", "lead"], source: "form",
      attributions: [{ isFirst: true, utmSource: "facebook", utmContent: "1202", url: "https://masterclass.tax-master.us/?email=ana@example.com&v=b", fbclid: "abc" }],
    });
    expect(c.tags).toEqual(["lead", "registrotm2"]);
    expect(c.attribution).toEqual({ utmSource: "facebook", utmContent: "1202", url: "masterclass.tax-master.us/", fbclid: "1" });
    expect(JSON.stringify(c)).not.toMatch(/Ana|ana@|3055550101/);
  });
});

describe("despachador por pedazos", () => {
  it("sin credenciales: lo reporta en Conexiones (no muestra ceros)", async () => {
    const DB = createFakeD1();
    await runDueJobs({ DB, META_AD_ACCOUNTS: "act_1", GHL_LOCATIONS: "kZT0P8HbGrGXuUGi7QJy" }, (async () => { throw new Error("no debe llamar"); }) as any);
    const { results } = await DB.prepare("SELECT id, status, last_error FROM connections ORDER BY id").all();
    expect(results).toEqual([
      { id: "ghl:kZT0P8HbGrGXuUGi7QJy", status: "sin_credenciales", last_error: "falta GHL_PIT_kZT0P8HbGrGXuUGi7QJy" },
      { id: "meta:act_1", status: "sin_credenciales", last_error: "faltan META_TOKEN o META_APP_SECRET" },
    ]);
  });

  it("Meta: una llamada por paso, pagina, guarda idempotente y usa appsecret_proof", async () => {
    const DB = createFakeD1();
    const env = { DB, META_TOKEN: "tok", META_APP_SECRET: "sec", META_AD_ACCOUNTS: "act_1", META_BACKFILL_SINCE: "2026-11-01" };
    const calls: string[] = [];
    const proof = await hmacSha256Hex("sec", "tok");
    const fetchFn = (async (url: string) => {
      const u = new URL(url);
      calls.push(u.pathname + (u.searchParams.get("after") ? "?after" : ""));
      expect(u.searchParams.get("appsecret_proof")).toBe(proof);
      expect(u.hostname).toBe("graph.facebook.com");
      if (u.pathname === "/v26.0/act_1") return json({ timezone_name: "America/Chicago", currency: "USD" });
      if (u.pathname.endsWith("/activities")) return json({ data: [{ event_time: "2026-11-03T15:00:00+0000", event_type: "update_ad_set_budget", object_id: "s1" }] });
      const row = (ad: string, spend: string) => ({ campaign_id: "c1", adset_id: "s1", ad_id: ad, spend, impressions: "10", clicks: "1", date_start: "2026-11-02", actions: [{ action_type: "lead", value: "2" }] });
      if (!u.searchParams.get("after")) return json({ data: [row("a1", "10.00")], paging: { cursors: { after: "P2" }, next: "https://…" } });
      return json({ data: [row("a2", "5.50")], paging: { cursors: { after: "P3" } } });
    }) as any;

    const t0 = new Date("2026-11-03T20:00:00Z");
    await runDueJobs(env, fetchFn, t0); // tz de la cuenta + actividad
    await runDueJobs(env, fetchFn, new Date(t0.getTime() + 60_000)); // página 1
    await runDueJobs(env, fetchFn, new Date(t0.getTime() + 120_000)); // página 2 → termina
    await runDueJobs(env, fetchFn, new Date(t0.getTime() + 180_000)); // nada vence: no llama
    expect(calls).toEqual(["/v26.0/act_1", "/v26.0/act_1/activities", "/v26.0/act_1/insights", "/v26.0/act_1/insights?after"]);
    const tot = await DB.prepare("SELECT SUM(spend_cents) s, SUM(leads) l, COUNT(*) n FROM meta_insights_daily").first();
    expect(tot).toEqual({ s: 1550, l: 4, n: 2 });
    const st = await DB.prepare("SELECT cursor, next_run_at FROM sync_state WHERE job='meta:insights:act_1'").first<any>();
    expect(JSON.parse(st.cursor)).toMatchObject({ since: "2026-10-31", until: "2026-11-03", backfilled: true });
    expect(st.next_run_at).toBe("2026-11-03T21:02:00.000Z"); // cada 60 min fuera de semana de lanzamiento

    // Repetir el mismo rango no duplica (upsert).
    await runDueJobs(env, fetchFn, new Date("2026-11-03T21:02:00Z"));
    await runDueJobs(env, fetchFn, new Date("2026-11-03T21:03:00Z"));
    expect(await DB.prepare("SELECT COUNT(*) n FROM meta_insights_daily").first()).toEqual({ n: 2 });
  });

  it("error de límite: reintenta con espera y marca la conexión en error", async () => {
    const DB = createFakeD1();
    const env = { DB, GHL_LOCATIONS: "loc1234567", GHL_PIT_loc1234567: "pit", GHL_TAGS_loc1234567: "registrotm2" };
    const fetchFn = (async () => json({ message: "Too Many Requests" }, 429)) as any;
    const t0 = new Date("2026-11-03T20:00:00Z");
    const out = await runDueJobs(env, fetchFn, t0);
    expect(out[0]).toMatchObject({ ok: false });
    const st = await DB.prepare("SELECT next_run_at, attempts FROM sync_state").first();
    expect(st).toEqual({ next_run_at: "2026-11-03T20:10:00.000Z", attempts: 1 });
    expect(await DB.prepare("SELECT status FROM connections WHERE id='ghl:loc1234567'").first()).toEqual({ status: "error" });
  });

  it("GHL: pagina con searchAfter y guarda contactos", async () => {
    const DB = createFakeD1();
    const env = { DB, GHL_LOCATIONS: "loc1234567", GHL_PIT_loc1234567: "pit", GHL_TAGS_loc1234567: "registrotm2" };
    const bodies: any[] = [];
    const fetchFn = (async (_url: string, init: RequestInit) => {
      expect((init.headers as any).Version).toBe("2021-07-28");
      const b = JSON.parse(String(init.body));
      bodies.push(b);
      const contacts = b.searchAfter
        ? [{ id: "z", tags: ["registrotm2"], dateAdded: "2026-11-03T10:00:00Z" }]
        : Array.from({ length: 100 }, (_, i) => ({ id: `c${i}`, tags: ["registrotm2"], email: `u${i}@x.co`, dateAdded: "2026-11-03T09:00:00Z", searchAfter: [i] }));
      return json({ contacts });
    }) as any;
    await runDueJobs(env, fetchFn, new Date("2026-11-03T20:00:00Z"));
    await runDueJobs(env, fetchFn, new Date("2026-11-03T20:01:00Z"));
    expect(bodies[1].searchAfter).toEqual([99]);
    expect(bodies[0].filters).toEqual([{ field: "tags", operator: "contains", value: "registrotm2" }]);
    expect(await DB.prepare("SELECT COUNT(*) n FROM ghl_contacts").first()).toEqual({ n: 101 });
  });
});
