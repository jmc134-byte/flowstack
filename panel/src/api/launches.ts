import { Hono } from "hono";
import type { Env } from "../env";
import type { AuthVars } from "../auth";

export const MILESTONE_KINDS = [
  "capture_start", "ig_live", "class_1", "class_2", "class_3", "cart_open", "bonus_deadline", "closing_live", "cart_close",
] as const;
export const SOURCE_KINDS: Record<string, string[]> = {
  meta: ["ad_account", "campaign"],
  ghl: ["location", "tag_registration", "tag_purchase", "tag_interest", "landing_field"],
  stripe: ["stripe_account", "stripe_product", "stripe_price"],
  ventas: ["sistema", "producto"],
  youtube: ["youtube_video"],
  landing: ["landing"],
};
export const ALERT_KINDS = [
  "cpl_high", "spend_80", "spend_100", "hours_without_registrations", "payment_failed", "dispute_new", "email_bounces", "source_stale",
] as const;
const STATUSES = ["planned", "active", "closed", "historical"];

export interface LaunchDoc {
  id: string;
  brand_id: string;
  expert_id: string | null;
  edition: string;
  timezone: string;
  price_single_cents: number | null;
  installments_count: number | null;
  installment_cents: number | null;
  sales_goal: number | null;
  registrations_goal: number | null;
  ad_spend_cap_cents: number | null;
  expert_share_pct: number | null;
  company_label: string | null;
  status: string;
  notes: string | null;
  milestones: Array<{ kind: string; starts_at: string | null; label: string | null }>;
  deductions: Array<{ concept: string; amount_cents: number | null; source: string | null }>;
  sources: Array<{ source: string; ref_kind: string; ref_value: string; extra: string | null }>;
  alert_rules: Array<{ kind: string; threshold: number | null }>;
}

export async function loadLaunch(db: D1Database, id: string): Promise<LaunchDoc | null> {
  const l = await db.prepare(`SELECT * FROM launches WHERE id=?1`).bind(id).first<any>();
  if (!l) return null;
  const [m, d, s, a] = await db.batch([
    db.prepare(`SELECT kind, starts_at, label FROM launch_milestones WHERE launch_id=?1 ORDER BY COALESCE(starts_at,'9999'), id`).bind(id),
    db.prepare(`SELECT concept, amount_cents, source FROM launch_deductions WHERE launch_id=?1 ORDER BY id`).bind(id),
    db.prepare(`SELECT source, ref_kind, ref_value, extra FROM launch_sources WHERE launch_id=?1 ORDER BY id`).bind(id),
    db.prepare(`SELECT kind, threshold FROM alert_rules WHERE launch_id=?1 ORDER BY id`).bind(id),
  ]);
  return {
    id: l.id, brand_id: l.brand_id, expert_id: l.expert_id, edition: l.edition, timezone: l.timezone,
    price_single_cents: l.price_single_cents, installments_count: l.installments_count, installment_cents: l.installment_cents,
    sales_goal: l.sales_goal, registrations_goal: l.registrations_goal, ad_spend_cap_cents: l.ad_spend_cap_cents,
    expert_share_pct: l.expert_share_pct, company_label: l.company_label, status: l.status, notes: l.notes,
    milestones: (m!.results as any[]), deductions: (d!.results as any[]), sources: (s!.results as any[]), alert_rules: (a!.results as any[]),
  };
}

const isInt = (v: unknown) => v === null || (typeof v === "number" && Number.isInteger(v) && v >= 0);
const isNum = (v: unknown) => v === null || (typeof v === "number" && Number.isFinite(v));
const isIso = (v: unknown) => v === null || (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{3})?)?Z$/.test(v));
function validTz(tz: unknown) {
  if (typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function validateLaunch(doc: any): string[] {
  const e: string[] = [];
  if (!doc || typeof doc !== "object") return ["documento inválido"];
  if (typeof doc.id !== "string" || !/^[a-z0-9-]{2,40}$/.test(doc.id)) e.push("id: minúsculas, números y guiones");
  if (typeof doc.brand_id !== "string" || !doc.brand_id) e.push("marca requerida");
  if (typeof doc.edition !== "string" || !doc.edition.trim()) e.push("edición requerida");
  if (!validTz(doc.timezone)) e.push("zona horaria inválida (formato IANA, ej. America/Chicago)");
  if (!STATUSES.includes(doc.status)) e.push("estado inválido");
  for (const k of ["price_single_cents", "installments_count", "installment_cents", "sales_goal", "registrations_goal", "ad_spend_cap_cents"])
    if (!isInt(doc[k] ?? null)) e.push(`${k}: entero ≥ 0 o vacío`);
  if (!isNum(doc.expert_share_pct ?? null) || (doc.expert_share_pct ?? 0) < 0 || (doc.expert_share_pct ?? 0) > 100) e.push("reparto del experto: 0–100 %");
  for (const m of doc.milestones ?? []) {
    if (!MILESTONE_KINDS.includes(m.kind)) e.push(`hito desconocido: ${m.kind}`);
    if (!isIso(m.starts_at ?? null)) e.push(`hora del hito ${m.kind}: ISO UTC`);
  }
  for (const d of doc.deductions ?? []) {
    if (typeof d.concept !== "string" || !d.concept.trim()) e.push("gasto sin concepto");
    if (!isInt(d.amount_cents ?? null)) e.push(`monto de ${d.concept}: entero ≥ 0`);
  }
  for (const s of doc.sources ?? []) {
    if (!SOURCE_KINDS[s.source]?.includes(s.ref_kind)) e.push(`fuente inválida: ${s.source}/${s.ref_kind}`);
    if (typeof s.ref_value !== "string" || !s.ref_value.trim()) e.push(`valor vacío en ${s.source}/${s.ref_kind}`);
  }
  for (const a of doc.alert_rules ?? []) {
    if (!ALERT_KINDS.includes(a.kind)) e.push(`alerta desconocida: ${a.kind}`);
    if (!isNum(a.threshold ?? null)) e.push(`umbral de ${a.kind}: número`);
  }
  return e;
}

export const launchRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

launchRoutes.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT l.id, l.edition, l.status, l.timezone, b.name brand, e.name expert,
       (SELECT MIN(starts_at) FROM launch_milestones m WHERE m.launch_id=l.id AND m.kind='class_1') class_1
     FROM launches l JOIN brands b ON b.id=l.brand_id LEFT JOIN experts e ON e.id=l.expert_id
     ORDER BY CASE l.status WHEN 'active' THEN 0 WHEN 'planned' THEN 1 ELSE 2 END, l.created_at DESC`,
  ).all();
  return c.json({ ok: true, lanzamientos: results });
});

launchRoutes.get("/catalogo", async (c) => {
  const [b, e] = await c.env.DB.batch([
    c.env.DB.prepare(`SELECT id, name FROM brands ORDER BY name`),
    c.env.DB.prepare(`SELECT id, name FROM experts ORDER BY name`),
  ]);
  return c.json({ ok: true, marcas: b!.results, expertos: e!.results, hitos: MILESTONE_KINDS, fuentes: SOURCE_KINDS, alertas: ALERT_KINDS });
});

launchRoutes.post("/catalogo/:tipo", async (c) => {
  const tipo = c.req.param("tipo");
  const table = tipo === "marca" ? "brands" : tipo === "experto" ? "experts" : null;
  const { nombre } = await c.req.json<{ nombre?: string }>();
  if (!table || !nombre?.trim()) return c.json({ ok: false, error: "datos inválidos" }, 400);
  const id = nombre.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  await c.env.DB.prepare(`INSERT OR IGNORE INTO ${table} (id, name) VALUES (?1, ?2)`).bind(id, nombre.trim()).run();
  return c.json({ ok: true, id });
});

launchRoutes.get("/:id", async (c) => {
  const doc = await loadLaunch(c.env.DB, c.req.param("id"));
  return doc ? c.json({ ok: true, lanzamiento: doc }) : c.json({ ok: false, error: "no existe" }, 404);
});

/** Crea o reemplaza la configuración completa de un lanzamiento (en una sola transacción). */
launchRoutes.put("/:id", async (c) => {
  const doc = (await c.req.json()) as LaunchDoc;
  if (doc.id !== c.req.param("id")) return c.json({ ok: false, errores: ["el id no coincide"] }, 400);
  const errors = validateLaunch(doc);
  if (errors.length) return c.json({ ok: false, errores: errors }, 422);
  const db = c.env.DB;
  const id = doc.id;
  const stmts = [
    db.prepare(
      `INSERT INTO launches (id, brand_id, expert_id, edition, timezone, price_single_cents, installments_count, installment_cents,
         sales_goal, registrations_goal, ad_spend_cap_cents, expert_share_pct, status, notes, company_label)
       VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
       ON CONFLICT(id) DO UPDATE SET brand_id=?2, expert_id=?3, edition=?4, timezone=?5, price_single_cents=?6, installments_count=?7,
         installment_cents=?8, sales_goal=?9, registrations_goal=?10, ad_spend_cap_cents=?11, expert_share_pct=?12, status=?13, notes=?14, company_label=?15`,
    ).bind(id, doc.brand_id, doc.expert_id ?? null, doc.edition.trim(), doc.timezone, doc.price_single_cents ?? null, doc.installments_count ?? null,
      doc.installment_cents ?? null, doc.sales_goal ?? null, doc.registrations_goal ?? null, doc.ad_spend_cap_cents ?? null,
      doc.expert_share_pct ?? null, doc.status, doc.notes ?? null, doc.company_label ?? null),
    db.prepare(`DELETE FROM launch_milestones WHERE launch_id=?1`).bind(id),
    db.prepare(`DELETE FROM launch_deductions WHERE launch_id=?1`).bind(id),
    db.prepare(`DELETE FROM launch_sources WHERE launch_id=?1`).bind(id),
    db.prepare(`DELETE FROM alert_rules WHERE launch_id=?1`).bind(id),
    ...(doc.milestones ?? []).map((m) => db.prepare(`INSERT INTO launch_milestones (launch_id, kind, starts_at, label) VALUES (?1,?2,?3,?4)`).bind(id, m.kind, m.starts_at ?? null, m.label ?? null)),
    ...(doc.deductions ?? []).map((d) => db.prepare(`INSERT INTO launch_deductions (launch_id, concept, amount_cents, source) VALUES (?1,?2,?3,?4)`).bind(id, d.concept.trim(), d.amount_cents ?? null, d.source ?? "manual")),
    ...(doc.sources ?? []).map((s) => db.prepare(`INSERT INTO launch_sources (launch_id, source, ref_kind, ref_value, extra) VALUES (?1,?2,?3,?4,?5)`).bind(id, s.source, s.ref_kind, s.ref_value.trim(), s.extra ?? null)),
    ...(doc.alert_rules ?? []).map((a) => db.prepare(`INSERT INTO alert_rules (launch_id, kind, threshold) VALUES (?1,?2,?3)`).bind(id, a.kind, a.threshold ?? null)),
  ];
  await db.batch(stmts);
  return c.json({ ok: true, lanzamiento: await loadLaunch(db, id) });
});
