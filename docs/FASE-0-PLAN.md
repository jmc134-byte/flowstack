# Fase 0: plan del panel de lanzamientos

Fecha: lun 2 nov 2026. Este documento responde a la fase 0 de `docs/SPEC.md`. No contiene código. Todo lo que dice de las APIs se revisó hoy en la documentación oficial. Lo que no pude confirmar está marcado **[sin verificar]** y se probará contra tus cuentas reales, solo con lectura, antes de usarlo.

---

## 1. Verificación de APIs

### 1.1 Meta Marketing API

| Tema | Hallazgo | Fuente |
|---|---|---|
| Versión | v26.0 (29 jul 2026), sin fecha de retiro. Usaremos v26.0 fija y vigilaremos el header `X-Ad-Api-Version-Warning`. | developers.facebook.com/docs/graph-api/changelog, …/marketing-api/overview/versioning |
| Endpoint | `GET /act_{id}/insights` con `level` = campaign, adset o ad, `time_increment=1` y `time_range={since,until}` en formato YYYY-MM-DD. | …/marketing-api/reference/ad-account/insights/ |
| Campos | `spend`, `impressions`, `cpm`, `ctr`, `clicks`, `inline_link_clicks`, `actions`, `cost_per_action_type`, `campaign_id/name`, `adset_id/name`, `ad_id/name`. | ídem |
| Leads y compras (`actions`) | Leads: `lead`, `offsite_conversion.fb_pixel_lead` y `onsite_conversion.lead_grouped`. Compras: `omni_purchase` y `offsite_conversion.fb_pixel_purchase`. **El action type `purchase` a secas no existe.** | …/reference/ads-action-stats/ |
| Atribución | `use_unified_attribution_setting=true` para cuadrar con el Administrador de anuncios. La documentación se contradice sobre la ventana por defecto, así que la fijaremos de forma explícita. | …/insights/ |
| Por hora | `hourly_stats_aggregated_by_advertiser_time_zone`. **No devuelve acciones fuera de Meta (los leads y compras del píxel)** ni reach ni frequency. Hay 13 meses de historia. La variante por zona horaria de la audiencia puede no estar disponible desde el 6 ago 2026. | …/insights/breakdowns |
| Zona horaria | Los datos vienen en la zona de la cuenta publicitaria ("We report ad insights data in the ad account's timezone"). Su campo es `timezone_name`. | …/insights/best-practices, …/reference/ad-account/ |
| Frescura | Se actualiza cada 15 min y queda fija a los 28 días. Hay 37 meses de historia. Los reportes asíncronos (POST y luego `report_run_id`) permiten 10 por cuenta al día. | …/insights/best-practices |
| Límites | Límite BUC por cuenta y por hora. En `ads_insights`, el nivel limitado da 600 + 400 × anuncios activos. Leeremos los headers `X-FB-Ads-Insights-Throttle`, `X-Ad-Account-Usage` y `X-Business-Use-Case(-Usage)`. | …/overview/rate-limiting |
| Acceso | El nivel limitado alcanza para tu propia cuenta, con `ads_read`. Permite 1 usuario del sistema más 1 administrador. `read_insights` no hace falta porque es para páginas. | …/overview/authorization, …/system-users/* |
| Registro de actividad | `GET /act_{id}/activities` devuelve `event_time`, `event_type`, `translated_event_type`, `object_id`, `object_name`, `object_type`, `extra_data`, `actor_name` y `date_time_in_timezone`. **Por defecto trae solo una semana**, y no está claro si acepta parámetros de rango **[sin verificar]**. | …/reference/ad-account/activities/ |

### 1.2 GHL (LeadConnector API v2)

| Tema | Hallazgo | Fuente |
|---|---|---|
| Base y headers | `https://services.leadconnectorhq.com`, con `Authorization: Bearer <PIT>`. El header `Version` cambia según el endpoint: `2021-07-28` para contactos y ubicaciones, `2021-04-15` para conversaciones. | Specs OpenAPI oficiales (github.com/GoHighLevel/highlevel-api-docs) |
| Token | Token de integración privada (PIT) estático. Se muestra una sola vez y se recomienda rotarlo cada 90 días. Los permisos se pueden editar sin regenerarlo. | marketplace.gohighlevel.com/docs/Authorization/PrivateIntegrationsToken.md |
| Permisos de solo lectura | `contacts.readonly`, `locations.readonly`, `locations/tags.readonly`, `locations/customFields.readonly`, `emails/stats.readonly` y `emails/campaigns.readonly`. | …/Authorization/Scopes.md |
| Contactos | Se usa `POST /contacts/search`, porque `GET /contacts/` está obsoleto. Pide hasta 100 por página, pagina con `searchAfter` y acepta filtros `{field, operator, value}` y `sort`. La sintaxis exacta de los filtros por etiqueta y por rango de `dateAdded` está **[sin verificar]**. | Spec contacts.json y catálogo oficial |
| Campos | La búsqueda trae `id`, `email`, `tags`, `dateAdded`, `source`, `customFields[{id,value}]` y `attributions[]`. El teléfono y `attributionSource`/`lastAttributionSource` solo salen en `GET /contacts/{id}`. | ídem |
| Atribución | `url`, `campaign`, `campaignId`, `utmSource`, `utmMedium`, `utmContent`, `referrer`, `fbclid`, `fbc`, `fbp`, `medium` y `mediumId`. **No hay `adId`, `utmCampaign` ni `utmTerm`.** | ídem |
| Hora de la etiqueta | **GHL no guarda cuándo se agregó una etiqueta.** El contacto solo tiene las etiquetas actuales. | …/docs/webhook/ContactTagUpdate.md |
| Campos personalizados | `GET /locations/{id}/customFields` traduce los IDs a nombres. | Spec locations.json |
| Límites | 100 solicitudes por cada 10 s y 200,000 al día por app y subcuenta, con headers `X-RateLimit-*`. No está confirmado que apliquen igual a los PIT **[sin verificar]**. | …/docs/other/rate-limits.md |
| Webhooks de workflows | La acción "Custom Webhook" acepta headers propios, pero **no firma con HMAC**. Los webhooks firmados (`X-GHL-Signature`, Ed25519) son exclusivos de las apps del Marketplace con OAuth. | help.gohighlevel.com art. 155000003305, …/WebhookIntegrationGuide.md |
| Correo | **Sí hay métricas de correo** en `GET /emails/locations/{locationId}/campaigns/stats/{source}/{sourceId}`. Trae `sent`, `delivered`, `opened`, `clicked`, `permanentFail` (rebote duro), `temporaryFail` (rebote suave), `unsubscribed`, `complained` y sus tasas. Es un endpoint nuevo que no aparece en el spec de GitHub, así que lo probaré con tu token. | …/docs/ghl/emails/get-campaign-stats.md |
| Zona horaria | `dateAdded` viene en ISO-8601 con "Z" (UTC según los ejemplos). `GET /locations/{id}` devuelve `timezone` en formato IANA. | Specs |
| Enlace al contacto | El formato `app.gohighlevel.com/v2/location/{loc}/contacts/detail/{id}` **no está documentado** y puede cambiar si usas un dominio propio. Lo confirmaré contigo. | — |

### 1.3 Stripe

| Tema | Hallazgo | Fuente |
|---|---|---|
| Clave | Clave restringida (`rk_live_`), con "Read" en cada recurso. Una clave de solo lectura no puede crear webhooks, así que el endpoint lo creas tú en el Dashboard y me pasas el `whsec_`. Se permiten hasta 16 destinos por cuenta. | docs.stripe.com/keys/restricted-api-keys, /webhooks |
| Comisiones | `balance_transaction` trae `amount`, `fee`, `fee_details[]`, `net`, `status` y `reporting_category`. Los payloads de los webhooks nunca vienen expandidos, así que la comisión se pide aparte. | /api/balance_transactions/object, /expand |
| Cuotas | El patrón oficial es un subscription schedule con `iterations` y `end_behavior=cancel`. Eventos: `invoice.paid`, `invoice.payment_failed`, `subscription_schedule.completed` y `.canceled`. | /billing/subscriptions/subscription-schedules |
| Checkouts no completados | Los Checkout Sessions con `status=expired` y el evento `checkout.session.expired` siempre dan **cantidad y monto**. **El email del abandono solo viene si la sesión tenía un Customer con email o si se pidió consentimiento de promociones.** | /api/checkout/sessions/object, /payments/checkout/abandoned-carts |
| Reembolsos y contracargos | Eventos `charge.refunded`, `refund.*`, `charge.dispute.created`, `.updated` y `.closed`, con `amount`, `status` y `reason`. | /api/refunds, /api/disputes |
| Webhooks | Firma HMAC en el header `Stripe-Signature` con tolerancia de 5 min. Se reintentan hasta 3 días y pueden llegar duplicados o desordenados, así que se deduplica por `event.id`. Los eventos se pueden consultar por la API durante 30 días. | /webhooks, /api/events |
| Límites | 100 lecturas por segundo en vivo y 20 en Search. Hay un tope de **500 lecturas por transacción**, en promedio sobre 30 días (mínimo 10,000 al mes). Por eso el diseño prioriza los webhooks y la lectura incremental. | /rate-limits |
| Horas | Las horas vienen en Unix UTC. | /api |
| Varias cuentas | Una clave restringida y un webhook por cuenta. Connect no aplica a este caso. | /get-started/account/orgs |

### 1.4 YouTube

| Tema | Hallazgo | Fuente |
|---|---|---|
| Conectados en vivo | `videos.list?part=liveStreamingDetails,statistics` devuelve `concurrentViewers` **solo mientras la transmisión está al aire** y solo si el dueño no ocultó el contador. También trae `actualStartTime`, `actualEndTime`, `activeLiveChatId`, `likeCount` y `commentCount`. | developers.google.com/youtube/v3/docs/videos |
| Cuota | Cuesta 1 unidad por llamada, de un total de 10,000 al día que se reinicia a la medianoche del Pacífico. Muestrear cada minuto durante una clase de 2 h gasta unas 120 unidades. | /youtube/v3/determine_quota_cost |
| Chat en vivo | `liveChatMessages.list` cuesta 5 unidades. Deja de funcionar al terminar el live (`liveChatEnded`). | /youtube/v3/live/docs/liveChatMessages/list |
| **Corrección importante** | **Los conectados sí se pueden recuperar después**, pero solo con YouTube Analytics API: `peakConcurrentViewers` y `averageConcurrentViewers` por minuto (`livestreamPosition`), con OAuth del dueño del canal. Lo usaremos como respaldo y para recuperar los de la edición 1. La captura en vivo sigue siendo la fuente principal. | /youtube/analytics/metrics, /channel_reports |
| Videos no listados | No está confirmado que una API key los lea **[sin verificar]**. Si usamos OAuth del canal, deja de importar. | — |

### 1.5 Plataforma

| Tema | Hallazgo |
|---|---|
| Vercel | El plan Hobby es **solo para uso no comercial** y sus crons corren una vez al día. El plan Pro cuesta $20/mes, permite crons cada minuto y funciones de hasta 800 s. |
| Supabase | El plan Free pausa el proyecto tras una semana sin actividad, así que no sirve. El plan Pro cuesta desde $25/mes con 8 GB de disco. Incluye pg_cron + pg_net, que sirve de respaldo para el disparo cada minuto. |
| Passkeys | En Supabase Auth están en fase **experimental** (beta de mayo 2026). Propongo SimpleWebAuthn con nuestra propia tabla de credenciales, sin depender de esa beta. Todavía no revisé la documentación de SimpleWebAuthn. |
| Enlace mágico | Resend gratis: 3,000 correos al mes. |
| Push en iPad | Funciona desde iPadOS 16.4 si la app está en la pantalla de inicio y el permiso se pide con un toque del usuario (webkit.org). Llega en la fase 2. |

---

## 2. Arquitectura

```
iPad / celular (PWA, Safari)
        │  HTTPS, sesión con cookie httpOnly
        ▼
Next.js (App Router, TypeScript) en Vercel Pro
  ├─ Pantallas: Resumen, Antes, Durante, Conexiones, Configuración, Carga manual
  ├─ /api/webhooks/stripe/{cuenta}   ← verifica Stripe-Signature
  ├─ /api/webhooks/ghl/{subcuenta}   ← secreto en header + confirmación por API
  ├─ /api/cron/*                     ← Vercel Cron (cada minuto o cada 15 min)
  └─ Capa de métricas: funciones puras y probadas → {valor, fuente, actualizadoA, parcial, estimado}
        │
        ▼
Supabase Postgres (Pro)
  inbox de eventos (idempotente) → tablas normalizadas → vistas de métricas
  pg_cron como disparador de respaldo del cron de YouTube
```

- **Solo lectura.** Los clientes de Meta, GHL y Stripe solo tienen métodos GET. El de Stripe permite además el POST de lectura de `invoices/create_preview`, si se usa. Las credenciales tampoco permiten escribir: `ads_read`, permisos `*.readonly` y una clave restringida en "Read".
- **Secretos.** Viven solo en variables de entorno de Vercel o en Supabase Vault, nunca en `NEXT_PUBLIC_*`. Una prueba automática revisará el bundle del cliente para confirmar que no contiene secretos.
- **Sincronización.** Todo llega primero a `raw_events`, con clave única (fuente + ID externo). El procesamiento es idempotente (upsert) y cada intento queda en `sync_runs` con su estado y su error. Ante un 429 o un 5xx se reintenta con espera exponencial, respetando los headers de límite.
- **Frecuencias.**
  - Meta: insights cada 15 min, porque así se actualizan, y el registro de actividad cada 15 min.
  - GHL: webhook en tiempo real y conciliación por API cada hora.
  - Stripe: webhooks y conciliación cada hora, usando listas con `created[gte]`.
  - YouTube: cada minuto, pero solo cuando hay una clase en ventana (desde 15 min antes hasta 30 min después del horario).
- **Zona horaria.** Todo se guarda en UTC. Los días de Meta vienen en la zona de la cuenta publicitaria. Si esa zona no es la de Chicago, el gasto por día se recalcula desde el desglose por hora y queda marcado de dónde sale.
- **Nunca ceros en silencio.** Cada métrica lleva su `fuente` y su `actualizadoA`. Si la fuente está caída, se muestra "sin datos desde HH:MM" y se dispara la alerta "fuente sin datos".
- **Repositorio.** Este repositorio contiene FlowStack, una app distinta con SQLite y NextAuth. Ver la pregunta 1 de la sección 8.

## 3. Modelo de datos (Postgres)

**Configuración**

- `brands` (id, nombre)
- `experts` (id, nombre)
- `launches`: id, marca, experto, edición, zona IANA, precio único, plan de cuotas (número y monto), meta de ventas, meta de registrados, tope de pauta, reparto (% experto) y estado.
- `launch_milestones`: lanzamiento, tipo (captación, live IG, clase 1–3, apertura de carrito, deadline de bonos, live de cierre, cierre) y `starts_at` en UTC.
- `launch_deductions`: concepto, monto y si se descuenta antes del reparto (por ejemplo, pauta y producción de $2,000).
- `launch_sources`: lanzamiento, tipo (meta / ghl / stripe / youtube) y referencia externa (cuenta y campañas, location y etiquetas, cuenta y productos o precios, video y número de clase).
- `alert_rules`: lanzamiento, tipo y umbral.

**Conexiones y sincronización**

- `connections`: fuente, cuenta, estado, último dato y último error. Guarda la referencia al secreto, nunca el secreto.
- `sync_runs`: fuente, rango, inicio, fin, filas, estado y error.
- `raw_events`: fuente, ID externo único, payload jsonb, recibido y procesado.

**Meta**

- `meta_entities`: nivel, id, nombre, padre y estado.
- `meta_insights_daily`: nivel, id, fecha en la zona de la cuenta, gasto, impresiones, clics, clics en enlace, leads por tipo, compras por tipo y `fetched_at`.
- `meta_insights_hourly`: lo mismo, sin acciones.
- `meta_activities`: hora, tipo, objeto y `extra_data`. De aquí sale "desde el último cambio".

**GHL**

- `ghl_contacts`: id, location, `email_hash`, `phone_hash`, `date_added`, etiquetas actuales, atribución (`utmSource`, `utmMedium`, `utmContent`, `campaign`, `campaignId`, dominio de `url`, si trae fbclid) y variante de landing. **No se guardan nombre, email ni teléfono en claro**, solo su hash SHA-256 normalizado para cruzar con Stripe.
- `registrations`: lanzamiento, contacto, `registered_at`, `precision` y canal atribuido (meta / orgánico / otro). La precisión es `exacta` si vino del webhook y `estimada` si sale de `dateAdded` en la carga histórica.
- `ghl_email_stats`: campaña o workflow, fecha y conteos.

**Stripe**

- `stripe_customers`: cuenta, id y `email_hash`.
- `stripe_payments`: cuenta, id del PI o charge, monto, comisión, neto, estado, `created`, precio o producto, lanzamiento, tipo (único o cuota n de N), cliente, contacto GHL cruzado y método del cruce (email o teléfono).
- `stripe_installment_plans`: suscripción o schedule, cuotas totales, pagadas, fallidas, monto y próximo cobro.
- `stripe_refunds` y `stripe_disputes`.
- `stripe_checkout_sessions`: estado, monto, `created`, `expires_at` y contacto si se pudo cruzar.

**YouTube**

- `youtube_samples`: video, `sampled_at`, conectados, likes, comentarios y vistas. Hay una fila por minuto.
- `youtube_broadcasts`: video, clase, inicio y fin reales.
- `youtube_analytics_minutes`: el respaldo post-live, un valor por minuto.

**Carga manual e historial**

- `manual_entries`: lanzamiento, tipo (miembros de WhatsApp, conectados en live de IG o nota), valor o texto, `measured_at` y `entered_at`.
- `imports` y `historical_series`: lanzamiento, métrica, hora o día de carrito relativo y valor. Se usan en la fase 2.

**Alertas y acceso**

- `alerts`: regla, disparo, dato, umbral, acción sugerida y si fue vista.
- `users`, `webauthn_credentials` y `role_assignments`. Los roles `owner`, `media_buyer`, `sales` y `expert` se pueden acotar a una marca o a un lanzamiento. Solo se modelan: en la fase 1 todo es `owner`.

Cada definición de `SPEC.md` es una función pura en `lib/metrics/*`, con pruebas sobre datos de ejemplo. Por ejemplo: CPL pagado = gasto de Meta / registrados con canal = meta.

## 4. Costo mensual estimado

| Concepto | USD/mes |
|---|---|
| Vercel Pro (1 usuario) | $20 |
| Supabase Pro (incluye la instancia Micro) | $25 |
| Resend (enlace mágico) | $0 (plan gratis) |
| APIs de Meta, GHL y YouTube | $0 |
| API de Stripe | $0. La documentación no lo dice explícitamente: no cobra por llamadas, pero dentro del tope de lecturas por transacción. |
| **Total** | **≈ $45/mes**, más un dominio si quieres uno propio (~$1–2 al mes) |

### 4.1 Opción low-cost (recomendada tras la revisión del 3 nov): ≈ $5/mes

Revisado en la documentación de Cloudflare el 3 nov 2026:

- **Workers Paid** cuesta $5 al mes (mínimo por cuenta) e incluye 10 millones de solicitudes y 30 millones de ms de CPU. Permite 250 tareas programadas (Cron Triggers) que pueden correr **cada minuto** (`* * * * *`, en UTC). Cada ejecución tiene hasta 30 s de CPU.
  - Fuente: developers.cloudflare.com/workers/platform/pricing, /limits y /configuration/cron-triggers
- **D1** es la base de datos (SQLite administrado). Con el plan pago incluye 25 mil millones de lecturas y 50 millones de escrituras al mes, más 5 GB. Permite restaurar a cualquier momento de los últimos **30 días** (Time Travel). No se pausa por inactividad y no cobra horas de cómputo.
  - Fuente: developers.cloudflare.com/d1/reference/time-travel
- **Por qué no Next.js aquí:** en Cloudflare, Next.js corre sobre vinext, que está en beta, o sobre el adaptador OpenNext, que la documentación presenta como alternativa de respaldo. No quiero arriesgar la semana de clases en eso.
  - Propuesta: **React + Vite como PWA estática** y una API en **Hono** dentro del mismo Worker. Sigue siendo TypeScript, y las métricas y las pruebas no cambian.
- **Por qué no el plan gratis de Workers:** limita la CPU a 10 ms por solicitud y permite solo 5 cron triggers. Procesar un webhook o una página de insights puede pasar ese límite, y fallar en plena clase no es aceptable.
- **Se mantiene igual:** solo lectura, secretos solo en el servidor (Worker secrets), webhooks verificados, inbox idempotente, el modelo de datos de la sección 3 (en SQLite) y el acceso con passkey o enlace mágico (Resend gratis). Que SimpleWebAuthn funcione en Workers está **[sin verificar]**; lo pruebo el primer día, y si falla el acceso queda solo con enlace mágico hasta resolverlo.

| Opción | Servicios | USD/mes | Riesgo |
|---|---|---|---|
| **A, recomendada** | Cloudflare Workers Paid + D1 + Resend gratis + subdominio `*.workers.dev` | **$5** | Bajo. Hay que cambiar de framework, sin efecto en las funciones. |
| B, intermedia | Vercel Pro + Neon Postgres Free (1 GB, 100 horas de CU al mes, se suspende a los 5 min sin uso, no borra datos) | $20 | Las horas de cómputo de Neon pueden no alcanzar en la semana del carrito si sincronizamos cada 15 min. |
| C, original | Vercel Pro + Supabase Pro | $45 | Bajo. Es la más cara. |

### 4.2 Ahorro máximo: $0/mes, con salida a $5 si hace falta (elegido el 3 nov)

Se usa el plan gratis de Workers con D1 gratis. Sus límites son: 100,000 solicitudes al día, 10 ms de CPU por ejecución, 5 cron triggers por cuenta, 50 subrequests por ejecución, y en D1, 5 millones de lecturas y 100,000 escrituras al día con 5 GB. El diseño tiene que caber en esos límites:

- **Un solo cron cada minuto** que decide qué toca:
  - YouTube, solo dentro de la ventana de cada clase (15 min antes y 30 min después).
  - Meta, GHL y Stripe cada 15 min en semanas de lanzamiento y cada hora fuera de ellas.
  - Son 1,440 ejecuciones al día, muy por debajo del límite.
- **Trabajo en pedazos pequeños.** Las cargas históricas y la paginación avanzan una página por ejecución, con el cursor guardado en D1. Así cada ejecución queda bajo los 10 ms de CPU y las 50 subrequests. La espera de red no cuenta como CPU.
- **Webhooks con trabajo mínimo.** Al llegar uno solo se verifica la firma o el secreto y se guarda en el inbox. El procesamiento ocurre en el siguiente minuto.
- **Métricas preagregadas** en tablas resumen, para que cada pantalla haga pocas lecturas.
- **Vigilancia de los límites.** La pantalla Conexiones muestra los errores por límite de CPU. Si un trabajo los pasa de forma repetida, se cambia a Workers Paid ($5) **sin tocar el código**. Recomiendo hacer ese cambio de forma preventiva del 16 al 25 nov, si el live de prueba del 12 nov muestra algún error.
- **Riesgo.** Una ejecución que falla se reintenta al minuto siguiente. En YouTube eso puede costar un minuto de curva, y el respaldo de YouTube Analytics lo cubre.

Ahorros que aplican en cualquier opción:
- Usar el subdominio gratuito en lugar de un dominio propio.
- Sincronizar cada hora fuera de las semanas de lanzamiento y cada 15 min solo durante ellas.
- Muestrear YouTube solo dentro de la ventana de cada clase.

## 5. Credenciales y datos que necesito

**Meta**
1. ID del Business Manager y de cada cuenta publicitaria (`act_…`), con la zona horaria que tiene configurada.
2. Una app de Meta de tipo Business en ese mismo Business Manager: su App ID y su App Secret (este último para `appsecret_proof`).
3. El token del usuario del sistema con `ads_read`, y la cuenta publicitaria asignada a ese usuario con permiso de ver rendimiento. Los pasos están en la sección 7.

**GHL** (por cada subcuenta: Tax Master `kZT0P8HbGrGXuUGi7QJy` y Profinance)
4. El PIT, con `contacts.readonly`, `locations.readonly`, `locations/tags.readonly`, `locations/customFields.readonly`, `emails/stats.readonly` y `emails/campaigns.readonly`.
5. Los nombres exactos de las etiquetas: registro de TM2, compra de TM2, `interesadonopago` y `comprotm1`.
6. El nombre del campo oculto de variante de landing, si existe.

**Stripe** (por cada cuenta, empezando por Northbound Studio)
7. Una clave restringida con "Read" en Charges, PaymentIntents, Checkout Sessions, Invoices, Subscriptions, Subscription Schedules, Customers, Products, Prices, Refunds, Disputes, Balance transactions y Events.
8. El `whsec_` del webhook que crees (pasos en la sección 7).

**YouTube**
9. Un proyecto de Google Cloud con YouTube Data API v3 y YouTube Analytics API activadas, y una API key restringida a esas APIs.
10. Una autorización OAuth, una sola vez, del dueño del canal con `youtube.readonly` y `yt-analytics.readonly`. Sirve para el respaldo y para recuperar la edición 1.
11. Los IDs de los videos de las 3 clases, en cuanto programes los lives.

**Plataforma**
12. Una cuenta de Cloudflare con Workers Paid ($5) en la opción A, o Vercel y Neon/Supabase en la B o la C. Además, tu email para la lista de acceso y una API key de Resend.

## 6. Lo que no se puede obtener por API

| Métrica de SPEC.md | Qué pasa | Alternativa |
|---|---|---|
| Miembros de la comunidad de WhatsApp | No hay API para esto. | Carga manual desde el iPad, como pide el spec. |
| Conectados en los lives de Instagram | No lo verifiqué; el spec ya lo trata como manual. | Carga manual: pico y conectados al final. |
| **Hora exacta de registro** (cuándo se puso la etiqueta) | GHL no guarda la hora de las etiquetas. | El webhook del workflow registra la hora exacta desde que esté activo. Para los registros anteriores, y para contactos que ya existían de lanzamientos pasados, se usa `dateAdded` y se marca **estimado**. **Conviene activar el webhook mañana, el día que empieza la captación.** |
| Webhook de GHL "verificado por firma" | Los webhooks de los workflows no se firman. | Secreto largo en un header más verificación de cada contacto contra la API antes de contarlo. La firma Ed25519 exigiría una app del Marketplace con OAuth, que queda como opción para después. **Es un cambio a lo que pide el spec y necesito tu OK.** |
| Anuncio de origen del registrado | GHL no tiene `adId`. | Poner `utm_content={{ad.id}}` (y `utm_campaign={{campaign.id}}`) en los parámetros de URL de los anuncios. GHL lo guarda en `utmContent`. Si no se configura, el cruce solo llega a nivel de campaña o fuente. |
| Leads y compras de Meta por hora | El desglose por hora no trae acciones del píxel. | Por hora solo se muestra el gasto. Los registros por hora salen de GHL, que de todos modos es la definición oficial. Los leads de Meta se comparan por día. |
| Registro de actividad de Meta de más de una semana | La API trae una semana por defecto. | Lo guardamos desde ya, así se acumula. Para antes de esa semana, exportar el historial desde el Administrador de anuncios. |
| Email del checkout no completado | Stripe solo lo da si había Customer o consentimiento. | Siempre tenemos la cantidad y el monto. Para la lista de Ventas, usar la etiqueta `interesadonopago` de GHL o la configuración del checkout (ver la pregunta 2). |
| Comisión de cuotas futuras | Solo se conoce al cobrar. | El ingreso comprometido usa el bruto. Si se muestra un neto proyectado, va marcado **estimado** con la tasa real observada. |
| Conectados de la edición 1 (oct 2026) | No se capturaron en vivo. | YouTube Analytics API, por minuto, con el OAuth del canal. Si no hay acceso, va en el importador. |
| Ventas por hora de carrito de lanzamientos anteriores a TM1 | Están fuera de las fuentes conectadas o no hay mapeo. | El importador de XLSX (`curvas_lanzamientos_tax_master.xlsx`) en la fase 2. |

## 7. Lo que tienes que configurar tú

**A. Usuario del sistema en Meta** (las rutas de pantalla vienen del centro de ayuda; los nombres de los menús pueden variar un poco)
1. En business.facebook.com, abre Configuración del negocio → Usuarios → Usuarios del sistema → Agregar. Ponle de nombre "panel-lectura" y rol Empleado, no Administrador.
2. En el mismo usuario, entra a Asignar activos → Cuentas publicitarias. Elige la cuenta y marca **solo** el permiso de ver rendimiento, sin administrar campañas.
3. Si no tienes app, ve a developers.facebook.com → Mis apps → Crear app → tipo Business, vinculada al mismo Business Manager.
4. De vuelta en el usuario del sistema, haz clic en Generar token, elige la app y marca solo `ads_read`. Si te ofrece caducidad, elige la de 60 días (te avisaré antes de que venza) o "nunca", si prefieres.
5. Pásame el token por un canal seguro, no por chat. Lo cargaremos directo en Vercel.

**B. Parámetros de URL en los anuncios** (lo hace el media buyer; no es un cambio que haga el panel)
En cada anuncio, en Parámetros de URL: `utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.id}}&utm_content={{ad.id}}`

**C. Webhook en el workflow de registro de GHL** (subcuenta Tax Master)
1. Abre Automation → el workflow que pone la etiqueta de registro de TM2 → Agregar acción → **Custom Webhook**.
2. Configura: método POST, URL `https://<panel>/api/webhooks/ghl/kZT0P8HbGrGXuUGi7QJy`, body JSON con `contact_id`, `email` y `tags`.
3. Agrega el header `X-Panel-Secret: <secreto que te daré>`.
4. Repite lo mismo en los workflows de compra y de `interesadonopago`.

Mientras el panel no esté desplegado, te daré una URL temporal que solo guarda los eventos, para no perder los registros desde el 3 nov.

**D. Webhook de Stripe** (cuenta Northbound Studio)
1. Ve a Workbench → Webhooks → Crear destino de eventos, con la URL `https://<panel>/api/webhooks/stripe/northbound`.
2. Suscribe estos eventos: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.succeeded`, `charge.failed`, `charge.refunded`, `refund.created`, `refund.updated`, `charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `subscription_schedule.completed` y `subscription_schedule.canceled`.
3. Copia el `whsec_…`.

**E. Clave restringida de Stripe**: Developers → API keys → Crear clave restringida → "Read" en los recursos de la credencial 7.

**F. YouTube**: programa los 3 lives con anticipación y pásame los IDs. Haremos un **live de prueba de 10 min el jue 12 nov** para validar la captura.

## 8. Preguntas que bloquean decisiones

1. **Repositorio.** Este repositorio tiene FlowStack, otra app. Las opciones son:
   - **(a)** Crear un repositorio vacío nuevo (por ejemplo `panel-lanzamientos`) para que yo lo agregue. Es lo que recomiendo.
   - **(b)** Reemplazar FlowStack en este mismo repositorio, en una rama nueva.
2. **¿Cómo cobras?** Puede ser Stripe Checkout o Payment Links, o un formulario de pedido de GHL conectado a Stripe. Esto define cómo se detectan las cuotas y si existen checkouts abandonados en Stripe. ¿Las cuotas son un plan de N pagos?
3. **Landings.** ¿`masterclass.tax-master.us` y `tax-master.us/cursocompleto` son funnels de GHL, que capturan los UTM solos, o son externas con formulario embebido? ¿Cada URL es una "variante" distinta?
4. **YouTube.** ¿Los lives son públicos o no listados? ¿Quién es dueño del canal y puede hacer la autorización OAuth?
5. **Enlaces a GHL.** Copia la URL de un contacto desde tu navegador, para confirmar el formato y el dominio.
6. **Webhook de GHL sin firma.** ¿Apruebas secreto en header más verificación por API en lugar de la firma (ver la sección 6)?

## 9. Calendario de la fase 1 (objetivo: lun 16 nov)

| Fechas | Entrega |
|---|---|
| mar 3 – mié 4 nov | Proyecto, base de datos y despliegue. Receptor de webhooks de GHL activo, para no perder registros. Acceso con enlace mágico. Configuración de lanzamientos con TM2 cargado. |
| jue 5 – vie 6 | Conector de GHL (carga histórica y conciliación) y conector de Meta (insights y actividad). **Conciliación de cada uno.** |
| sáb 7 – lun 9 | Conector de Stripe (webhooks y carga histórica de TM1 y TM2) con **conciliación**, y cruce con GHL. Pantallas Resumen y Antes. |
| mar 10 – mié 11 | Captura de YouTube (cada minuto y respaldo con Analytics), carga manual lista para el **live de IG del 11 nov**, y passkey. |
| jue 12 | **Live de prueba en YouTube** y ajustes. |
| vie 13 – dom 15 | Durante, alertas, Conexiones, PWA y prueba en tu iPad. |
| lun 16 | Entrega de la fase 1 y conciliación final. |

La conciliación de cada conector compara, en el mismo rango, el total de la fuente con el total del panel:

| Fuente | Total en la fuente | Total en el panel |
|---|---|---|
| Meta | Gasto y leads del Administrador de anuncios | `meta_insights_daily` |
| GHL | Conteo de contactos filtrado por etiqueta en GHL | `registrations` |
| Stripe | Total bruto, reembolsos y comisiones del Dashboard | `stripe_payments` |
