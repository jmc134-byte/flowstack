import { useState } from "react";
import { api } from "../api";
import { Loading, Section, useData } from "../components/ui";
import { dayTime, int } from "../format";

interface Entry { id: number; kind: string; ref: string | null; value: number | null; text: string | null; measured_at: string; entered_at: string }
const KINDS = [
  { k: "whatsapp_members", label: "Miembros de WhatsApp" },
  { k: "ig_live_peak", label: "Live de IG · pico" },
  { k: "ig_live_end", label: "Live de IG · al final" },
  { k: "note", label: "Nota del día" },
] as const;
const LABEL = Object.fromEntries(KINDS.map((k) => [k.k, k.label]));

function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function Carga({ launchId, zona, igLives }: { launchId: string; zona: string; igLives: string[] }) {
  const { data, error, reload } = useData<{ entradas: Entry[] }>(`/api/v1/manual/${launchId}`, 120_000);
  const [kind, setKind] = useState<(typeof KINDS)[number]["k"]>("whatsapp_members");
  const [value, setValue] = useState("");
  const [text, setText] = useState("");
  const [ref, setRef] = useState(igLives[0] ?? "");
  const [at, setAt] = useState(nowLocalInput());
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await api.post(`/api/v1/manual/${launchId}`, {
        kind,
        value: kind === "note" ? undefined : Number(value),
        text: kind === "note" ? text : undefined,
        ref: kind.startsWith("ig_live") ? ref : undefined,
        measured_at: new Date(at).toISOString(), // la hora del dispositivo se convierte a UTC
      });
      setValue(""); setText(""); setAt(nowLocalInput());
      setMsg({ ok: true, t: "Guardado." });
      reload();
    } catch (e) {
      setMsg({ ok: false, t: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: number) => {
    if (!confirm("¿Borrar este dato?")) return;
    await api.del(`/api/v1/manual/${launchId}/${id}`);
    reload();
  };
  const valid = kind === "note" ? text.trim().length > 0 : value !== "" && Number(value) >= 0;

  return (
    <>
      <div className="card" style={{ display: "grid", gap: 14 }}>
        <div className="seg" role="group" aria-label="Tipo de dato" style={{ flexWrap: "wrap" }}>
          {KINDS.map((k) => <button key={k.k} aria-pressed={kind === k.k} onClick={() => setKind(k.k)}>{k.label}</button>)}
        </div>
        {kind.startsWith("ig_live") && (
          <label className="f">Live
            <select value={ref} onChange={(e) => setRef(e.target.value)}>
              {igLives.length ? igLives.map((l) => <option key={l}>{l}</option>) : <option value="">Live de IG</option>}
            </select>
          </label>
        )}
        {kind === "note" ? (
          <label className="f">Nota<textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Qué pasó hoy" /></label>
        ) : (
          <label className="f">{kind === "whatsapp_members" ? "Miembros" : "Conectados"}
            <input inputMode="numeric" pattern="[0-9]*" value={value} onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ""))} style={{ fontSize: 28, fontWeight: 700 }} placeholder="0" />
          </label>
        )}
        <label className="f">Fecha y hora del dato (hora de este dispositivo)<input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} /></label>
        <button className="btn primary big" disabled={!valid || busy} onClick={save}>{busy ? "Guardando…" : "Guardar"}</button>
        {msg && <p className={msg.ok ? "ok" : "error"} style={{ margin: 0 }}>{msg.t}</p>}
      </div>

      <Section title="Últimos datos cargados">
        {!data ? <Loading error={error} retry={reload} /> : data.entradas.length === 0 ? <p className="note">Todavía no hay datos cargados.</p> : (
          <div className="list">
            {data.entradas.map((e) => (
              <div key={e.id} className="item">
                <div style={{ minWidth: 0 }}>
                  <div><b>{LABEL[e.kind] ?? e.kind}</b>{e.ref ? ` · ${e.ref}` : ""}</div>
                  <div>{e.kind === "note" ? e.text : int(e.value)}</div>
                  <div className="note">{dayTime(e.measured_at, zona)}</div>
                </div>
                <button className="btn" onClick={() => remove(e.id)} aria-label="Borrar">Borrar</button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
