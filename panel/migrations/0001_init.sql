-- Panel de lanzamientos: esquema inicial (D1 / SQLite).
-- Todas las fechas se guardan en UTC como texto ISO-8601 (ej. 2026-11-17T01:30:00.000Z).
-- Montos en centavos de USD (enteros).
-- No se guardan nombres, emails ni teléfonos en claro: solo hash SHA-256 normalizado.

-- ───────────── Configuración ─────────────
CREATE TABLE brands (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE experts (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE launches (
  id                    TEXT PRIMARY KEY,
  brand_id              TEXT NOT NULL REFERENCES brands(id),
  expert_id             TEXT REFERENCES experts(id),
  edition               TEXT NOT NULL,
  timezone              TEXT NOT NULL,             -- IANA, ej. America/Chicago
  price_single_cents    INTEGER,
  installments_count    INTEGER,                   -- NULL = por definir
  installment_cents     INTEGER,
  sales_goal            INTEGER,
  registrations_goal    INTEGER,
  ad_spend_cap_cents    INTEGER,
  expert_share_pct      REAL,                      -- ej. 40 = 40 % para el experto
  status                TEXT NOT NULL DEFAULT 'planned', -- planned | active | closed | historical
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE launch_milestones (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  launch_id  TEXT NOT NULL REFERENCES launches(id),
  kind       TEXT NOT NULL,  -- capture_start | ig_live | class_1 | class_2 | class_3 | cart_open | bonus_deadline | closing_live | cart_close
  starts_at  TEXT,           -- UTC; NULL = por definir
  label      TEXT
);

CREATE TABLE launch_deductions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  launch_id         TEXT NOT NULL REFERENCES launches(id),
  concept           TEXT NOT NULL,     -- ej. 'pauta', 'producción'
  amount_cents      INTEGER,           -- NULL = se toma de la fuente (ej. gasto real de Meta)
  source            TEXT               -- 'meta_spend' | 'manual'
);

CREATE TABLE launch_sources (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  launch_id    TEXT NOT NULL REFERENCES launches(id),
  source       TEXT NOT NULL,   -- meta | ghl | stripe | youtube
  ref_kind     TEXT NOT NULL,   -- ad_account | campaign | location | tag_registration | tag_purchase | tag_interest | stripe_account | stripe_product | stripe_price | youtube_video
  ref_value    TEXT NOT NULL,
  extra        TEXT             -- JSON opcional (ej. número de clase del video)
);

CREATE TABLE alert_rules (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  launch_id  TEXT NOT NULL REFERENCES launches(id),
  kind       TEXT NOT NULL,     -- cpl_high | spend_80 | spend_100 | hours_without_registrations | payment_failed | dispute_new | email_bounces | source_stale
  threshold  REAL
);

-- ───────────── Operación ─────────────
CREATE TABLE connections (
  id               TEXT PRIMARY KEY,        -- ej. 'ghl:kZT0P8HbGrGXuUGi7QJy', 'stripe:northbound'
  source           TEXT NOT NULL,
  label            TEXT,
  status           TEXT NOT NULL DEFAULT 'unknown', -- ok | error | stale | unknown
  last_data_at     TEXT,
  last_error_at    TEXT,
  last_error       TEXT
);

CREATE TABLE sync_runs (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  job          TEXT NOT NULL,
  started_at   TEXT NOT NULL,
  finished_at  TEXT,
  status       TEXT NOT NULL,        -- running | ok | error
  rows         INTEGER,
  detail       TEXT
);

-- ───────────── Inbox de webhooks (idempotente) ─────────────
-- GHL: un evento por (subcuenta, contacto, tipo de evento, conjunto de etiquetas).
-- received_at es la hora real del registro en tiempo real.
CREATE TABLE ghl_webhook_events (
  dedupe_key    TEXT PRIMARY KEY,
  location_id   TEXT NOT NULL,
  contact_id    TEXT NOT NULL,
  event         TEXT NOT NULL,       -- registro | compra | interesadonopago | otro
  tags          TEXT,                -- JSON array
  email_hash    TEXT,
  phone_hash    TEXT,
  attribution   TEXT,                -- JSON con utm_* / landing si llegaron
  received_at   TEXT NOT NULL,
  processed_at  TEXT
);
CREATE INDEX idx_ghl_events_contact ON ghl_webhook_events(location_id, contact_id);
CREATE INDEX idx_ghl_events_received ON ghl_webhook_events(location_id, event, received_at);

-- Stripe: un evento por event.id. El payload se guarda sin datos personales (redactado).
CREATE TABLE stripe_webhook_events (
  event_id      TEXT PRIMARY KEY,
  account       TEXT NOT NULL,       -- alias de la cuenta, ej. 'northbound'
  type          TEXT NOT NULL,
  created_at    TEXT NOT NULL,       -- event.created (UTC)
  livemode      INTEGER NOT NULL,
  payload       TEXT NOT NULL,       -- JSON redactado
  received_at   TEXT NOT NULL,
  processed_at  TEXT
);
CREATE INDEX idx_stripe_events_type ON stripe_webhook_events(account, type, created_at);
