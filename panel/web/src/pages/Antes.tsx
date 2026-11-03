import { useState } from "react";
import type { Metric } from "../api";
import { BarChart, HBars, LineChart } from "../components/charts";
import { Loading, Prov, Section, Stat, useData } from "../components/ui";
import { dayKey, dayTime, int, pct, usd, usd2 } from "../format";

interface Row { dia: string; parcial: boolean; registrados: number | null; registradosMeta: number | null; estimados: number; acumulado: number | null; alCorte: number | null; gasto: number | null; gastoAcumulado: number | null; leadsMeta: number | null; cplPagado: number | null; cplTotal: number | null }
interface Group { campanas: Array<{ id: string; nombre: string | null; gasto: number; impresiones: number; clics: number; leads: number; cpm: number | null; ctr: number | null }>; anuncios: Array<{ id: string; nombre: string | null; campana: string | null; gasto: number; impresiones: number; clics: number; clicsEnlace: number; leads: number; cpm: number | null; ctr: number | null }> }
interface Data {
  datos: {
    zona: string; zonaMeta: string | null; meta: { registrados: number | null }; hoy: string; corteMinutos: number; serie: Row[];
    fuentes: { registrados: Metric; gasto: Metric };
    pauta: { total: Group; desdeUltimoCambio: Group | null; ultimoCambio: string | null };
    ritmo: Metric; promedioDiario: number | null; tope: number | null;
    variantes: Array<{ variante: string; total: number; meta: number }>;
    whatsapp: Metric<Array<{ at: string; miembros: number }>>;
  };
}

const x = (k: string) => Date.parse(`${k}T12:00:00Z`);
const hhmm = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; const h12 = h % 12 || 12; return `${h12}:${String(mm).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; };

export function Antes({ launchId }: { launchId: string }) {
  const { data, error, reload } = useData<Data>(`/api/v1/pantallas/${launchId}/antes`);
  const [scope, setScope] = useState<"cambio" | "total">("cambio");
  if (!data) return <Loading error={error} retry={reload} />;
  const d = data.datos;
  const s = d.serie;
  const fmtDay = (v: number) => dayKey(new Date(v).toISOString().slice(0, 10));
  const g = scope === "cambio" && d.pauta.desdeUltimoCambio ? d.pauta.desdeUltimoCambio : d.pauta.total;
  const today = s.find((r) => r.parcial);
  const prev = s.filter((r) => !r.parcial).slice(-7);
  const prevAvgAtCut = prev.length && prev.every((r) => r.alCorte !== null) ? prev.reduce((a, r) => a + (r.alCorte ?? 0), 0) / prev.length : null;

  return (
    <>
      <div className="grid">
        <Stat label="Registrados" m={d.fuentes.registrados} format={int} sub={d.meta.registrados ? `Meta: ${int(d.meta.registrados)}` : "Sin meta de registrados"} />
        <Stat label="Gasto" m={d.fuentes.gasto} format={(v) => usd(v)} sub={d.tope ? `Tope ${usd(d.tope)}` : undefined} />
        <Stat label="Proyección de gasto al cierre" m={d.ritmo} format={(v) => usd(v)}
          sub={d.tope && d.ritmo.value !== null ? (d.ritmo.value > d.tope ? `Supera el tope por ${usd(d.ritmo.value - d.tope)}` : `Queda ${usd(d.tope - d.ritmo.value)} bajo el tope`) : d.promedioDiario !== null ? `Promedio diario ${usd(d.promedioDiario)}` : undefined} />
        {today && (
          <div className="card stat">
            <div className="label">Hoy hasta las {hhmm(d.corteMinutos)}</div>
            <div className="value">{int(today.alCorte)}</div>
            <div className="sub">{prevAvgAtCut !== null ? `Promedio de los 7 días anteriores a esta misma hora: ${prevAvgAtCut.toFixed(1)}` : "Sin días anteriores para comparar"}</div>
            <Prov m={{ ...d.fuentes.registrados, partial: true }} />
          </div>
        )}
      </div>

      <Section title="Registrados por día">
        <div className="card">
          <BarChart bars={s.map((r) => ({ label: dayKey(r.dia), value: r.registrados, partial: r.parcial, detail: r.estimados ? `${r.estimados} con hora estimada` : undefined }))} yFormat={(v) => int(v)} />
          <Prov m={d.fuentes.registrados} />
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <LineChart title="Acumulado contra meta" xFormat={fmtDay} yFormat={(v) => int(v)}
            series={[{ name: "Registrados acumulados", color: "var(--series-1)", points: s.map((r) => ({ x: x(r.dia), y: r.acumulado })) }]}
            refLines={d.meta.registrados ? [{ y: d.meta.registrados, label: `Meta ${int(d.meta.registrados)}` }] : []} />
        </div>
      </Section>

      <Section title="CPL por día">
        <div className="card">
          <LineChart xFormat={fmtDay} yFormat={(v) => usd(v)}
            series={[
              { name: "CPL pagado", color: "var(--series-1)", points: s.map((r) => ({ x: x(r.dia), y: r.cplPagado })) },
              { name: "CPL total", color: "var(--series-2)", points: s.map((r) => ({ x: x(r.dia), y: r.cplTotal })) },
            ]} />
          <p className="note">El último día es parcial. {d.zonaMeta && d.zonaMeta !== d.zona ? `Los días de Meta están en la zona de la cuenta publicitaria (${d.zonaMeta}).` : ""}</p>
        </div>
      </Section>

      <Section title="Pauta por campaña y anuncio" right={
        <div className="seg" role="group" aria-label="Rango">
          <button aria-pressed={scope === "cambio"} onClick={() => setScope("cambio")} disabled={!d.pauta.desdeUltimoCambio}>Desde el último cambio</button>
          <button aria-pressed={scope === "total"} onClick={() => setScope("total")}>Todo el lanzamiento</button>
        </div>
      }>
        <p className="note">{d.pauta.ultimoCambio ? `Último cambio en las campañas: ${dayTime(d.pauta.ultimoCambio, d.zona)} (se cuenta desde ese día).` : "Aún no hay cambios registrados en el registro de actividad de Meta."}</p>
        <div className="grid wide">
          <div className="card"><h3>Gasto por campaña</h3><HBars rows={g.campanas.map((c) => ({ label: c.nombre ?? c.id, value: c.gasto, sub: `${int(c.leads)} leads de Meta · CPM ${usd2(c.cpm)} · CTR ${pct(c.ctr, 2)}` }))} format={(v) => usd(v)} /><Prov m={d.fuentes.gasto} /></div>
          <div className="card">
            <h3>Anuncios</h3>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Anuncio</th><th className="num">Gasto</th><th className="num">CPM</th><th className="num">CTR</th><th className="num">Clics</th><th className="num">Leads</th><th className="num">CPL Meta</th></tr></thead>
                <tbody>{g.anuncios.map((a) => (
                  <tr key={a.id}><td title={a.campana ?? ""}>{a.nombre ?? a.id}</td><td className="num">{usd(a.gasto)}</td><td className="num">{usd2(a.cpm)}</td><td className="num">{pct(a.ctr, 2)}</td><td className="num">{int(a.clicsEnlace || a.clics)}</td><td className="num">{int(a.leads)}</td><td className="num">{a.leads ? usd2(a.gasto / a.leads) : "—"}</td></tr>
                ))}</tbody>
              </table>
            </div>
            {!g.anuncios.length && <p className="note">Sin datos de Meta todavía.</p>}
          </div>
        </div>
      </Section>

      <Section title="Ritmo de gasto">
        <div className="card">
          <LineChart xFormat={fmtDay} yFormat={(v) => usd(v)}
            series={[{ name: "Gasto acumulado", color: "var(--series-1)", points: s.map((r) => ({ x: x(r.dia), y: r.gastoAcumulado })) }]}
            refLines={[...(d.tope ? [{ y: d.tope, label: `Tope ${usd(d.tope)}` }] : []), ...(d.ritmo.value !== null ? [{ y: d.ritmo.value, label: `Proyección (estimada) ${usd(d.ritmo.value)}` }] : [])]} />
          <Prov m={d.ritmo} />
        </div>
      </Section>

      <Section title="Registrados en GHL contra leads de Meta">
        <div className="card">
          <LineChart xFormat={fmtDay} yFormat={(v) => int(v)}
            series={[
              { name: "Registrados de Meta (GHL)", color: "var(--series-1)", points: s.map((r) => ({ x: x(r.dia), y: r.registradosMeta })) },
              { name: "Leads reportados por Meta", color: "var(--series-2)", points: s.map((r) => ({ x: x(r.dia), y: r.leadsMeta })) },
            ]} />
          <p className="note">La diferencia indica leads que Meta atribuye y que no llegaron a GHL con UTM de Meta (o al revés).</p>
        </div>
      </Section>

      <Section title="Resultados por variante de landing">
        <div className="card"><HBars rows={d.variantes.map((v) => ({ label: v.variante, value: v.total, sub: `${int(v.meta)} desde Meta` }))} format={int} /><Prov m={d.fuentes.registrados} /></div>
      </Section>

      <Section title="Comunidad de WhatsApp">
        <div className="card">
          <LineChart xFormat={(v) => dayTime(new Date(v).toISOString(), d.zona)} yFormat={(v) => int(v)}
            series={[{ name: "Miembros", color: "var(--series-3)", points: (d.whatsapp.value ?? []).map((w) => ({ x: Date.parse(w.at), y: w.miembros })) }]} />
          <Prov m={d.whatsapp} />
        </div>
      </Section>
    </>
  );
}
