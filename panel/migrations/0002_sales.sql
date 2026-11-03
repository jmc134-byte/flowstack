-- Ventas desde el sistema de cobros propio (Stripe / Authorize.net / PayPal).
-- Contrato: docs/CONTRATO-VENTAS.md. Un evento por `id`, idempotente.
CREATE TABLE sales_events (
  event_id             TEXT PRIMARY KEY,
  system               TEXT NOT NULL,      -- alias del sistema emisor, ej. 'principal'
  type                 TEXT NOT NULL,      -- orden.pagada | cuota.cobrada | cuota.fallida | reembolso | contracargo | contracargo.resuelto | checkout.abandonado
  occurred_at          TEXT NOT NULL,      -- UTC
  order_id             TEXT NOT NULL,
  launch_id            TEXT,               -- id del lanzamiento en el panel (o NULL si se mapea por producto)
  product              TEXT,
  plan_type            TEXT,               -- unico | cuotas
  installment_number   INTEGER,
  installments_total   INTEGER,
  installment_cents    INTEGER,
  amount_cents         INTEGER NOT NULL,
  currency             TEXT NOT NULL DEFAULT 'USD',
  fee_cents            INTEGER,            -- NULL = desconocida (no se asume 0)
  gateway              TEXT NOT NULL,      -- stripe | authorize_net | paypal | otro
  gateway_txn_id       TEXT,
  email_hash           TEXT,
  phone_hash           TEXT,
  ghl_contact_id       TEXT,
  reason               TEXT,
  dispute_status       TEXT,               -- abierto | ganado | perdido
  received_at          TEXT NOT NULL,
  is_test              INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_sales_order ON sales_events(order_id);
CREATE INDEX idx_sales_launch_time ON sales_events(launch_id, occurred_at);
CREATE INDEX idx_sales_email ON sales_events(email_hash);
