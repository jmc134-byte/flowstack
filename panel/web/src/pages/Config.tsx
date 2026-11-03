import { useEffect, useState } from "react";
import { api, ApiError } from "../api";
import { Loading, Section, useData } from "../components/ui";
import { localParts } from "../../../src/lib/time";
import { localToUtcIso } from "../../../src/lib/tzfast";
import { MIAMI, time, tzName } from "../format";

interface Doc {
  id: string; brand_id: string; expert_id: string | null; edition: string; timezone: string;
  price_single_cents: number | null; installments_count: number | null; installment_cents: number | null;
  sales_goal: number | null; registrations_goal: number | null; ad_spend_cap_cents: number | null; expert_share_pct: number | null;
  company_label: string | null; status: string; notes: string | null;
  milestones: Array<{ kind: string; starts_at: string | null; label: string | null }>;
  deductions: Array<{ concept: string; amount_cents: number | null; source: string | null }>;
  sources: Array<{ source: string; ref_kind: string; ref_value: string; extra: string | null }>;
  alert_rules: Array<{ kind: string; threshold: number | null }>;
}
interface Catalog { marcas: Array<{ id: string; name: string }>; expertos: Array<{ id: string; name: string }>; hitos: string[]; fuentes: Record<string, string[]>; alertas: string[] }

const TZS = ["America/Chicago", "America/New_York", "America/Denver", "America/Los_Angeles", "America/Mexico_City", "America/Bogota", "America/Caracas", "America/Argentina/Buenos_Aires", "Europe/Madrid"];
const HITO: Record<string, string> = { capture_start: "Inicio de captación", ig_live: "Live de IG", class_1: "Clase 1", class_2: "Clase 2", class_3: "Clase 3", cart_open: "Apertura de carrito", bonus_deadline: "Deadline de bonos", closing_live: "Live de cierre", cart_close: "Cierre" };
const STATUS: Record<string, string> = { planned: "Planificado", active: "Activo", closed: "Cerrado", historical: "Histórico" };
const REF: Record<string, string> = {
  ad_account: "Cuenta publicitaria (act_…)", campaign: "Campaña (ID)", location: "Subcuenta (locationId)", tag_registration: "Etiqueta de registro", tag_purchase: "Etiqueta de compra",
  tag_interest: "Etiqueta interesado sin pago", landing_field: "Campo oculto de variante", stripe_account: "Cuenta de Stripe (alias)", stripe_product: "Producto de Stripe", stripe_price: "Precio de Stripe",
  sistema: "Sistema de ventas (alias)", producto: "Producto en el sistema de ventas", youtube_video: "Video de YouTube (ID)", landing: "Landing (dominio/ruta)",
};
const ALERT: Record<string, [string, string]> = {
  cpl_high: ["CPL pagado alto", "USD"], spend_80: ["Gasto al % del tope (aviso)", "%"], spend_100: ["Gasto al % del tope (tope)", "%"],
  hours_without_registrations: ["Horas sin registros en captación", "horas"], payment_failed: ["Órdenes con cuota fallida", "órdenes"],
  dispute_new: ["Contracargos nuevos en 24 h", "contracargos"], email_bounces: ["Rebotes de correo", "%"], source_stale: ["Fuente sin datos", "horas"],
};

const toLocalInput = (iso: string | null, tz: string) => {
  if (!iso) return "";
  const p = localParts(new Date(iso), tz);
  const z = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${z(p.month)}-${z(p.day)}T${z(p.hour)}:${z(p.minute)}`;
};
const dollars = (c: number | null) => (c === null || c === undefined ? "" : String(c / 100));
const cents = (v: string) => (v.trim() === "" ? null : Math.round(Number(v) * 100));
const intOrNull = (v: string) => (v.trim() === "" ? null : Math.round(Number(v)));

export function Config({ launchId, onSaved }: { launchId: string | null; onSaved: (id: string) => void }) {
  const cat = useData<Catalog>(`/api/v1/lanzamientos/catalogo`, 600_000);
  const [doc, setDoc] = useState<Doc | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setErrors([]); setSaved(false);
    if (!launchId) {
      setDoc({ id: "", brand_id: "", expert_id: null, edition: "", timezone: "America/Chicago", price_single_cents: null, installments_count: null, installment_cents: null, sales_goal: null, registrations_goal: null, ad_spend_cap_cents: null, expert_share_pct: null, company_label: null, status: "planned", notes: null,
        milestones: ["capture_start", "class_1", "class_2", "class_3", "cart_open", "bonus_deadline", "closing_live", "cart_close"].map((k) => ({ kind: k, starts_at: null, label: null })), deductions: [], sources: [],
        alert_rules: Object.keys(ALERT).map((k) => ({ kind: k, threshold: null })) });
      return;
    }
    api.get<{ lanzamiento: Doc }>(`/api/v1/lanzamientos/${launchId}`).then((r) => setDoc(r.lanzamiento)).catch((e) => setErrors([String(e.message ?? e)]));
  }, [launchId]);

  if (!doc || !cat.data) return <Loading error={cat.error ?? (errors[0] || null)} />;
  const c = cat.data;
  const set = (patch: Partial<Doc>) => { setDoc({ ...doc, ...patch }); setSaved(false); };
  const tz = doc.timezone;

  const save = async () => {
    setErrors([]);
    try {
      const r = await api.put<{ lanzamiento: Doc }>(`/api/v1/lanzamientos/${doc.id}`, doc);
      setDoc(r.lanzamiento); setSaved(true); onSaved(doc.id);
    } catch (e) {
      setErrors(e instanceof ApiError && e.errores ? e.errores : [String((e as Error).message)]);
    }
  };
  const addCatalog = async (tipo: "marca" | "experto") => {
    const nombre = prompt(tipo === "marca" ? "Nombre de la marca" : "Nombre del experto");
    if (!nombre) return;
    const r = await api.post<{ id: string }>(`/api/v1/lanzamientos/catalogo/${tipo}`, { nombre });
    await cat.reload();
    set(tipo === "marca" ? { brand_id: r.id } : { expert_id: r.id });
  };

  return (
    <>
      <Section title={launchId ? "Datos del lanzamiento" : "Nuevo lanzamiento"}>
        <div className="card form-grid">
          {!launchId && <label className="f">ID (minúsculas y guiones)<input value={doc.id} onChange={(e) => set({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="tm3" /></label>}
          <label className="f">Marca
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <select value={doc.brand_id} onChange={(e) => set({ brand_id: e.target.value })}><option value="">Elegir…</option>{c.marcas.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
              <button className="btn" onClick={() => addCatalog("marca")}>+</button>
            </div>
          </label>
          <label className="f">Experto
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <select value={doc.expert_id ?? ""} onChange={(e) => set({ expert_id: e.target.value || null })}><option value="">—</option>{c.expertos.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
              <button className="btn" onClick={() => addCatalog("experto")}>+</button>
            </div>
          </label>
          <label className="f">Edición<input value={doc.edition} onChange={(e) => set({ edition: e.target.value })} /></label>
          <label className="f">Zona horaria del lanzamiento
            <select value={tz} onChange={(e) => set({ timezone: e.target.value })}>{(TZS.includes(tz) ? TZS : [tz, ...TZS]).map((t) => <option key={t} value={t}>{tzName(t)} ({t})</option>)}</select>
          </label>
          <label className="f">Estado<select value={doc.status} onChange={(e) => set({ status: e.target.value })}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label className="f">Precio pago único (USD)<input inputMode="decimal" value={dollars(doc.price_single_cents)} onChange={(e) => set({ price_single_cents: cents(e.target.value) })} /></label>
          <label className="f">Número de cuotas<input inputMode="numeric" value={doc.installments_count ?? ""} onChange={(e) => set({ installments_count: intOrNull(e.target.value) })} placeholder="por definir" /></label>
          <label className="f">Monto de cada cuota (USD)<input inputMode="decimal" value={dollars(doc.installment_cents)} onChange={(e) => set({ installment_cents: cents(e.target.value) })} placeholder="por definir" /></label>
          <label className="f">Meta de ventas<input inputMode="numeric" value={doc.sales_goal ?? ""} onChange={(e) => set({ sales_goal: intOrNull(e.target.value) })} /></label>
          <label className="f">Meta de registrados<input inputMode="numeric" value={doc.registrations_goal ?? ""} onChange={(e) => set({ registrations_goal: intOrNull(e.target.value) })} /></label>
          <label className="f">Tope de pauta (USD)<input inputMode="decimal" value={dollars(doc.ad_spend_cap_cents)} onChange={(e) => set({ ad_spend_cap_cents: cents(e.target.value) })} /></label>
          <label className="f">Reparto del experto (%)<input inputMode="decimal" value={doc.expert_share_pct ?? ""} onChange={(e) => set({ expert_share_pct: e.target.value === "" ? null : Number(e.target.value) })} /></label>
          <label className="f">Quién recibe el resto<input value={doc.company_label ?? ""} onChange={(e) => set({ company_label: e.target.value || null })} /></label>
          <label className="f" style={{ gridColumn: "1 / -1" }}>Pendientes por definir<textarea value={doc.notes ?? ""} onChange={(e) => set({ notes: e.target.value || null })} /></label>
        </div>
      </Section>

      <Section title={`Hitos (hora de ${tzName(tz)})`} right={<button className="btn" onClick={() => set({ milestones: [...doc.milestones, { kind: "ig_live", starts_at: null, label: null }] })}>Agregar hito</button>}>
        <div className="list">
          {doc.milestones.map((m, i) => (
            <div key={i} className="card form-grid">
              <label className="f">Hito<select value={m.kind} onChange={(e) => { const ms = [...doc.milestones]; ms[i] = { ...m, kind: e.target.value }; set({ milestones: ms }); }}>{c.hitos.map((k) => <option key={k} value={k}>{HITO[k] ?? k}</option>)}</select></label>
              <label className="f">Fecha y hora ({tzName(tz)})
                <input type="datetime-local" value={toLocalInput(m.starts_at, tz)} onChange={(e) => { const ms = [...doc.milestones]; ms[i] = { ...m, starts_at: e.target.value ? localToUtcIso(e.target.value, tz) : null }; set({ milestones: ms }); }} />
              </label>
              <label className="f">Etiqueta<input value={m.label ?? ""} onChange={(e) => { const ms = [...doc.milestones]; ms[i] = { ...m, label: e.target.value || null }; set({ milestones: ms }); }} /></label>
              <div className="row">
                <span className="note">{m.starts_at ? `${time(m.starts_at, MIAMI)} Miami` : "Sin hora"}</span>
                <span className="spacer" />
                <button className="btn" onClick={() => set({ milestones: doc.milestones.filter((_, j) => j !== i) })}>Quitar</button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Gastos que se descuentan antes del reparto" right={<button className="btn" onClick={() => set({ deductions: [...doc.deductions, { concept: "", amount_cents: null, source: "manual" }] })}>Agregar gasto</button>}>
        <div className="list">
          {doc.deductions.map((d, i) => (
            <div key={i} className="card form-grid">
              <label className="f">Concepto<input value={d.concept} onChange={(e) => { const x = [...doc.deductions]; x[i] = { ...d, concept: e.target.value }; set({ deductions: x }); }} /></label>
              <label className="f">Origen<select value={d.source ?? "manual"} onChange={(e) => { const x = [...doc.deductions]; x[i] = { ...d, source: e.target.value, amount_cents: e.target.value === "meta_spend" ? null : d.amount_cents }; set({ deductions: x }); }}><option value="manual">Monto fijo</option><option value="meta_spend">Gasto real de Meta</option></select></label>
              {d.source !== "meta_spend" && <label className="f">Monto (USD)<input inputMode="decimal" value={dollars(d.amount_cents)} onChange={(e) => { const x = [...doc.deductions]; x[i] = { ...d, amount_cents: cents(e.target.value) }; set({ deductions: x }); }} /></label>}
              <div className="row"><span className="spacer" /><button className="btn" onClick={() => set({ deductions: doc.deductions.filter((_, j) => j !== i) })}>Quitar</button></div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Mapeo a las fuentes" right={<button className="btn" onClick={() => set({ sources: [...doc.sources, { source: "meta", ref_kind: "ad_account", ref_value: "", extra: null }] })}>Agregar</button>}>
        <div className="list">
          {doc.sources.map((s, i) => {
            const clase = s.source === "youtube" ? (() => { try { return JSON.parse(s.extra ?? "{}").clase ?? ""; } catch { return ""; } })() : null;
            const placeholder = (() => { try { return JSON.parse(s.extra ?? "{}").placeholder; } catch { return false; } })();
            return (
              <div key={i} className="card form-grid">
                <label className="f">Fuente<select value={s.source} onChange={(e) => { const x = [...doc.sources]; x[i] = { ...s, source: e.target.value, ref_kind: c.fuentes[e.target.value]![0]! }; set({ sources: x }); }}>{Object.keys(c.fuentes).map((k) => <option key={k} value={k}>{k === "ventas" ? "Sistema de ventas" : k === "ghl" ? "GHL" : k[0]!.toUpperCase() + k.slice(1)}</option>)}</select></label>
                <label className="f">Tipo<select value={s.ref_kind} onChange={(e) => { const x = [...doc.sources]; x[i] = { ...s, ref_kind: e.target.value }; set({ sources: x }); }}>{c.fuentes[s.source]!.map((k) => <option key={k} value={k}>{REF[k] ?? k}</option>)}</select></label>
                <label className="f">Valor{placeholder ? " (provisional, confirmar)" : ""}<input value={s.ref_value} onChange={(e) => { const x = [...doc.sources]; x[i] = { ...s, ref_value: e.target.value, extra: placeholder ? null : s.extra }; set({ sources: x }); }} /></label>
                {clase !== null && <label className="f">Clase<select value={clase} onChange={(e) => { const x = [...doc.sources]; x[i] = { ...s, extra: JSON.stringify({ clase: Number(e.target.value) }) }; set({ sources: x }); }}><option value="">—</option><option value="1">Clase 1</option><option value="2">Clase 2</option><option value="3">Clase 3</option></select></label>}
                <div className="row"><span className="spacer" /><button className="btn" onClick={() => set({ sources: doc.sources.filter((_, j) => j !== i) })}>Quitar</button></div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Umbrales de alertas">
        <div className="card form-grid">
          {Object.entries(ALERT).map(([k, [label, unit]]) => {
            const r = doc.alert_rules.find((a) => a.kind === k);
            const v = r?.threshold ?? null;
            const shown = v === null ? "" : unit === "USD" ? String(v / 100) : String(v);
            return (
              <label key={k} className="f">{label} ({unit})
                <input inputMode="decimal" value={shown} placeholder="desactivada" onChange={(e) => {
                  const raw = e.target.value.trim();
                  const val = raw === "" ? null : unit === "USD" ? Math.round(Number(raw) * 100) : Number(raw);
                  const rest = doc.alert_rules.filter((a) => a.kind !== k);
                  set({ alert_rules: val === null ? rest : [...rest, { kind: k, threshold: val }] });
                }} />
              </label>
            );
          })}
        </div>
      </Section>

      <div className="section" style={{ position: "sticky", bottom: 12 }}>
        <button className="btn primary big" onClick={save}>Guardar configuración</button>
        {saved && <p className="ok">Guardado.</p>}
        {errors.length > 0 && <ul className="error">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      </div>
    </>
  );
}
