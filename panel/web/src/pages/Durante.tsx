import type { Metric } from "../api";
import { BarChart, LineChart } from "../components/charts";
import { Countdown, Loading, Prov, Section, Stat, useData } from "../components/ui";
import { dayTime, int, MIAMI, pct, time, tzName, usd, usd2 } from "../format";

interface Clase {
  clase: number; inicio: string | null; video: string | null; curva: Array<{ t: string; conectados: number | null }>;
  pico: Metric; alFinal: Metric; likes: Metric; comentarios: Metric; registradosAlInicio: Metric; showUp: Metric;
}
interface Data {
  datos: {
    zona: string; clases: Clase[];
    carrito: { apertura: string | null; deadlineBonos: string | null; cierre: string | null };
    ventasPorHora: Metric<Array<{ hora: string; ventas: number; acumulado: number }> | null>;
    mix: Metric<{ unico: number; cuotas: number } | null>;
    ventasNetas: Metric; ventasPor100: Metric;
    listas: {
      cuotasFallidas: Metric<Array<{ orden: string; cuando: string; cuota: string; monto: number; pasarela: string; motivo: string | null; ghl: string | null }> | null>;
      checkoutsNoCompletados: Metric<Array<{ orden: string; cuando: string; monto: number; pasarela: string; ghl: string | null }> | null>;
    };
    comparacion: { disponible: boolean; note: string };
  };
}

const COLORS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];
const GATEWAY: Record<string, string> = { stripe: "Stripe", authorize_net: "Authorize.net", paypal: "PayPal", otro: "Otro" };

export function Durante({ launchId }: { launchId: string }) {
  const { data, error, reload } = useData<Data>(`/api/v1/pantallas/${launchId}/durante`, 30_000);
  if (!data) return <Loading error={error} retry={reload} />;
  const d = data.datos;
  const tz = d.zona;
  const mix = d.mix.value;
  const totalMix = mix ? mix.unico + mix.cuotas : 0;

  // Curvas alineadas por minuto desde el inicio de cada clase.
  const series = d.clases.filter((c) => c.curva.length).map((c, i) => {
    const t0 = c.inicio ? Date.parse(c.inicio) : Date.parse(c.curva[0]!.t);
    return { name: `Clase ${c.clase}`, color: COLORS[i % 3]!, points: c.curva.map((p) => ({ x: Math.round((Date.parse(p.t) - t0) / 60000), y: p.conectados })) };
  });

  return (
    <>
      <div className="grid">
        <Countdown label="Deadline de bonos" at={d.carrito.deadlineBonos} tz={tz} />
        <Countdown label="Cierre del carrito" at={d.carrito.cierre} tz={tz} />
        <Stat label="Ventas netas" m={d.ventasNetas} format={int} />
        <Stat label="Ventas por cada 100 conectados" m={d.ventasPor100} format={(v) => v.toFixed(1)} />
      </div>

      <Section title="Clases en vivo">
        <div className="grid">
          {d.clases.map((c) => (
            <div key={c.clase} className="card stat">
              <div className="label">Clase {c.clase} · {c.inicio ? `${dayTime(c.inicio, tz)} ${tzName(tz)}${tz !== MIAMI ? ` · ${time(c.inicio, MIAMI)} Miami` : ""}` : "hora por definir"}</div>
              <div className={`value${c.showUp.value === null ? " none" : ""}`}>{c.showUp.value === null ? "Sin datos" : pct(c.showUp.value)}</div>
              <div className="sub">Show up · pico {int(c.pico.value)} / {int(c.registradosAlInicio.value)} registrados al inicio</div>
              <div className="sub">Al final: {int(c.alFinal.value)} · Likes {int(c.likes.value)} · Comentarios {int(c.comentarios.value)}</div>
              <Prov m={c.showUp} />
              {c.pico.note ? <div className="note">{c.pico.note}</div> : null}
            </div>
          ))}
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <LineChart title="Conectados por minuto desde el inicio" series={series} xFormat={(m) => `min ${m}`} yFormat={(v) => int(v)} height={260} />
          <p className="note">Los conectados en vivo solo se capturan mientras la clase está al aire (cada minuto).</p>
        </div>
      </Section>

      <Section title="Carrito">
        <div className="grid wide">
          <div className="card">
            <BarChart title={d.carrito.apertura ? `Ventas por hora desde la apertura (${time(d.carrito.apertura, tz)})` : "Ventas por hora desde la apertura"}
              bars={(d.ventasPorHora.value ?? []).map((h, i, arr) => ({ label: `${dayTime(h.hora, tz).split(" · ")[1]}`, value: h.ventas, partial: i === arr.length - 1, detail: `Acumulado: ${h.acumulado}` }))}
              yFormat={(v) => int(v)} partialNote="hora en curso" />
            <Prov m={d.ventasPorHora} />
          </div>
          <div className="card stat">
            <div className="label">Mix de pago</div>
            {mix && totalMix ? (
              <>
                <div className="value">{pct(mix.unico / totalMix, 0)} único</div>
                <div className="sub">{int(mix.unico)} pago único · {int(mix.cuotas)} en cuotas</div>
                <div className="bar" aria-hidden style={{ display: "flex", gap: 2, background: "transparent" }}>
                  <i style={{ width: `${(mix.unico / totalMix) * 100}%`, background: "var(--series-1)" }} />
                  <i style={{ width: `${(mix.cuotas / totalMix) * 100}%`, background: "var(--series-2)" }} />
                </div>
              </>
            ) : <div className="value none">Sin datos</div>}
            <Prov m={d.mix} />
          </div>
        </div>
        <p className="note">{d.comparacion.note}</p>
      </Section>

      <Section title="Listas para Ventas">
        <div className="grid wide">
          <div className="card">
            <h3>Cuotas fallidas</h3>
            <SalesList rows={(d.listas.cuotasFallidas.value ?? []).map((r) => ({ key: r.orden, title: `Orden ${r.orden} · cuota ${r.cuota}`, sub: `${usd(r.monto)} · ${GATEWAY[r.pasarela] ?? r.pasarela} · ${dayTime(r.cuando, tz)}${r.motivo ? ` · ${r.motivo}` : ""}`, ghl: r.ghl }))} />
            <Prov m={d.listas.cuotasFallidas} />
          </div>
          <div className="card">
            <h3>Checkouts no completados</h3>
            <SalesList rows={(d.listas.checkoutsNoCompletados.value ?? []).map((r) => ({ key: r.orden + r.cuando, title: `Orden ${r.orden}`, sub: `${usd2(r.monto)} · ${GATEWAY[r.pasarela] ?? r.pasarela} · ${dayTime(r.cuando, tz)}`, ghl: r.ghl }))} />
            <Prov m={d.listas.checkoutsNoCompletados} />
          </div>
        </div>
      </Section>
    </>
  );
}

function SalesList({ rows }: { rows: Array<{ key: string; title: string; sub: string; ghl: string | null }> }) {
  if (!rows.length) return <p className="note">Nada pendiente.</p>;
  return (
    <div className="list">
      {rows.map((r) => (
        <div key={r.key} className="item">
          <div style={{ minWidth: 0 }}><div>{r.title}</div><div className="note">{r.sub}</div></div>
          {r.ghl ? <a className="btn" href={r.ghl} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Abrir en GHL</a> : <span className="note">Sin contacto en GHL</span>}
        </div>
      ))}
    </div>
  );
}
