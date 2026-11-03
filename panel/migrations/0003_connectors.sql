-- Estado de trabajos de sincronización por pedazos (una página por ejecución del cron).
CREATE TABLE sync_state (
  job           TEXT PRIMARY KEY,     -- ej. 'meta:insights:act_123:ad'
  cursor        TEXT,                 -- JSON con el avance (rango y página)
  next_run_at   TEXT NOT NULL,        -- UTC
  last_ok_at    TEXT,
  last_error    TEXT,
  attempts      INTEGER NOT NULL DEFAULT 0
);

-- ───────────── Meta ─────────────
CREATE TABLE meta_insights_daily (
  account_id       TEXT NOT NULL,
  level            TEXT NOT NULL,      -- campaign | adset | ad
  entity_id        TEXT NOT NULL,
  date             TEXT NOT NULL,      -- YYYY-MM-DD en la zona de la cuenta publicitaria
  campaign_id      TEXT,
  campaign_name    TEXT,
  adset_id         TEXT,
  adset_name       TEXT,
  ad_id            TEXT,
  ad_name          TEXT,
  spend_cents      INTEGER NOT NULL,
  impressions      INTEGER NOT NULL,
  clicks           INTEGER NOT NULL,
  link_clicks      INTEGER,
  leads            INTEGER,            -- action_type 'lead'
  purchases        INTEGER,            -- action_type 'omni_purchase'
  actions          TEXT,               -- JSON completo de actions (para auditoría)
  fetched_at       TEXT NOT NULL,
  PRIMARY KEY (account_id, level, entity_id, date)
);
CREATE INDEX idx_meta_daily_date ON meta_insights_daily(account_id, level, date);

CREATE TABLE meta_activities (
  account_id      TEXT NOT NULL,
  event_time      TEXT NOT NULL,       -- UTC
  event_type      TEXT NOT NULL,
  translated      TEXT,
  object_id       TEXT,
  object_name     TEXT,
  object_type     TEXT,
  actor_name      TEXT,
  extra_data      TEXT,
  PRIMARY KEY (account_id, event_time, event_type, object_id)
);

-- ───────────── GHL (carga histórica y conciliación por API) ─────────────
CREATE TABLE ghl_contacts (
  location_id     TEXT NOT NULL,
  contact_id      TEXT NOT NULL,
  date_added      TEXT,                -- UTC
  tags            TEXT,                -- JSON array (minúsculas)
  email_hash      TEXT,
  source          TEXT,
  attribution     TEXT,                -- JSON (utm, campaign, url) sin datos personales
  synced_at       TEXT NOT NULL,
  PRIMARY KEY (location_id, contact_id)
);
CREATE INDEX idx_ghl_contacts_email ON ghl_contacts(email_hash);
