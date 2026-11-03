import type { Metric } from "../api";
import { AlertCard, Countdown, Loading, Section, Stat, useData, type AlertT } from "../components/ui";
import { ago, int, usd, usd2 } from "../format";

interface Data {
  datos: {
    lanzamiento: { id: string; edicion: string; zona: string; notas: string | null };
    fase: { key: string; label: string };
    hitos: { next: { kind: string; label: string; at: string } | null; undated: string[] };
    gasto: Metric; tope: number | null; registrados: Metric; cplPagado: Metric; cplTotal: Metric;
    ventasNetas: Metric; ingresoComprometido: Metric;
    hoy: { registrados: Metric; registradosAyerMismoCorte: Metric; ventas: Metric };
    alertas: AlertT[];
    fuentes: Array<{ id: string; status: string; last_data_at: string | null; last_error: string | null }>;
  };
}

const STATUS: Record<string, string> = { ok: "Funcionando", error: "Con errores", sin_credenciales: "Sin credenciales", unknown: "Sin datos todavía" };
const DOT: Record<string, string> = { ok: "var(--good)", error: "var(--critical)", sin_credenciales: "var(--warning)", unknown: "var(--text-muted)" };

export function Resumen({ launchId }: { launchId: string }) {
  const { data, error, reload } = useData<Data>(`/api/v1/pantallas/${launchId}/resumen`);
  if (!data) return <Loading error={error} retry={reload} />;
  const d = data.datos;
  const tz = d.lanzamiento.zona;
  const spendPct = d.tope && d.gasto.value !== null ? d.gasto.value / d.tope : null;
  return (
    <>
      <div className="grid">
        <Countdown label={d.hitos.next ? `Próximo hito: ${d.hitos.next.label}` : "Próximo hito"} at={d.hitos.next?.at ?? null} tz={tz} />
        <Stat label="Gasto contra tope" m={d.gasto} format={(v) => usd(v)} sub={d.tope ? `de ${usd(d.tope)}${spendPct !== null ? ` · ${(spendPct * 100).toFixed(0)} %` : ""}` : "Sin tope configurado"}>
          {spendPct !== null && <div className="bar" aria-hidden><i style={{ width: `${Math.min(100, spendPct * 100)}%`, background: spendPct >= 1 ? "var(--critical)" : spendPct >= 0.8 ? "var(--warning)" : undefined }} /></div>}
        </Stat>
        <Stat label="Registrados" m={d.registrados} format={int} />
        <Stat label="CPL pagado" m={d.cplPagado} format={(v) => usd2(v)} sub="Gasto de Meta / registrados de Meta" />
        <Stat label="CPL total" m={d.cplTotal} format={(v) => usd2(v)} sub="Gasto / registrados totales" />
        <Stat label="Ventas netas" m={d.ventasNetas} format={int} />
        <Stat label="Ingreso comprometido" m={d.ingresoComprometido} format={(v) => usd(v)} sub="Incluye cuotas por cobrar" />
      </div>

      <Section title="Hoy (solo lo nuevo)">
        <div className="grid">
          <Stat label="Registrados hoy" m={d.hoy.registrados} format={int}
            sub={d.hoy.registradosAyerMismoCorte.value !== null ? `Ayer a esta misma hora: ${int(d.hoy.registradosAyerMismoCorte.value)}` : undefined} />
          <Stat label="Ventas hoy" m={d.hoy.ventas} format={int} />
        </div>
        <p className="note">El día en curso es parcial: se compara solo contra la misma hora de días anteriores. La lectura válida es al cierre del día.</p>
      </Section>

      <Section title={`Alertas (${d.alertas.length})`}>
        {d.alertas.length ? <div className="list">{d.alertas.map((a, i) => <AlertCard key={i} a={a} />)}</div> : <p className="ok">Sin alertas activas.</p>}
      </Section>

      <Section title="Actualización de cada fuente">
        <div className="card list">
          {d.fuentes.map((f) => (
            <div key={f.id} className="row" style={{ justifyContent: "space-between" }}>
              <span><span className="status-dot" style={{ background: DOT[f.status] ?? DOT.unknown }} />{f.id}</span>
              <span className="muted">{STATUS[f.status] ?? f.status} · {ago(f.last_data_at)}</span>
            </div>
          ))}
        </div>
      </Section>

      {(d.hitos.undated.length > 0 || d.lanzamiento.notas) && (
        <Section title="Por definir">
          <div className="card">
            {d.hitos.undated.length > 0 && <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>{d.hitos.undated.map((u) => <li key={u}>{u}</li>)}</ul>}
            {d.lanzamiento.notas && <p className="note" style={{ margin: 0 }}>{d.lanzamiento.notas}</p>}
          </div>
        </Section>
      )}
    </>
  );
}
