import { useEffect, useState } from "react";
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { api } from "../api";

interface Estado { sesion: boolean; passkeys: number; enlaceDisponible: boolean; codigoDisponible: boolean }

export function Login({ onIn }: { onIn: () => void }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [busy, setBusy] = useState(false);
  const token = new URLSearchParams(location.search).get("t");

  useEffect(() => { api.get<Estado>("/api/auth/estado").then(setEstado).catch((e) => setMsg({ ok: false, t: e.message })); }, []);
  useEffect(() => {
    if (!token) return;
    api.post("/api/auth/enlace/confirmar", { t: token })
      .then(() => { history.replaceState(null, "", "/"); onIn(); })
      .catch((e) => setMsg({ ok: false, t: e.message }));
  }, [token]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, t: e instanceof Error ? e.message : String(e) }); } finally { setBusy(false); }
  };
  const passkey = () => run(async () => {
    const opts = await api.post<any>("/api/auth/passkey/entrar/opciones");
    const respuesta = await startAuthentication({ optionsJSON: opts });
    await api.post("/api/auth/passkey/entrar/verificar", { respuesta });
    onIn();
  });

  if (token) return <div className="login"><h1>Entrando…</h1>{msg && <p className="error">{msg.t}</p>}</div>;
  return (
    <div className="login">
      <h1 className="center">Panel de lanzamientos</h1>
      {estado && estado.passkeys > 0 && browserSupportsWebAuthn() && (
        <button className="btn primary big" onClick={passkey} disabled={busy}>Entrar con Face ID</button>
      )}
      {estado?.enlaceDisponible && (
        <div className="card" style={{ display: "grid", gap: 10 }}>
          <label className="f">Email<input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <button className="btn big" disabled={busy || !email} onClick={() => run(async () => { const r = await api.post<{ mensaje: string }>("/api/auth/enlace", { email }); setMsg({ ok: true, t: r.mensaje }); })}>Enviarme un enlace mágico</button>
        </div>
      )}
      {estado?.codigoDisponible && (
        <details className="card" open={estado.passkeys === 0 && !estado.enlaceDisponible}>
          <summary style={{ minHeight: 32, cursor: "pointer" }}>Entrar con código de recuperación</summary>
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <label className="f">Código<input type="password" autoComplete="current-password" value={codigo} onChange={(e) => setCodigo(e.target.value)} /></label>
            <button className="btn big" disabled={busy || !codigo} onClick={() => run(async () => { await api.post("/api/auth/codigo", { codigo }); onIn(); })}>Entrar</button>
          </div>
        </details>
      )}
      {estado && !estado.passkeys && !estado.enlaceDisponible && !estado.codigoDisponible && (
        <p className="note">El acceso todavía no está configurado (falta el código de recuperación o el enlace mágico).</p>
      )}
      {msg && <p className={msg.ok ? "ok" : "error"}>{msg.t}</p>}
    </div>
  );
}

/** Ofrece registrar Face ID después de entrar con código o enlace. */
export function PasskeySetup({ onDone }: { onDone: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  if (!browserSupportsWebAuthn()) return null;
  const register = async () => {
    try {
      const opts = await api.post<any>("/api/auth/passkey/registro/opciones");
      const respuesta = await startRegistration({ optionsJSON: opts });
      await api.post("/api/auth/passkey/registro/verificar", { respuesta, nombre: /iPad/.test(navigator.userAgent) ? "iPad" : /iPhone/.test(navigator.userAgent) ? "iPhone" : "Dispositivo" });
      onDone();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };
  return (
    <div className="card row" style={{ marginBottom: 12 }}>
      <div style={{ flex: 1, minWidth: 220 }}><b>Activa Face ID para entrar</b><div className="note">Registra un passkey en este dispositivo para no usar el código.</div>{msg && <div className="error">{msg}</div>}</div>
      <button className="btn primary" onClick={register}>Activar Face ID</button>
      <button className="btn" onClick={onDone}>Ahora no</button>
    </div>
  );
}
