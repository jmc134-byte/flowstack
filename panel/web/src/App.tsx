import { useEffect, useState } from "react";
import { api } from "./api";
import { Login, PasskeySetup } from "./pages/Login";
import { Resumen } from "./pages/Resumen";
import { Antes } from "./pages/Antes";
import { Durante } from "./pages/Durante";
import { Despues } from "./pages/Despues";
import { Carga } from "./pages/Carga";
import { Conexiones } from "./pages/Conexiones";
import { Config } from "./pages/Config";
import { Loading } from "./components/ui";
import { dayTime, MIAMI, tzName } from "./format";

interface LaunchRow { id: string; edition: string; status: string; timezone: string; brand: string; expert: string | null; class_1: string | null }
interface Doc { id: string; timezone: string; milestones: Array<{ kind: string; label: string | null }> }

const TABS = [
  ["resumen", "Resumen"], ["antes", "Antes"], ["durante", "Durante"], ["despues", "Después"],
  ["carga", "Carga manual"], ["conexiones", "Conexiones"], ["config", "Configuración"],
] as const;
type Tab = (typeof TABS)[number][0];

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* sin almacenamiento */ } },
};

function useHashTab(): [Tab, (t: Tab) => void] {
  const read = () => (TABS.find(([k]) => `#/${k}` === location.hash)?.[0] ?? "resumen") as Tab;
  const [tab, setTab] = useState<Tab>(read);
  useEffect(() => { const on = () => setTab(read()); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  return [tab, (t) => { location.hash = `#/${t}`; }];
}

export function App() {
  const [auth, setAuth] = useState<{ sesion: boolean; passkeys: number } | null>(null);
  const [askPasskey, setAskPasskey] = useState(false);
  const [launches, setLaunches] = useState<LaunchRow[] | null>(null);
  const [launchId, setLaunchId] = useState<string | null>(store.get("panel.launch"));
  const [doc, setDoc] = useState<Doc | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useHashTab();

  const checkAuth = () => api.get<{ sesion: boolean; passkeys: number }>("/api/auth/estado").then(setAuth).catch(() => setAuth({ sesion: false, passkeys: 0 }));
  useEffect(() => { checkAuth(); const on = () => setAuth((a) => (a ? { ...a, sesion: false } : a)); addEventListener("panel:sesion", on); return () => removeEventListener("panel:sesion", on); }, []);

  const loadLaunches = () => api.get<{ lanzamientos: LaunchRow[] }>("/api/v1/lanzamientos").then((r) => {
    setLaunches(r.lanzamientos);
    setLaunchId((cur) => (cur && r.lanzamientos.some((l) => l.id === cur) ? cur : r.lanzamientos[0]?.id ?? null));
  });
  useEffect(() => { if (auth?.sesion) loadLaunches(); }, [auth?.sesion]);
  useEffect(() => {
    if (!launchId || !auth?.sesion) return;
    store.set("panel.launch", launchId);
    api.get<{ lanzamiento: Doc }>(`/api/v1/lanzamientos/${launchId}`).then((r) => setDoc(r.lanzamiento)).catch(() => setDoc(null));
  }, [launchId, auth?.sesion]);

  if (!auth) return <div className="app"><Loading /></div>;
  if (!auth.sesion) return <div className="app"><Login onIn={async () => { await checkAuth(); setAskPasskey(true); }} /></div>;
  if (!launches) return <div className="app"><Loading /></div>;

  const current = launches.find((l) => l.id === launchId) ?? null;
  const logout = async () => { await api.post("/api/auth/salir"); setAuth({ sesion: false, passkeys: auth.passkeys }); };

  return (
    <div className="app">
      <header className="top">
        <div className="launch">
          <select aria-label="Lanzamiento" value={launchId ?? ""} onChange={(e) => { setCreating(false); setLaunchId(e.target.value); }}>
            {launches.map((l) => <option key={l.id} value={l.id}>{l.brand} · {l.edition}{l.expert ? ` · ${l.expert}` : ""}{l.status === "historical" ? " (histórico)" : ""}</option>)}
          </select>
        </div>
        {current?.class_1 && <span className="phase">Clase 1: {dayTime(current.class_1, current.timezone)} {tzName(current.timezone)}{current.timezone !== MIAMI ? ` · ${dayTime(current.class_1, MIAMI).split(" · ")[1]} Miami` : ""}</span>}
        <button className="btn" onClick={logout}>Salir</button>
      </header>
      <nav className="tabs" aria-label="Pantallas">
        {TABS.map(([k, label]) => <button key={k} className="tab" aria-current={tab === k ? "page" : undefined} onClick={() => { setCreating(false); setTab(k); }}>{label}</button>)}
      </nav>
      {askPasskey && auth.passkeys === 0 && <PasskeySetup onDone={() => { setAskPasskey(false); checkAuth(); }} />}
      <main>
        {!launchId && tab !== "config" && tab !== "conexiones" ? <p className="note">No hay lanzamientos. Crea uno en Configuración.</p> : null}
        {launchId && tab === "resumen" && <Resumen key={launchId} launchId={launchId} />}
        {launchId && tab === "antes" && <Antes key={launchId} launchId={launchId} />}
        {launchId && tab === "durante" && <Durante key={launchId} launchId={launchId} />}
        {launchId && tab === "despues" && <Despues key={launchId} launchId={launchId} />}
        {launchId && tab === "carga" && doc && <Carga key={launchId} launchId={launchId} zona={doc.timezone} igLives={doc.milestones.filter((m) => m.kind === "ig_live").map((m) => m.label ?? "Live de IG")} />}
        {tab === "conexiones" && <Conexiones />}
        {tab === "config" && (
          <>
            <div className="row" style={{ marginBottom: 8 }}>
              <span className="spacer" />
              <button className="btn" onClick={() => setCreating(true)}>Nuevo lanzamiento</button>
            </div>
            <Config key={creating ? "nuevo" : launchId ?? "x"} launchId={creating ? null : launchId} onSaved={async (id) => { setCreating(false); await loadLaunches(); setLaunchId(id); }} />
          </>
        )}
      </main>
    </div>
  );
}
