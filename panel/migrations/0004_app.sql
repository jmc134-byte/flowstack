-- Acceso, carga manual y captura de YouTube.
ALTER TABLE launches ADD COLUMN notes TEXT;            -- pendientes por definir, visibles en Configuración
ALTER TABLE launches ADD COLUMN company_label TEXT;    -- quién recibe la parte que no es del experto

-- ───────────── Acceso (solo el dueño en fase 1; roles modelados para después) ─────────────
CREATE TABLE users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL
);

-- Roles (sin usar en fase 1): owner | media_buyer | sales | expert, acotables por marca o lanzamiento.
CREATE TABLE role_assignments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT NOT NULL REFERENCES users(id),
  role       TEXT NOT NULL,
  brand_id   TEXT REFERENCES brands(id),
  launch_id  TEXT REFERENCES launches(id)
);

CREATE TABLE webauthn_credentials (
  id            TEXT PRIMARY KEY,              -- credential ID (base64url)
  user_id       TEXT NOT NULL REFERENCES users(id),
  public_key    TEXT NOT NULL,                 -- base64url
  counter       INTEGER NOT NULL,
  transports    TEXT,
  device_label  TEXT,
  created_at    TEXT NOT NULL,
  last_used_at  TEXT
);

CREATE TABLE sessions (
  id_hash     TEXT PRIMARY KEY,                -- SHA-256 del token de la cookie
  user_id     TEXT NOT NULL REFERENCES users(id),
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  method      TEXT NOT NULL                    -- passkey | enlace | codigo
);

CREATE TABLE auth_tokens (
  token_hash  TEXT PRIMARY KEY,                -- enlace mágico o reto de passkey
  kind        TEXT NOT NULL,                   -- magic_link | webauthn_reg | webauthn_auth
  user_id     TEXT,
  payload     TEXT,
  expires_at  TEXT NOT NULL,
  used_at     TEXT
);

CREATE TABLE auth_attempts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kind        TEXT NOT NULL,
  at          TEXT NOT NULL,
  ok          INTEGER NOT NULL
);

-- ───────────── Carga manual desde el iPad ─────────────
CREATE TABLE manual_entries (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  launch_id    TEXT NOT NULL REFERENCES launches(id),
  kind         TEXT NOT NULL,      -- whatsapp_members | ig_live_peak | ig_live_end | note
  ref          TEXT,               -- ej. hito del live de IG
  value        REAL,
  text         TEXT,
  measured_at  TEXT NOT NULL,      -- UTC
  entered_at   TEXT NOT NULL
);
CREATE INDEX idx_manual_launch ON manual_entries(launch_id, kind, measured_at);

-- ───────────── YouTube (se llena con el conector de captura en vivo) ─────────────
CREATE TABLE youtube_samples (
  video_id            TEXT NOT NULL,
  sampled_at          TEXT NOT NULL,   -- UTC, al minuto
  concurrent_viewers  INTEGER,         -- NULL si YouTube no lo devolvió (no se asume 0)
  like_count          INTEGER,
  comment_count       INTEGER,
  view_count          INTEGER,
  PRIMARY KEY (video_id, sampled_at)
);
