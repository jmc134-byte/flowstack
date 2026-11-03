import { describe, expect, it } from "vitest";
import { createFakeD1 } from "./fakeD1";
import { loadDataset } from "../src/metrics/load";
import { antes, durante, despues, resumen, phaseOf } from "../src/metrics/screens";

async function seed() {
  const DB = createFakeD1();
  const now = Date.parse("2026-11-05T20:00:00Z"); // jue 5 nov, 2:00 PM Chicago
  const run = (sql: string, ...a: unknown[]) => DB.prepare(sql).bind(...a).run();
  // Fuentes de TM2 (ya sembradas) + Meta.
  await run(`INSERT INTO launch_sources (launch_id, source, ref_kind, ref_value) VALUES ('tm2','meta','ad_account','act_1'), ('tm2','meta','campaign','c1')`);
  await run(`UPDATE launches SET registrations_goal=100 WHERE id='tm2'`);
  // Registros: 3 por webhook (exactos), 2 solo por API (uno con dateAdded anterior a la captación).
  const wh = (id: string, at: string, src: string | null) =>
    run(`INSERT INTO ghl_webhook_events (dedupe_key, location_id, contact_id, event, tags, attribution, received_at) VALUES (?1,'kZT0P8HbGrGXuUGi7QJy',?2,'registro','["registrotm2"]',?3,?4)`,
      `k-${id}`, id, JSON.stringify(src ? { utm_source: src, variante_landing: "masterclass" } : {}), at);
  await wh("a", "2026-11-04T15:00:00.000Z", "facebook");
  await wh("b", "2026-11-05T16:00:00.000Z", "facebook");
  await wh("c", "2026-11-05T19:30:00.000Z", null);
  const api = (id: string, at: string, attr: object) =>
    run(`INSERT INTO ghl_contacts (location_id, contact_id, date_added, tags, attribution, synced_at) VALUES ('kZT0P8HbGrGXuUGi7QJy',?1,?2,'["registrotm2"]',?3,?2)`, id, at, JSON.stringify(attr));
  await api("a", "2026-11-04T14:59:00.000Z", {}); // mismo contacto que el webhook: no duplica
  await api("d", "2026-11-03T18:00:00.000Z", { utmSource: "facebook" });
  await api("e", "2026-10-01T10:00:00.000Z", { fbclid: "1" }); // contacto antiguo: hora estimada = inicio de captación
  await run(`INSERT INTO ghl_contacts (location_id, contact_id, date_added, tags, synced_at) VALUES ('kZT0P8HbGrGXuUGi7QJy','z','2026-11-04T10:00:00.000Z','["otra"]','x')`);
  // Meta
  const ins = (date: string, ad: string, spend: number, leads: number) =>
    run(`INSERT INTO meta_insights_daily (account_id, level, entity_id, date, campaign_id, campaign_name, ad_id, ad_name, spend_cents, impressions, clicks, leads, fetched_at)
         VALUES ('act_1','ad',?1,?2,'c1','Captación TM2',?1,?3,?4,1000,20,?5,'x')`, ad, date, `Anuncio ${ad}`, spend, leads);
  await ins("2026-11-03", "a1", 50000, 3); await ins("2026-11-04", "a1", 40000, 2); await ins("2026-11-04", "a2", 10000, 1); await ins("2026-11-05", "a1", 20000, 1);
  await run(`INSERT INTO meta_insights_daily (account_id, level, entity_id, date, campaign_id, ad_id, spend_cents, impressions, clicks, fetched_at) VALUES ('act_1','ad','x9','2026-11-04','c-otra','x9',99999,1,1,'x')`);
  await run(`INSERT INTO sync_state (job, cursor, next_run_at) VALUES ('meta:insights:act_1','{"tz":"America/Chicago"}','x')`);
  await run(`INSERT INTO meta_activities (account_id, event_time, event_type, object_id) VALUES ('act_1','2026-11-04T17:00:00.000Z','update_ad_set_budget','a1')`);
  for (const [id, at] of [["ghl:kZT0P8HbGrGXuUGi7QJy", "2026-11-05T19:59:00.000Z"], ["meta:act_1", "2026-11-05T19:45:00.000Z"]])
    await run(`INSERT INTO connections (id, source, status, last_data_at) VALUES (?1, 'x', 'ok', ?2)`, id, at);
  return { DB, now };
}

describe("pantallas calculadas desde la base", () => {
  it("Resumen: registrados únicos, CPL, fuentes y alertas sin ceros silenciosos", async () => {
    const { DB, now } = await seed();
    const d = (await loadDataset(DB, "tm2", now))!;
    expect(d.registrations!.length).toBe(5);
    const r = resumen(d);
    expect(phaseOf(d).key).toBe("capture");
    expect(r.registrados).toMatchObject({ value: 5, source: "GHL", estimated: true });
    expect(r.gasto).toMatchObject({ value: 120000, source: "Meta", updatedAt: "2026-11-05T19:45:00.000Z" });
    // Atribuidos a Meta: a, b, d, e (c sin utm) → 4
    expect(r.cplPagado.value).toBe(30000);
    expect(r.cplTotal.value).toBe(24000);
    expect(r.ventasNetas).toMatchObject({ value: null, note: expect.stringContaining("sin conectar") });
    expect(r.hitos.next).toMatchObject({ kind: "class_1", at: "2026-11-18T00:30:00.000Z" });
    // Fuente de ventas nunca recibió datos → alerta de fuente sin datos; CPL alto ($300 > $15)
    expect(r.alertas.map((a) => a.kind)).toEqual(expect.arrayContaining(["cpl_high", "source_stale"]));
    expect(r.hoy.registrados).toMatchObject({ value: 2, partial: true });
    expect(r.hoy.registradosAyerMismoCorte.value).toBe(1); // a (9:00 AM del 4) antes de las 2 PM
  });

  it("Antes: serie diaria, corte horario, pauta desde el último cambio y proyección estimada", async () => {
    const { DB, now } = await seed();
    const a = antes((await loadDataset(DB, "tm2", now))!);
    expect(a.serie.map((x) => [x.dia, x.registrados, x.alCorte, x.gasto, x.parcial])).toEqual([
      ["2026-11-03", 2, 2, 50000, false],  // d (12 PM) + e (estimado a las 00:00)
      ["2026-11-04", 1, 1, 50000, false],
      ["2026-11-05", 2, 2, 20000, true],
    ]);
    expect(a.serie.at(-1)!.acumulado).toBe(5);
    expect(a.pauta.total.campanas).toHaveLength(1); // la campaña no mapeada no entra
    expect(a.pauta.desdeUltimoCambio!.campanas[0]!.gasto).toBe(70000); // desde el 4 nov
    expect(a.ritmo).toMatchObject({ estimated: true });
    expect(a.ritmo.value).toBeGreaterThan(120000);
    expect(a.variantes).toEqual(expect.arrayContaining([{ variante: "masterclass", total: 2, meta: 2 }, { variante: "Sin variante", total: 3, meta: 2 }]));
  });

  it("Durante y Después sin fuentes: dicen por qué no hay datos", async () => {
    const { DB, now } = await seed();
    const d = (await loadDataset(DB, "tm2", now))!;
    const du = durante(d);
    expect(du.clases[0]!.pico).toMatchObject({ value: null, note: expect.stringContaining("YouTube") });
    expect(du.clases[0]!.inicio).toBe("2026-11-18T00:30:00.000Z");
    expect(despues(d)).toMatchObject({ disponible: false });
  });

  it("Durante con ventas y YouTube: show up, ventas por hora y lista de cuotas fallidas con enlace a GHL", async () => {
    const { DB } = await seed();
    const now = Date.parse("2026-11-19T03:00:00Z");
    const run = (sql: string, ...a: unknown[]) => DB.prepare(sql).bind(...a).run();
    await run(`INSERT INTO launch_sources (launch_id, source, ref_kind, ref_value, extra) VALUES ('tm2','youtube','youtube_video','vid2','{"clase":2}')`);
    for (const [t, v] of [["2026-11-19T00:31:00.000Z", 120], ["2026-11-19T00:45:00.000Z", 300], ["2026-11-19T02:00:00.000Z", 210]])
      await run(`INSERT INTO youtube_samples (video_id, sampled_at, concurrent_viewers, like_count) VALUES ('vid2', ?1, ?2, 40)`, t, v);
    const sale = (id: string, type: string, at: string, extra: string) =>
      run(`INSERT INTO sales_events (event_id, system, type, occurred_at, order_id, launch_id, amount_cents, gateway, received_at, plan_type, installment_number, installments_total, installment_cents, email_hash)
           VALUES (?1,'principal',?2,?3,?4,'tm2',29500,'stripe','x', 'cuotas', ?5, 3, 29500, 'h1')`, `${id}-${type}`, type, at, id, Number(extra));
    await sale("o1", "orden.pagada", "2026-11-19T00:50:00.000Z", "1");
    await sale("o1", "cuota.fallida", "2026-11-19T02:10:00.000Z", "2");
    await run(`INSERT INTO ghl_contacts (location_id, contact_id, email_hash, synced_at) VALUES ('kZT0P8HbGrGXuUGi7QJy','cont-1','h1','x')`);
    await run(`INSERT INTO connections (id, source, status, last_data_at) VALUES ('ventas:principal','ventas','ok','2026-11-19T02:10:01.000Z')`);
    const du = durante((await loadDataset(DB, "tm2", now))!);
    expect(du.clases[1]!.pico.value).toBe(300);
    expect(du.clases[1]!.alFinal.value).toBe(210);
    expect(du.clases[1]!.registradosAlInicio.value).toBe(5);
    expect(du.clases[1]!.showUp.value).toBeCloseTo(60);
    expect(du.ventasPorHora.value!.slice(0, 3).map((h) => h.ventas)).toEqual([1, 0, 0]);
    expect(du.listas.cuotasFallidas.value![0]).toMatchObject({ orden: "o1", cuota: "2 de 3", ghl: expect.stringContaining("/contacts/detail/cont-1") });
  });
});
