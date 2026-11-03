import { Hono, type Context, type MiddlewareHandler } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import {
  generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { sha256Hex, timingSafeEqual, normalizeEmail } from "./lib/crypto";
import type { Env } from "./env";

/**
 * Acceso solo para el dueño (SPEC §Seguridad): passkey (Face ID) o enlace mágico.
 * - El primer passkey se registra después de entrar con el código de recuperación (OWNER_SETUP_CODE)
 *   o con un enlace mágico (si RESEND_API_KEY está configurado).
 * - Cookie de sesión HttpOnly, Secure, SameSite=Strict; en la base solo se guarda su hash.
 * - Las mutaciones exigen el header X-Panel: 1 (protección CSRF adicional).
 */
export type AuthVars = { userId: string };
type C = Context<{ Bindings: Env; Variables: AuthVars }>;

const COOKIE = "panel_sid";
const SESSION_DAYS = 30;
const nowIso = () => new Date().toISOString();

const randomToken = () => isoBase64URL.fromBuffer(crypto.getRandomValues(new Uint8Array(32)));

function rp(c: C) {
  const url = new URL(c.req.url);
  return { rpID: url.hostname, origin: url.origin };
}

async function tooManyFailures(db: D1Database, kind: string): Promise<boolean> {
  const since = new Date(Date.now() - 3_600_000).toISOString();
  const r = await db.prepare(`SELECT COUNT(*) n FROM auth_attempts WHERE kind=?1 AND ok=0 AND at>=?2`).bind(kind, since).first<{ n: number }>();
  return (r?.n ?? 0) >= 10;
}
const logAttempt = (db: D1Database, kind: string, ok: boolean) =>
  db.prepare(`INSERT INTO auth_attempts (kind, at, ok) VALUES (?1, ?2, ?3)`).bind(kind, nowIso(), ok ? 1 : 0).run();

async function ownerUser(env: Env): Promise<{ id: string; email: string } | null> {
  const email = normalizeEmail(env.OWNER_EMAIL ?? null);
  if (!email) return null;
  const found = await env.DB.prepare(`SELECT id, email FROM users WHERE email=?1`).bind(email).first<{ id: string; email: string }>();
  if (found) return found;
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO users (id, email, created_at) VALUES (?1, ?2, ?3)`).bind(id, email, nowIso()).run();
  await env.DB.prepare(`INSERT INTO role_assignments (user_id, role) VALUES (?1, 'owner')`).bind(id).run();
  return { id, email };
}

async function startSession(c: C, userId: string, method: string) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await c.env.DB.prepare(`INSERT INTO sessions (id_hash, user_id, created_at, expires_at, method) VALUES (?1, ?2, ?3, ?4, ?5)`)
    .bind(await sha256Hex(token), userId, nowIso(), expires.toISOString(), method).run();
  setCookie(c, COOKIE, token, { httpOnly: true, secure: true, sameSite: "Strict", path: "/", expires });
}

async function currentUser(c: C): Promise<string | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  const row = await c.env.DB.prepare(`SELECT user_id, expires_at FROM sessions WHERE id_hash=?1`).bind(await sha256Hex(token)).first<{ user_id: string; expires_at: string }>();
  if (!row || row.expires_at < nowIso()) return null;
  return row.user_id;
}

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: AuthVars }> = async (c, next) => {
  const userId = await currentUser(c);
  if (!userId) return c.json({ ok: false, error: "sesión requerida" }, 401);
  if (c.req.method !== "GET" && c.req.header("x-panel") !== "1") return c.json({ ok: false, error: "falta X-Panel" }, 403);
  c.set("userId", userId);
  await next();
};

export const authRoutes = new Hono<{ Bindings: Env; Variables: AuthVars }>();

authRoutes.use("*", async (c, next) => {
  if (c.req.method !== "GET" && c.req.header("x-panel") !== "1") return c.json({ ok: false, error: "falta X-Panel" }, 403);
  await next();
});

authRoutes.get("/estado", async (c) => {
  const userId = await currentUser(c);
  const creds = await c.env.DB.prepare(`SELECT COUNT(*) n FROM webauthn_credentials`).first<{ n: number }>();
  return c.json({
    ok: true,
    sesion: !!userId,
    passkeys: creds?.n ?? 0,
    enlaceDisponible: !!(c.env.RESEND_API_KEY && c.env.MAIL_FROM && c.env.OWNER_EMAIL),
    codigoDisponible: (c.env.OWNER_SETUP_CODE?.length ?? 0) >= 32,
  });
});

// ───── Código de recuperación ─────
authRoutes.post("/codigo", async (c) => {
  const secret = c.env.OWNER_SETUP_CODE;
  if (!secret || secret.length < 32) return c.json({ ok: false, error: "código no configurado" }, 503);
  if (await tooManyFailures(c.env.DB, "codigo")) return c.json({ ok: false, error: "demasiados intentos; espera una hora" }, 429);
  const { codigo } = await c.req.json<{ codigo?: string }>().catch(() => ({ codigo: undefined }));
  const ok = typeof codigo === "string" && timingSafeEqual(codigo.trim(), secret);
  await logAttempt(c.env.DB, "codigo", ok);
  if (!ok) return c.json({ ok: false, error: "código incorrecto" }, 401);
  const user = await ownerUser(c.env);
  if (!user) return c.json({ ok: false, error: "OWNER_EMAIL no configurado" }, 503);
  await startSession(c, user.id, "codigo");
  return c.json({ ok: true });
});

// ───── Enlace mágico (Resend) ─────
authRoutes.post("/enlace", async (c) => {
  const { RESEND_API_KEY, MAIL_FROM } = c.env;
  const owner = normalizeEmail(c.env.OWNER_EMAIL ?? null);
  if (!RESEND_API_KEY || !MAIL_FROM || !owner) return c.json({ ok: false, error: "enlace mágico no configurado" }, 503);
  if (await tooManyFailures(c.env.DB, "enlace")) return c.json({ ok: false, error: "demasiados intentos; espera una hora" }, 429);
  const { email } = await c.req.json<{ email?: string }>().catch(() => ({ email: undefined }));
  const matches = normalizeEmail(email ?? null) === owner;
  await logAttempt(c.env.DB, "enlace", matches);
  if (matches) {
    const user = await ownerUser(c.env);
    const token = randomToken();
    await c.env.DB.prepare(`INSERT INTO auth_tokens (token_hash, kind, user_id, expires_at) VALUES (?1, 'magic_link', ?2, ?3)`)
      .bind(await sha256Hex(token), user!.id, new Date(Date.now() + 15 * 60_000).toISOString()).run();
    const link = `${new URL(c.req.url).origin}/entrar?t=${encodeURIComponent(token)}`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [owner],
        subject: "Tu enlace para entrar al panel",
        html: `<p>Toca para entrar al panel de lanzamientos (vence en 15 minutos):</p><p><a href="${link}">Entrar al panel</a></p><p>Si no lo pediste, ignora este correo.</p>`,
      }),
    });
    if (!res.ok) return c.json({ ok: false, error: `no se pudo enviar el correo (${res.status})` }, 502);
  }
  // Misma respuesta exista o no el email.
  return c.json({ ok: true, mensaje: "Si el email tiene acceso, te llegará un enlace en unos segundos." });
});

authRoutes.post("/enlace/confirmar", async (c) => {
  const { t } = await c.req.json<{ t?: string }>().catch(() => ({ t: undefined }));
  if (!t) return c.json({ ok: false, error: "enlace inválido" }, 400);
  const hash = await sha256Hex(t);
  const row = await c.env.DB.prepare(`SELECT user_id, expires_at, used_at FROM auth_tokens WHERE token_hash=?1 AND kind='magic_link'`).bind(hash).first<{ user_id: string; expires_at: string; used_at: string | null }>();
  if (!row || row.used_at || row.expires_at < nowIso()) return c.json({ ok: false, error: "el enlace venció o ya se usó" }, 401);
  await c.env.DB.prepare(`UPDATE auth_tokens SET used_at=?2 WHERE token_hash=?1`).bind(hash, nowIso()).run();
  await startSession(c, row.user_id, "enlace");
  return c.json({ ok: true });
});

// ───── Passkey: registro (requiere sesión) ─────
authRoutes.post("/passkey/registro/opciones", async (c) => {
  const userId = await currentUser(c);
  if (!userId) return c.json({ ok: false, error: "sesión requerida" }, 401);
  const user = await c.env.DB.prepare(`SELECT id, email FROM users WHERE id=?1`).bind(userId).first<{ id: string; email: string }>();
  const { results: creds } = await c.env.DB.prepare(`SELECT id, transports FROM webauthn_credentials WHERE user_id=?1`).bind(userId).all<{ id: string; transports: string | null }>();
  const { rpID } = rp(c);
  const options = await generateRegistrationOptions({
    rpName: "Panel de lanzamientos",
    rpID,
    userName: user!.email,
    userID: new Uint8Array(new TextEncoder().encode(user!.id)),
    attestationType: "none",
    excludeCredentials: creds.map((k) => ({ id: k.id, transports: k.transports ? JSON.parse(k.transports) : undefined })),
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  await c.env.DB.prepare(`INSERT INTO auth_tokens (token_hash, kind, user_id, payload, expires_at) VALUES (?1, 'webauthn_reg', ?2, ?3, ?4)`)
    .bind(await sha256Hex(options.challenge), userId, options.challenge, new Date(Date.now() + 5 * 60_000).toISOString()).run();
  return c.json(options);
});

authRoutes.post("/passkey/registro/verificar", async (c) => {
  const userId = await currentUser(c);
  if (!userId) return c.json({ ok: false, error: "sesión requerida" }, 401);
  const body = await c.req.json<{ respuesta: any; nombre?: string }>();
  const { rpID, origin } = rp(c);
  const challenges = await c.env.DB.prepare(`SELECT token_hash, payload FROM auth_tokens WHERE kind='webauthn_reg' AND user_id=?1 AND used_at IS NULL AND expires_at>=?2`).bind(userId, nowIso()).all<{ token_hash: string; payload: string }>();
  for (const ch of challenges.results) {
    try {
      const v = await verifyRegistrationResponse({ response: body.respuesta, expectedChallenge: ch.payload, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true });
      if (!v.verified || !v.registrationInfo) continue;
      const cred = v.registrationInfo.credential;
      await c.env.DB.prepare(`UPDATE auth_tokens SET used_at=?2 WHERE token_hash=?1`).bind(ch.token_hash, nowIso()).run();
      await c.env.DB.prepare(`INSERT INTO webauthn_credentials (id, user_id, public_key, counter, transports, device_label, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`)
        .bind(cred.id, userId, isoBase64URL.fromBuffer(cred.publicKey), cred.counter, JSON.stringify(cred.transports ?? []), (body.nombre ?? "iPad").slice(0, 60), nowIso()).run();
      return c.json({ ok: true });
    } catch {
      /* probar el siguiente reto */
    }
  }
  return c.json({ ok: false, error: "no se pudo verificar el passkey" }, 400);
});

// ───── Passkey: entrar ─────
authRoutes.post("/passkey/entrar/opciones", async (c) => {
  const { rpID } = rp(c);
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
  await c.env.DB.prepare(`INSERT INTO auth_tokens (token_hash, kind, payload, expires_at) VALUES (?1, 'webauthn_auth', ?2, ?3)`)
    .bind(await sha256Hex(options.challenge), options.challenge, new Date(Date.now() + 5 * 60_000).toISOString()).run();
  return c.json(options);
});

authRoutes.post("/passkey/entrar/verificar", async (c) => {
  if (await tooManyFailures(c.env.DB, "passkey")) return c.json({ ok: false, error: "demasiados intentos; espera una hora" }, 429);
  const { respuesta } = await c.req.json<{ respuesta: any }>();
  const { rpID, origin } = rp(c);
  const cred = await c.env.DB.prepare(`SELECT id, user_id, public_key, counter, transports FROM webauthn_credentials WHERE id=?1`).bind(String(respuesta?.id ?? "")).first<{ id: string; user_id: string; public_key: string; counter: number; transports: string | null }>();
  // El reto viene firmado dentro de clientDataJSON; lo buscamos por su hash.
  let challenge: string | null = null;
  try {
    const clientData = JSON.parse(new TextDecoder().decode(isoBase64URL.toBuffer(respuesta.response.clientDataJSON)));
    challenge = typeof clientData.challenge === "string" ? clientData.challenge : null;
  } catch { /* inválido */ }
  const chRow = challenge
    ? await c.env.DB.prepare(`SELECT token_hash FROM auth_tokens WHERE token_hash=?1 AND kind='webauthn_auth' AND used_at IS NULL AND expires_at>=?2`).bind(await sha256Hex(challenge), nowIso()).first<{ token_hash: string }>()
    : null;
  if (!cred || !chRow || !challenge) {
    await logAttempt(c.env.DB, "passkey", false);
    return c.json({ ok: false, error: "passkey no reconocido" }, 401);
  }
  await c.env.DB.prepare(`UPDATE auth_tokens SET used_at=?2 WHERE token_hash=?1`).bind(chRow.token_hash, nowIso()).run();
  try {
    const v = await verifyAuthenticationResponse({
      response: respuesta, expectedChallenge: challenge, expectedOrigin: origin, expectedRPID: rpID, requireUserVerification: true,
      credential: { id: cred.id, publicKey: new Uint8Array(isoBase64URL.toBuffer(cred.public_key)), counter: cred.counter, transports: cred.transports ? JSON.parse(cred.transports) : undefined },
    });
    if (!v.verified) throw new Error("no verificado");
    await c.env.DB.prepare(`UPDATE webauthn_credentials SET counter=?2, last_used_at=?3 WHERE id=?1`).bind(cred.id, v.authenticationInfo.newCounter, nowIso()).run();
    await logAttempt(c.env.DB, "passkey", true);
    await startSession(c, cred.user_id, "passkey");
    return c.json({ ok: true });
  } catch {
    await logAttempt(c.env.DB, "passkey", false);
    return c.json({ ok: false, error: "passkey no verificado" }, 401);
  }
});

authRoutes.post("/salir", async (c) => {
  const token = getCookie(c, COOKIE);
  if (token) await c.env.DB.prepare(`DELETE FROM sessions WHERE id_hash=?1`).bind(await sha256Hex(token)).run();
  deleteCookie(c, COOKIE, { path: "/", secure: true });
  return c.json({ ok: true });
});
