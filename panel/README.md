# Panel de lanzamientos (Cloudflare Workers + D1)

Especificación: `../docs/SPEC.md`. Plan aprobado: `../docs/FASE-0-PLAN.md` (§4.2, costo $0/mes).

## Estado (entrega 1, 3 nov 2026)
- Receptor de webhooks de **GHL** en `POST /api/webhooks/ghl/{locationId}?evento=registro|compra|interesadonopago`.
  - Exige el header `X-Panel-Secret` (32 caracteres o más, comparado en tiempo constante).
  - Deduplica los reintentos.
  - Guarda la hora real de recepción, la hora exacta de registro.
  - Guarda solo el ID del contacto, las etiquetas, la atribución y el hash del email y del teléfono.
- Receptor de webhooks de **Stripe** en `POST /api/webhooks/stripe/{cuenta}`.
  - Verifica `Stripe-Signature`, con tolerancia de 5 min.
  - Deduplica por `event.id`.
  - Guarda el payload sin datos personales.
- `GET /api/salud` muestra el estado de cada fuente y la última vez que recibió datos.
- Hay un cron único cada minuto, el despachador, que por ahora solo registra que está vivo.
- Las definiciones de métricas de SPEC.md, la comparación "al mismo corte horario" y los formatos `$16,500` y "mar 17 nov" tienen pruebas en `test/`.

## Comandos
```bash
npm install
npm test            # pruebas de métricas, formatos y webhooks
npm run typecheck
npm run dev         # local (requiere .dev.vars con los secretos de prueba)
```

## Despliegue (una vez)
```bash
npx wrangler d1 create panel                 # copiar el database_id a wrangler.toml
npm run db:migrate:remote
npx wrangler secret put GHL_WEBHOOK_SECRET   # el mismo valor que va en el header de GHL
npx wrangler secret put STRIPE_WEBHOOK_SECRET_NORTHBOUND   # whsec_ del webhook de Stripe
npm run deploy
```
Requiere estas variables de entorno: `CLOUDFLARE_API_TOKEN` (plantilla "Edit Cloudflare Workers" más el permiso D1 Edit) y `CLOUDFLARE_ACCOUNT_ID`.

## Configuración en GHL (subcuenta Tax Master)
En cada workflow (registro, compra, interesadonopago) agrega la acción **Custom Webhook**:
- **Método:** POST.
- **URL:** `https://panel-lanzamientos.<subdominio>.workers.dev/api/webhooks/ghl/kZT0P8HbGrGXuUGi7QJy?evento=registro`. Cambia `evento` según el workflow.
- **Header:** `X-Panel-Secret` con el valor de `GHL_WEBHOOK_SECRET`.
- **Body JSON:** `contact_id`, `email`, `phone` y `tags`, más `utm_source`, `utm_medium`, `utm_campaign`, `utm_content` y la variante de landing si existen. Para cada uno usa el valor personalizado de GHL que corresponda (por ejemplo `{{contact.id}}`). El nombre exacto del valor lo confirmamos en la pantalla del workflow.
