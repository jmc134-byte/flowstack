import type { Metric } from "../api";
import { Loading, Section, Stat, useData } from "../components/ui";
import { int, pct, usd } from "../format";

interface Data {
  datos:
    | { disponible: false; note: string }
    | {
        disponible: true; ventasNetas: Metric; conteos: { purchases: number; refunds: number; disputes: number };
        cuotas: { collected: number; pending: number; failed: number };
        bruto: Metric; neto: Metric; comprometido: Metric; cpa: Metric; roas: Metric; conversion: Metric;
      };
}

export function Despues({ launchId }: { launchId: string }) {
  const { data, error, reload } = useData<Data>(`/api/v1/pantallas/${launchId}/despues`);
  if (!data) return <Loading error={error} retry={reload} />;
  const d = data.datos;
  if (!d.disponible) return <div className="card"><p className="note">{d.note}</p></div>;
  return (
    <>
      <div className="grid">
        <Stat label="Ventas netas" m={d.ventasNetas} format={int} sub={`${int(d.conteos.purchases)} compras − ${int(d.conteos.refunds)} reembolsos − ${int(d.conteos.disputes)} contracargos`} />
        <Stat label="Ingreso bruto" m={d.bruto} format={(v) => usd(v)} />
        <Stat label="Ingreso neto" m={d.neto} format={(v) => usd(v)} sub="Descuenta comisiones, reembolsos y contracargos" />
        <Stat label="Ingreso comprometido" m={d.comprometido} format={(v) => usd(v)} sub="Incluye cuotas por cobrar" />
        <Stat label="CPA" m={d.cpa} format={(v) => usd(v, 2)} />
        <Stat label="ROAS" m={d.roas} format={(v) => `${v.toFixed(2)}×`} />
        <Stat label="Conversión" m={d.conversion} format={(v) => pct(v, 2)} />
      </div>
      <Section title="Cuotas">
        <div className="grid">
          <div className="card stat"><div className="label">Cobradas</div><div className="value">{int(d.cuotas.collected)}</div></div>
          <div className="card stat"><div className="label">Pendientes</div><div className="value">{int(d.cuotas.pending)}</div></div>
          <div className="card stat"><div className="label">Órdenes con cuota fallida</div><div className="value">{int(d.cuotas.failed)}</div></div>
        </div>
      </Section>
      <p className="note">La liquidación con el experto, su PDF y la conversión por antigüedad del lead llegan en la fase 2.</p>
    </>
  );
}
