import type { Dataset, Metric } from "./dataset";
import { cplPaid, cplTotal, netSales, committedRevenue, netRevenue, showUp, conversion, cpa, roas } from "./definitions";
import { summarizeSales, type SalesSummary } from "./sales";
import { makeLocalizer } from "../lib/tzfast";
import { ghlContactUrl } from "../connectors/ghl";

const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : null);
const iso = (t: number | null) => (t === null ? null : new Date(t).toISOString());

// ───────────── Hitos y fase ─────────────
export const MILESTONE_LABEL: Record<string, string> = {
  capture_start: "Inicio de captación", ig_live: "Live de IG", class_1: "Clase 1", class_2: "Clase 2", class_3: "Clase 3",
  cart_open: "Apertura de carrito", bonus_deadline: "Deadline de bonos", closing_live: "Live de cierre", cart_close: "Cierre",
};

export function milestoneMs(d: Dataset, kind: string): number | null {
  const m = d.launch.milestones.find((x) => x.kind === kind && x.starts_at);
  return m ? ms(m.starts_at) : null;
}

export function phaseOf(d: Dataset): { key: string; label: string } {
  if (d.launch.status === "historical" || d.launch.status === "closed") return { key: "closed", label: "Cerrado" };
  const t = d.now;
  const close = milestoneMs(d, "cart_close");
  const open = milestoneMs(d, "cart_open");
  const c1 = milestoneMs(d, "class_1");
  const cap = milestoneMs(d, "capture_start");
  if (close !== null && t >= close) return { key: "after", label: "Después (cierre y cobros)" };
  if (open !== null && t >= open) return { key: "cart", label: "Durante · carrito abierto" };
  if (c1 !== null && t >= c1) return { key: "classes", label: "Durante · clases" };
  if (cap !== null && t >= cap) return { key: "capture", label: "Antes · captación" };
  return { key: "prep", label: "Preparación" };
}

export function nextMilestone(d: Dataset) {
  const upcoming = d.launch.milestones
    .filter((m) => m.starts_at && Date.parse(m.starts_at) > d.now)
    .sort((a, b) => a.starts_at!.localeCompare(b.starts_at!))[0];
  const undated = d.launch.milestones.filter((m) => !m.starts_at).map((m) => m.label ?? MILESTONE_LABEL[m.kind] ?? m.kind);
  return {
    next: upcoming ? { kind: upcoming.kind, label: upcoming.label ?? MILESTONE_LABEL[upcoming.kind], at: upcoming.starts_at } : null,
    undated,
  };
}

// ───────────── Procedencia ─────────────
function connFor(d: Dataset, prefix: string) {
  return Object.entries(d.connections).filter(([id]) => id.startsWith(prefix)).map(([id, c]) => ({ id, ...c }));
}
function oldest(...dates: Array<string | null | undefined>): string | null {
  const v = dates.filter((x): x is string => !!x);
  return v.length ? v.sort()[0]! : null;
}
const ghlUpdated = (d: Dataset) => oldest(...connFor(d, "ghl:").map((c) => c.last_data_at));
const metaUpdated = (d: Dataset) => oldest(...connFor(d, "meta:").map((c) => c.last_data_at));
const salesUpdated = (d: Dataset) => oldest(...connFor(d, "ventas:").map((c) => c.last_data_at));

function metric<T>(value: T, source: string, updatedAt: string | null, extra: Partial<Metric<T>> = {}): Metric<T> {
  return { value, source, updatedAt, ...extra };
}

// ───────────── Bloques base ─────────────
export function registrationsMetric(d: Dataset, atMs?: number): Metric<number | null> {
  if (!d.registrations) return metric(null, "GHL", null, { note: "Sin subcuenta o etiqueta de registro de GHL configurada." });
  if (!ghlUpdated(d) && d.registrations.length === 0) return metric(null, "GHL", null, { note: "GHL todavía no ha enviado datos." });
  const regs = atMs === undefined ? d.registrations : d.registrations.filter((r) => r[0] <= atMs);
  const estimated = regs.some((r) => r[1] === 0);
  return metric(regs.length, "GHL", ghlUpdated(d), {
    estimated,
    note: estimated ? "Incluye registros con hora estimada (anteriores al webhook)." : undefined,
  });
}

export function spendMetric(d: Dataset, sinceDate?: string): Metric<number | null> {
  if (!d.meta) return metric(null, "Meta", null, { note: "Sin cuenta publicitaria o campañas de Meta configuradas." });
  const rows = sinceDate ? d.meta.rows.filter((r) => r.date >= sinceDate) : d.meta.rows;
  const total = rows.reduce((s, r) => s + r.spend_cents, 0);
  const updated = metaUpdated(d);
  return metric(updated ? total : null, "Meta", updated, updated ? {} : { note: "Meta todavía no ha sincronizado." });
}

export function salesSummary(d: Dataset): SalesSummary | null {
  return d.sales ? summarizeSales(d.sales) : null;
}

// ───────────── Alertas ─────────────
export interface Alert {
  kind: string;
  level: "critical" | "serious" | "warning";
  icon: string;
  title: string;
  dato: string;
  umbral: string;
  accion: string;
}

const usd = (cents: number) => `$${Math.round(cents / 100).toLocaleString("en-US")}`;
const usd2 = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function alertsFor(d: Dataset): Alert[] {
  const out: Alert[] = [];
  const rule = (k: string) => d.launch.alert_rules.find((r) => r.kind === k)?.threshold ?? null;
  const phase = phaseOf(d).key;
  const spend = spendMetric(d).value;
  const regs = d.registrations;
  const metaRegs = regs ? regs.filter((r) => r[2] === 1).length : null;
  const cap = d.launch.ad_spend_cap_cents;

  const cplT = rule("cpl_high");
  const cpl = cplPaid(spend, metaRegs);
  if (cplT !== null && cpl !== null && cpl > cplT)
    out.push({ kind: "cpl_high", level: "serious", icon: "trend-up", title: "CPL pagado alto", dato: usd2(cpl), umbral: `más de ${usd2(cplT)}`, accion: "Revisa en Antes los anuncios con CPL más alto y decide en Ads Manager si los pausas o cambias el creativo." });

  if (cap && spend !== null) {
    const pct = (spend / cap) * 100;
    const t100 = rule("spend_100");
    const t80 = rule("spend_80");
    if (t100 !== null && pct >= t100)
      out.push({ kind: "spend_100", level: "critical", icon: "stop", title: "Tope de pauta alcanzado", dato: `${usd(spend)} (${pct.toFixed(0)} %)`, umbral: `${t100} % de ${usd(cap)}`, accion: "Decide hoy si pausas las campañas o subes el tope del lanzamiento." });
    else if (t80 !== null && pct >= t80)
      out.push({ kind: "spend_80", level: "warning", icon: "gauge", title: "Pauta al 80 % del tope", dato: `${usd(spend)} (${pct.toFixed(0)} %)`, umbral: `${t80} % de ${usd(cap)}`, accion: "Revisa la proyección de gasto en Antes y ajusta presupuestos diarios si llegará antes de tiempo." });
  }

  const hT = rule("hours_without_registrations");
  if (hT !== null && phase === "capture" && regs) {
    const last = regs.reduce((m, r) => Math.max(m, r[0]), 0);
    const hours = last ? (d.now - last) / 3_600_000 : Infinity;
    if (hours >= hT)
      out.push({ kind: "hours_without_registrations", level: "critical", icon: "clock", title: "Sin registros nuevos", dato: last ? `${hours.toFixed(1)} h sin registros` : "ningún registro todavía", umbral: `${hT} h durante la captación`, accion: "Prueba la landing y el formulario, y confirma que los anuncios estén activos y que el webhook de GHL esté funcionando." });
  }

  const s = salesSummary(d);
  const fT = rule("payment_failed");
  if (s && fT !== null && s.installments.failed >= fT)
    out.push({ kind: "payment_failed", level: "serious", icon: "card", title: "Cuotas fallidas", dato: `${s.installments.failed} órdenes`, umbral: `${fT} o más`, accion: "Abre la lista de Ventas en Durante y contacta hoy a cada comprador." });

  const dT = rule("dispute_new");
  if (d.sales && dT !== null) {
    const recent = d.sales.filter((e) => e.type === "contracargo" && !e.isTest && d.now - Date.parse(e.occurredAt) < 86_400_000).length;
    if (recent >= dT)
      out.push({ kind: "dispute_new", level: "critical", icon: "shield", title: "Contracargo nuevo", dato: `${recent} en las últimas 24 h`, umbral: `${dT} o más`, accion: "Prepara la evidencia (acceso al curso, aceptación de términos) y respóndelo en la pasarela antes de su fecha límite." });
  }

  const sT = rule("source_stale");
  if (sT !== null) {
    for (const [id, c] of Object.entries(d.connections)) {
      if (id.startsWith("cron:")) continue;
      const age = c.last_data_at ? (d.now - Date.parse(c.last_data_at)) / 3_600_000 : Infinity;
      if (c.status === "error" || c.status === "sin_credenciales" || age >= sT)
        out.push({ kind: "source_stale", level: c.status === "error" ? "critical" : "warning", icon: "plug", title: `Fuente sin datos: ${id}`, dato: c.status === "sin_credenciales" ? "sin credenciales" : c.last_data_at ? `último dato hace ${age.toFixed(1)} h` : "nunca ha enviado datos", umbral: `más de ${sT} h o con error`, accion: c.last_error ? `Revisa Conexiones: ${c.last_error}` : "Revisa Conexiones." });
    }
  }
  const order = { critical: 0, serious: 1, warning: 2 };
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

// ───────────── Resumen ─────────────
export function resumen(d: Dataset) {
  const regs = registrationsMetric(d);
  const spend = spendMetric(d);
  const metaRegs = d.registrations ? d.registrations.filter((r) => r[2] === 1).length : null;
  const s = salesSummary(d);
  const salesSrc = "Sistema de ventas";
  const salesUpd = salesUpdated(d);
  const ns = s ? netSales(s.counts) : null;
  const L = makeLocalizer(d.launch.timezone);
  const today = L.dayKey(d.now);
  const yesterdayCut = d.now - 86_400_000;
  const regsToday = d.registrations ? d.registrations.filter((r) => L.dayKey(r[0]) === today).length : null;
  const regsYesterdaySameCut = d.registrations
    ? d.registrations.filter((r) => L.dayKey(r[0]) === L.dayKey(yesterdayCut) && r[0] <= yesterdayCut).length
    : null;
  const salesToday = d.sales ? d.sales.filter((e) => e.type === "orden.pagada" && !e.isTest && L.dayKey(Date.parse(e.occurredAt)) === today).length : null;

  return {
    lanzamiento: { id: d.launch.id, edicion: d.launch.edition, zona: d.launch.timezone, estado: d.launch.status, notas: d.launch.notes },
    fase: phaseOf(d),
    hitos: nextMilestone(d),
    gasto: spend,
    tope: d.launch.ad_spend_cap_cents,
    registrados: regs,
    cplPagado: metric(cplPaid(spend.value, metaRegs), "Meta + GHL", oldest(spend.updatedAt, regs.updatedAt), { estimated: regs.estimated, note: spend.value === null ? spend.note : regs.value === null ? regs.note : undefined }),
    cplTotal: metric(cplTotal(spend.value, regs.value), "Meta + GHL", oldest(spend.updatedAt, regs.updatedAt), { estimated: regs.estimated, note: spend.value === null ? spend.note : regs.value === null ? regs.note : undefined }),
    ventasNetas: metric(ns, salesSrc, salesUpd, s ? {} : { note: "Sistema de ventas sin conectar o sin datos todavía." }),
    ingresoComprometido: metric(s ? committedRevenue(s.revenue) : null, salesSrc, salesUpd, s ? {} : { note: "Sistema de ventas sin conectar." }),
    hoy: {
      registrados: metric(regsToday, "GHL", regs.updatedAt, { partial: true }),
      registradosAyerMismoCorte: metric(regsYesterdaySameCut, "GHL", regs.updatedAt),
      ventas: metric(salesToday, salesSrc, salesUpd, { partial: true }),
    },
    alertas: alertsFor(d),
    fuentes: Object.entries(d.connections).map(([id, c]) => ({ id, ...c })),
  };
}

// ───────────── Antes ─────────────
function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (d <= end && out.length < 400) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function antes(d: Dataset) {
  const L = makeLocalizer(d.launch.timezone);
  const today = L.dayKey(d.now);
  const capStart = milestoneMs(d, "capture_start");
  const regs = d.registrations ?? [];
  const firstReg = regs.length ? Math.min(...regs.map((r) => r[0])) : null;
  // Desde el inicio de captación (o el primer registro, si llegó antes), hasta hoy o la clase 1.
  const starts = [capStart, firstReg].filter((v): v is number => v !== null);
  const startDay = starts.length ? L.dayKey(Math.min(...starts)) : today;
  const class1 = milestoneMs(d, "class_1");
  const endDay = class1 !== null && class1 < d.now ? L.dayKey(class1) : today;
  const days = startDay <= endDay ? dayRange(startDay, endDay) : [];

  // Registrados por día y acumulado.
  const perDay = new Map<string, { total: number; meta: number; estimated: number }>(days.map((k) => [k, { total: 0, meta: 0, estimated: 0 }]));
  for (const r of regs) {
    const k = L.dayKey(r[0]);
    const row = perDay.get(k);
    if (!row) continue;
    row.total++;
    row.meta += r[2];
    row.estimated += r[1] === 0 ? 1 : 0;
  }
  // Mismo corte horario: hoy contra días anteriores hasta la misma hora local.
  const cut = L.minutesOfDay(d.now);
  const atCut = new Map<string, number>();
  for (const r of regs) {
    const k = L.dayKey(r[0]);
    if (perDay.has(k) && L.minutesOfDay(r[0]) <= cut) atCut.set(k, (atCut.get(k) ?? 0) + 1);
  }
  // Meta por día (fechas en la zona de la cuenta publicitaria).
  const metaDay = new Map<string, { spend: number; leads: number }>();
  for (const r of d.meta?.rows ?? []) {
    const m = metaDay.get(r.date) ?? { spend: 0, leads: 0 };
    m.spend += r.spend_cents;
    m.leads += r.leads ?? 0;
    metaDay.set(r.date, m);
  }
  let cum = 0;
  let cumSpend = 0;
  const serie = days.map((k) => {
    const row = perDay.get(k)!;
    cum += row.total;
    const md = metaDay.get(k);
    cumSpend += md?.spend ?? 0;
    return {
      dia: k,
      parcial: k === today,
      registrados: d.registrations ? row.total : null,
      registradosMeta: d.registrations ? row.meta : null,
      estimados: row.estimated,
      acumulado: d.registrations ? cum : null,
      alCorte: d.registrations ? atCut.get(k) ?? 0 : null,
      gasto: d.meta ? md?.spend ?? 0 : null,
      gastoAcumulado: d.meta ? cumSpend : null,
      leadsMeta: d.meta ? md?.leads ?? 0 : null,
      cplPagado: d.meta && d.registrations ? cplPaid(md?.spend ?? 0, row.meta) : null,
      cplTotal: d.meta && d.registrations ? cplTotal(md?.spend ?? 0, row.total) : null,
    };
  });

  // Gasto por campaña y por anuncio, total o desde el último cambio.
  const lastChangeDay = d.meta?.lastChangeAt && d.meta.timezone ? makeLocalizer(d.meta.timezone).dayKey(Date.parse(d.meta.lastChangeAt)) : null;
  const group = (since: string | null) => {
    const camp = new Map<string, { id: string; nombre: string | null; gasto: number; impresiones: number; clics: number; leads: number }>();
    const ads = new Map<string, { id: string; nombre: string | null; campana: string | null; gasto: number; impresiones: number; clics: number; clicsEnlace: number; leads: number }>();
    for (const r of d.meta?.rows ?? []) {
      if (since && r.date < since) continue;
      const c = camp.get(r.campaign_id) ?? { id: r.campaign_id, nombre: r.campaign_name, gasto: 0, impresiones: 0, clics: 0, leads: 0 };
      c.gasto += r.spend_cents; c.impresiones += r.impressions; c.clics += r.clicks; c.leads += r.leads ?? 0;
      camp.set(r.campaign_id, c);
      const a = ads.get(r.ad_id) ?? { id: r.ad_id, nombre: r.ad_name, campana: r.campaign_name, gasto: 0, impresiones: 0, clics: 0, clicsEnlace: 0, leads: 0 };
      a.gasto += r.spend_cents; a.impresiones += r.impressions; a.clics += r.clicks; a.clicsEnlace += r.link_clicks ?? 0; a.leads += r.leads ?? 0;
      ads.set(r.ad_id, a);
    }
    const withRates = <T extends { gasto: number; impresiones: number; clics: number }>(x: T) => ({
      ...x,
      cpm: x.impresiones ? (x.gasto / x.impresiones) * 1000 : null,
      ctr: x.impresiones ? x.clics / x.impresiones : null,
    });
    return {
      campanas: [...camp.values()].map(withRates).sort((a, b) => b.gasto - a.gasto),
      anuncios: [...ads.values()].map(withRates).sort((a, b) => b.gasto - a.gasto),
    };
  };

  // Ritmo de gasto y proyección (estimado) hasta el fin de la pauta.
  const endMs = milestoneMs(d, "cart_close") ?? milestoneMs(d, "closing_live") ?? milestoneMs(d, "class_3");
  const complete = serie.filter((x) => !x.parcial && x.gasto !== null).slice(-3);
  const avg = complete.length ? complete.reduce((s, x) => s + (x.gasto ?? 0), 0) / complete.length : null;
  const spentSoFar = d.meta ? serie.at(-1)?.gastoAcumulado ?? 0 : null;
  const remainingDays = endMs !== null ? Math.max(0, (endMs - d.now) / 86_400_000) : null;
  const projection = avg !== null && spentSoFar !== null && remainingDays !== null ? Math.round(spentSoFar + avg * remainingDays) : null;

  // Variantes de landing.
  const variants = new Map<string, { total: number; meta: number }>();
  for (const r of regs) {
    const k = r[3] ?? "Sin variante";
    const v = variants.get(k) ?? { total: 0, meta: 0 };
    v.total++; v.meta += r[2];
    variants.set(k, v);
  }

  const whatsapp = d.manual.filter((m) => m.kind === "whatsapp_members").map((m) => ({ at: m.measured_at, miembros: m.value })).sort((a, b) => a.at.localeCompare(b.at));
  const regTotal = registrationsMetric(d);
  const spend = spendMetric(d);

  return {
    zona: d.launch.timezone,
    zonaMeta: d.meta?.timezone ?? null,
    meta: { registrados: d.launch.registrations_goal },
    hoy: today,
    corteMinutos: cut,
    serie,
    fuentes: { registrados: regTotal, gasto: spend },
    pauta: { total: group(null), desdeUltimoCambio: lastChangeDay ? group(lastChangeDay) : null, ultimoCambio: d.meta?.lastChangeAt ?? null },
    ritmo: metric(projection, "Meta (proyección)", spend.updatedAt, {
      estimated: true,
      note: avg === null ? "Faltan días completos de gasto para proyectar." : `Promedio de los últimos ${complete.length} días completos × ${remainingDays?.toFixed(1)} días restantes.`,
    }),
    promedioDiario: avg,
    tope: d.launch.ad_spend_cap_cents,
    variantes: [...variants.entries()].map(([k, v]) => ({ variante: k, ...v })).sort((a, b) => b.total - a.total),
    whatsapp: metric(whatsapp, "Carga manual", whatsapp.at(-1)?.at ?? null),
  };
}

// ───────────── Durante ─────────────
export function durante(d: Dataset) {
  const L = makeLocalizer(d.launch.timezone);
  const s = salesSummary(d);
  const salesUpd = salesUpdated(d);
  const ytUpd = oldest(...connFor(d, "youtube").map((c) => c.last_data_at));
  const clases = [1, 2, 3].map((n) => {
    const start = milestoneMs(d, `class_${n}`);
    const yt = d.youtube.find((y) => y.clase === n);
    const samples = yt?.samples ?? [];
    const viewers = samples.map((x) => x[1]).filter((v): v is number => v !== null);
    const peak = viewers.length ? Math.max(...viewers) : null;
    const last = [...samples].reverse().find((x) => x[1] !== null);
    const lastStats = [...samples].reverse().find((x) => x[2] !== null || x[3] !== null);
    const regsAtStart = start !== null ? registrationsMetric(d, start) : metric(null, "GHL", null, { note: "La clase no tiene hora." });
    return {
      clase: n,
      inicio: iso(start),
      video: yt?.video_id ?? null,
      curva: samples.map((x) => ({ t: iso(x[0]), conectados: x[1] })),
      pico: metric(peak, "YouTube", ytUpd, yt ? {} : { note: "Sin video de YouTube asignado a esta clase." }),
      alFinal: metric(last ? last[1] : null, "YouTube", ytUpd),
      likes: metric(lastStats ? lastStats[2] : null, "YouTube", ytUpd),
      comentarios: metric(lastStats ? lastStats[3] : null, "YouTube", ytUpd),
      registradosAlInicio: regsAtStart,
      showUp: metric(showUp(peak, regsAtStart.value), "YouTube + GHL", oldest(ytUpd, regsAtStart.updatedAt), { estimated: regsAtStart.estimated }),
    };
  });

  // Ventas por hora desde la apertura del carrito (hora local del lanzamiento).
  const open = milestoneMs(d, "cart_open");
  const porHora: Array<{ hora: string; ventas: number; acumulado: number }> = [];
  if (open !== null && d.sales && d.now >= open) {
    const counts = new Map<number, number>();
    for (const e of d.sales) {
      if (e.type !== "orden.pagada" || e.isTest) continue;
      const t = Date.parse(e.occurredAt);
      if (t < open) continue;
      const h = Math.floor((t - open) / 3_600_000);
      counts.set(h, (counts.get(h) ?? 0) + 1);
    }
    const hours = Math.min(24 * 14, Math.floor((d.now - open) / 3_600_000));
    let acc = 0;
    for (let h = 0; h <= hours; h++) {
      acc += counts.get(h) ?? 0;
      porHora.push({ hora: new Date(open + h * 3_600_000).toISOString(), ventas: counts.get(h) ?? 0, acumulado: acc });
    }
  }

  const maxPeak = Math.max(...clases.map((c) => c.pico.value ?? -1));
  const ns = s ? netSales(s.counts) : null;

  // Listas para Ventas: cuotas fallidas y checkouts no completados (sin datos personales; enlace a GHL).
  const link = (emailHash: string | null, ghl: string | null) => {
    const id = ghl ?? (emailHash ? d.salesContacts[emailHash] : undefined);
    return id && d.ghlLocation ? ghlContactUrl(d.ghlLocation, id) : null;
  };
  const failed = s
    ? s.failedOrders.map((orderId) => {
        const evs = d.sales!.filter((e) => e.orderId === orderId);
        const lastFail = evs.filter((e) => e.type === "cuota.fallida").at(-1)!;
        return { orden: orderId, cuando: lastFail.occurredAt, cuota: `${lastFail.installmentNumber} de ${lastFail.installmentsTotal}`, monto: lastFail.amountCents, pasarela: lastFail.gateway, motivo: lastFail.reason, ghl: link(lastFail.emailHash, lastFail.ghlContactId) };
      })
    : [];
  const abandoned = d.sales
    ? d.sales.filter((e) => e.type === "checkout.abandonado" && !e.isTest).slice(-100).reverse().map((e) => ({ orden: e.orderId, cuando: e.occurredAt, monto: e.amountCents, pasarela: e.gateway, ghl: link(e.emailHash, e.ghlContactId) }))
    : [];

  return {
    zona: d.launch.timezone,
    clases,
    carrito: { apertura: iso(open), deadlineBonos: iso(milestoneMs(d, "bonus_deadline")), cierre: iso(milestoneMs(d, "cart_close")) },
    ventasPorHora: metric(d.sales ? porHora : null, "Sistema de ventas", salesUpd, d.sales ? {} : { note: "Sistema de ventas sin conectar." }),
    mix: metric(s ? s.mix : null, "Sistema de ventas", salesUpd),
    ventasNetas: metric(ns, "Sistema de ventas", salesUpd),
    ventasPor100: metric(ns !== null && maxPeak > 0 ? (ns / maxPeak) * 100 : null, "Ventas + YouTube", oldest(salesUpd, ytUpd), {
      note: "Ventas netas por cada 100 conectados del pico más alto de las clases.",
    }),
    listas: { cuotasFallidas: metric(s ? failed : null, "Sistema de ventas", salesUpd), checkoutsNoCompletados: metric(d.sales ? abandoned : null, "Sistema de ventas", salesUpd) },
    comparacion: { disponible: false, note: "La comparación con lanzamientos anteriores llega en la fase 2 (importador)." },
    horaLocalApertura: open !== null ? L.hour(open) : null,
  };
}

// ───────────── Después (resumen financiero; liquidación y PDF en la fase 2) ─────────────
export function despues(d: Dataset) {
  const s = salesSummary(d);
  const spend = spendMetric(d);
  const regs = registrationsMetric(d);
  const upd = salesUpdated(d);
  if (!s) return { disponible: false, note: "Sistema de ventas sin conectar." };
  return {
    disponible: true,
    ventasNetas: metric(netSales(s.counts), "Sistema de ventas", upd),
    conteos: s.counts,
    cuotas: s.installments,
    bruto: metric(s.revenue.grossCollectedCents, "Sistema de ventas", upd),
    neto: metric(netRevenue(s.revenue), "Sistema de ventas", upd, { estimated: !s.feesComplete, note: s.feesComplete ? undefined : "Hay pagos sin comisión informada." }),
    comprometido: metric(committedRevenue(s.revenue), "Sistema de ventas", upd),
    cpa: metric(cpa(spend.value, s.counts), "Meta + ventas", oldest(spend.updatedAt, upd)),
    roas: metric(roas(s.revenue, spend.value), "Meta + ventas", oldest(spend.updatedAt, upd)),
    conversion: metric(conversion(s.counts, regs.value), "Ventas + GHL", oldest(upd, regs.updatedAt), { estimated: regs.estimated }),
  };
}
