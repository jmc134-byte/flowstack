import type { SyncEnv } from "./sync/runner";

export interface Env extends SyncEnv {
  DB: D1Database;
  ASSETS?: Fetcher;
  OWNER_EMAIL?: string;          // único email con acceso (fase 1)
  OWNER_SETUP_CODE?: string;     // código de recuperación (32+ caracteres) para registrar el primer passkey
  RESEND_API_KEY?: string;       // enlace mágico por correo (opcional)
  MAIL_FROM?: string;            // remitente verificado en Resend
  GHL_WEBHOOK_SECRET?: string;
  [key: string]: unknown;
}
