-- Lanzamientos de docs/SPEC.md. Horas en UTC. Lo que la especificación deja "por definir" queda NULL
-- y aparece en `notes` para completarlo en Configuración.
INSERT INTO brands (id, name) VALUES ('taxmaster', 'TAX MASTER (Northbound)'), ('profinance', 'Profinance Academy');
INSERT INTO experts (id, name) VALUES ('susana-aguilar', 'Susana Aguilar'), ('marielys-bravo', 'Marielys Bravo');

-- TAX MASTER 2.ª edición. Zona: Chicago. Clases 7:30 PM Miami (EST, UTC−5) = 00:30Z del día siguiente.
INSERT INTO launches (id, brand_id, expert_id, edition, timezone, price_single_cents, installments_count, installment_cents,
  sales_goal, registrations_goal, ad_spend_cap_cents, expert_share_pct, status, notes, company_label)
VALUES ('tm2', 'taxmaster', 'susana-aguilar', '2.ª edición', 'America/Chicago', 78500, NULL, NULL, NULL, NULL, 1650000, 40, 'active',
  'Por definir: plan de cuotas, fecha de cierre, horas de los lives de IG (11 y 13 nov), del deadline de bonos (vie 20 nov) y del live de cierre (mar 24 nov), metas de ventas y de registrados. Confirmar reparto: 60 % empresa / 40 % experta después de pauta y $2,000 de producción. Confirmar nombres exactos de etiquetas de GHL.',
  'Northbound');
INSERT INTO launch_milestones (launch_id, kind, starts_at, label) VALUES
  ('tm2', 'capture_start',  '2026-11-03T06:00:00.000Z', 'Inicio de captación'),
  ('tm2', 'ig_live',        NULL,                       'Live de IG · mié 11 nov (hora por definir)'),
  ('tm2', 'ig_live',        NULL,                       'Live de IG · vie 13 nov (hora por definir)'),
  ('tm2', 'class_1',        '2026-11-18T00:30:00.000Z', 'Clase 1'),
  ('tm2', 'class_2',        '2026-11-19T00:30:00.000Z', 'Clase 2'),
  ('tm2', 'cart_open',      '2026-11-19T00:30:00.000Z', 'Apertura de carrito (en la clase 2)'),
  ('tm2', 'class_3',        '2026-11-20T00:30:00.000Z', 'Clase 3'),
  ('tm2', 'bonus_deadline', NULL,                       'Deadline de bonos · vie 20 nov (hora por definir)'),
  ('tm2', 'closing_live',   NULL,                       'Live de cierre · mar 24 nov (hora por definir)'),
  ('tm2', 'cart_close',     NULL,                       'Cierre (por definir)');
INSERT INTO launch_deductions (launch_id, concept, amount_cents, source) VALUES
  ('tm2', 'Pauta (gasto real de Meta)', NULL, 'meta_spend'),
  ('tm2', 'Producción', 200000, 'manual');
INSERT INTO launch_sources (launch_id, source, ref_kind, ref_value, extra) VALUES
  ('tm2', 'ghl', 'location', 'kZT0P8HbGrGXuUGi7QJy', '{"label":"Subcuenta Tax Master"}'),
  ('tm2', 'ghl', 'tag_registration', 'registrotm2', '{"placeholder":true}'),
  ('tm2', 'ghl', 'tag_purchase', 'compratm2', '{"placeholder":true}'),
  ('tm2', 'ghl', 'tag_interest', 'interesadonopago', NULL),
  ('tm2', 'stripe', 'stripe_account', 'northbound', '{"label":"Northbound Studio"}'),
  ('tm2', 'ventas', 'sistema', 'principal', '{"label":"Sistema de cobros propio"}'),
  ('tm2', 'landing', 'landing', 'masterclass.tax-master.us', NULL),
  ('tm2', 'landing', 'landing', 'tax-master.us/cursocompleto', NULL);
INSERT INTO alert_rules (launch_id, kind, threshold) VALUES
  ('tm2', 'cpl_high', 1500), ('tm2', 'spend_80', 80), ('tm2', 'spend_100', 100),
  ('tm2', 'hours_without_registrations', 3), ('tm2', 'payment_failed', 1), ('tm2', 'dispute_new', 1),
  ('tm2', 'email_bounces', 5), ('tm2', 'source_stale', 2);

-- TAX MASTER edición 1 (histórico). Compradores con etiqueta comprotm1.
INSERT INTO launches (id, brand_id, expert_id, edition, timezone, price_single_cents, ad_spend_cap_cents, expert_share_pct, status, notes, company_label)
VALUES ('tm1', 'taxmaster', 'susana-aguilar', 'Edición 1', 'America/Chicago', NULL, NULL, NULL, 'historical',
  'Histórico. Por definir: horas de las clases (20–22 oct), precio, inicio de captación y etiqueta de registro.', 'Northbound');
INSERT INTO launch_milestones (launch_id, kind, starts_at, label) VALUES
  ('tm1', 'class_1', NULL, 'Clase 1 · mar 20 oct (hora por definir)'),
  ('tm1', 'class_2', NULL, 'Clase 2 · mié 21 oct (hora por definir)'),
  ('tm1', 'class_3', NULL, 'Clase 3 · jue 22 oct (hora por definir)');
INSERT INTO launch_sources (launch_id, source, ref_kind, ref_value, extra) VALUES
  ('tm1', 'ghl', 'location', 'kZT0P8HbGrGXuUGi7QJy', '{"label":"Subcuenta Tax Master"}'),
  ('tm1', 'ghl', 'tag_purchase', 'comprotm1', NULL);

-- Profinance Academy, diciembre 2026.
INSERT INTO launches (id, brand_id, expert_id, edition, timezone, status, notes)
VALUES ('pf-dic26', 'profinance', 'marielys-bravo', 'Diciembre 2026', 'America/New_York', 'planned',
  'Por definir: zona horaria (provisional: Miami), horas de las clases (1–3 dic), resto de hitos, precios, tope de pauta, reparto y fuentes.');
INSERT INTO launch_milestones (launch_id, kind, starts_at, label) VALUES
  ('pf-dic26', 'class_1', NULL, 'Clase 1 · mar 1 dic (hora por definir)'),
  ('pf-dic26', 'class_2', NULL, 'Clase 2 · mié 2 dic (hora por definir)'),
  ('pf-dic26', 'class_3', NULL, 'Clase 3 · jue 3 dic (hora por definir)');
