import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, type Metric } from "../api";
import { ago, dayTime, MIAMI, time, day, tzName } from "../format";

/** Carga datos y los refresca cada minuto y al volver a la app. */
export function useData<T>(path: string | null, everyMs = 60_000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      setData(await api.get<T>(path));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    setData(null);
    load();
    const id = setInterval(load, everyMs);
    const vis = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", vis); };
  }, [load, everyMs]);
  return { data, error, loading, reload: load };
}

/** Procedencia de cada número: fuente y hora de actualización. */
export function Prov({ m }: { m: Pick<Metric<unknown>, "source" | "updatedAt" | "partial" | "estimated" | "note"> }) {
  return (
    <div className="prov">
      {m.source} · {m.updatedAt ? `actualizado ${ago(m.updatedAt)}` : "sin datos"}
      {(m.estimated || m.partial) && (
        <> {" "}<span className="chips">{m.partial && <span className="chip part">Parcial</span>}{m.estimated && <span className="chip est">Estimado</span>}</span></>
      )}
      {m.note ? <div className="note">{m.note}</div> : null}
    </div>
  );
}

export function Stat({ label, m, format, sub, children }: { label: string; m: Metric<any>; format: (v: any) => string; sub?: ReactNode; children?: ReactNode }) {
  const none = m.value === null || m.value === undefined;
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className={`value${none ? " none" : ""}`}>{none ? "Sin datos" : format(m.value)}</div>
      {sub ? <div className="sub">{sub}</div> : null}
      {children}
      <Prov m={m} />
    </div>
  );
}

const ICONS: Record<string, string> = { "trend-up": "📈", stop: "⛔", gauge: "⏱️", clock: "⏰", card: "💳", shield: "🛡️", plug: "🔌", mail: "✉️" };
const LEVEL: Record<string, string> = { critical: "Crítica", serious: "Importante", warning: "Atención" };

export interface AlertT { kind: string; level: "critical" | "serious" | "warning"; icon: string; title: string; dato: string; umbral: string; accion: string }

export function AlertCard({ a }: { a: AlertT }) {
  return (
    <div className={`alert ${a.level}`} role="status">
      <div className="ico" aria-hidden>{ICONS[a.icon] ?? "⚠️"}</div>
      <div className="t">{a.title}<span className="level">{LEVEL[a.level]}</span></div>
      <div className="d">Dato: <b>{a.dato}</b> · Umbral: {a.umbral}</div>
      <div className="a">Hoy: {a.accion}</div>
    </div>
  );
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(id); }, [ms]);
  return now;
}

/** Cuenta regresiva con la hora del lanzamiento y la de Miami al lado. */
export function Countdown({ label, at, tz }: { label: string; at: string | null; tz: string }) {
  const now = useNow();
  if (!at) return <div className="card"><div className="label muted">{label}</div><div className="count" style={{ fontSize: 20 }}>Por definir</div></div>;
  const diff = Date.parse(at) - now;
  const past = diff <= 0;
  const abs = Math.abs(diff);
  const d = Math.floor(abs / 86_400_000), h = Math.floor((abs % 86_400_000) / 3_600_000), m = Math.floor((abs % 3_600_000) / 60_000), s = Math.floor((abs % 60_000) / 1000);
  const txt = d > 0 ? `${d} d ${h} h ${m} min` : `${h} h ${String(m).padStart(2, "0")} min ${String(s).padStart(2, "0")} s`;
  return (
    <div className="card">
      <div className="muted" style={{ fontSize: 15 }}>{label}</div>
      <div className="count">{past ? `Hace ${txt}` : txt}</div>
      <div className="count-sub">{day(at, tz)} · {time(at, tz)} {tzName(tz)}{tz !== MIAMI ? ` · ${time(at, MIAMI)} Miami` : ""}</div>
    </div>
  );
}

export function Loading({ error, retry }: { error?: string | null; retry?: () => void }) {
  if (error) return <div className="card"><p className="error">No se pudo cargar: {error}</p>{retry && <button className="btn" onClick={retry}>Reintentar</button>}</div>;
  return <p className="muted">Cargando…</p>;
}

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="section">
      <div className="row" style={{ marginBottom: 8 }}><h2 style={{ margin: 0 }}>{title}</h2><span className="spacer" />{right}</div>
      {children}
    </section>
  );
}

export { dayTime };
