import { Loading, Section, useData } from "../components/ui";
import { ago, dayTime, MIAMI } from "../format";

interface Data {
  ahora: string;
  conexiones: Array<{ id: string; source: string; status: string; last_data_at: string | null; last_error_at: string | null; last_error: string | null }>;
  trabajos: Array<{ job: string; next_run_at: string; last_ok_at: string | null; last_error: string | null; attempts: number }>;
}
const STATUS: Record<string, [string, string]> = {
  ok: ["Funcionando", "var(--good)"], error: ["Con errores", "var(--critical)"], sin_credenciales: ["Sin credenciales", "var(--warning)"], unknown: ["Sin datos todavía", "var(--text-muted)"],
};
const NAMES: Record<string, string> = { ghl: "GHL", meta: "Meta", stripe: "Stripe", ventas: "Sistema de ventas", youtube: "YouTube", cron: "Sincronización programada" };

export function Conexiones() {
  const { data, error, reload } = useData<Data>(`/api/v1/conexiones`, 30_000);
  if (!data) return <Loading error={error} retry={reload} />;
  return (
    <>
      <div className="list">
        {data.conexiones.length === 0 && <p className="note">Todavía no hay fuentes que hayan enviado datos.</p>}
        {data.conexiones.map((c) => {
          const [label, color] = STATUS[c.status] ?? [c.status, "var(--text-muted)"];
          return (
            <div key={c.id} className="card">
              <div className="row"><span className="status-dot" style={{ background: color }} /><b>{NAMES[c.source] ?? c.source}</b><span className="muted">{c.id}</span><span className="spacer" /><span>{label}</span></div>
              <div className="note">Último dato: {c.last_data_at ? `${dayTime(c.last_data_at, MIAMI)} Miami (${ago(c.last_data_at)})` : "nunca"}</div>
              {c.last_error && <div className="error" style={{ fontSize: 15 }}>Último error ({c.last_error_at ? ago(c.last_error_at) : ""}): {c.last_error}</div>}
            </div>
          );
        })}
      </div>
      <Section title="Trabajos de sincronización">
        {data.trabajos.length === 0 ? <p className="note">Sin trabajos activos: se crean al configurar las credenciales de cada conector.</p> : (
          <div className="card table-wrap">
            <table>
              <thead><tr><th>Trabajo</th><th>Último OK</th><th>Próxima</th><th>Error</th></tr></thead>
              <tbody>{data.trabajos.map((t) => (
                <tr key={t.job}><td>{t.job}</td><td>{ago(t.last_ok_at)}</td><td>{dayTime(t.next_run_at, MIAMI)}</td><td className={t.last_error ? "error" : ""}>{t.last_error ? `${t.last_error} (intento ${t.attempts})` : "—"}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Section>
    </>
  );
}
