# Contrato de ventas v1: sistema de cobros → panel

El sistema propio (que cobra con Stripe, Authorize.net y PayPal) le avisa al panel cada evento de venta. El panel **solo recibe** estos avisos y nunca le escribe al sistema.

## Envío
- `POST https://<panel>/api/webhooks/ventas/{sistema}`, donde `{sistema}` es un alias en minúsculas, por ejemplo `principal`.
- `Content-Type: application/json`
- La firma va en `X-Panel-Signature: t=<unix segundos>,v1=<hex>`. El valor `v1` es `HMAC-SHA256(secreto, "<t>.<cuerpo crudo>")`, el mismo esquema de Stripe. El secreto tiene 32 caracteres o más y se guarda en el panel como `VENTAS_WEBHOOK_SECRET_{SISTEMA}`.
- Se rechazan las firmas con más de 5 minutos de diferencia.
- **Idempotente:** el mismo `id` puede llegar varias veces y se guarda una sola.
- Ante cualquier respuesta distinta de 2xx, reintenta con espera exponencial.

| Respuesta | Significado |
|---|---|
| `200 {"ok":true,"duplicado":false}` | Evento guardado. |
| `200 {"ok":true,"duplicado":true}` | Ya existía, sin cambios. |
| `401` | Firma inválida o vencida. |
| `404` | Sistema no configurado en el panel. |
| `422 {"errores":[...]}` | El evento no cumple el contrato. No reintentar sin corregirlo. |

## Cuerpo
```json
{
  "id": "evt-8f2c…",                       // único por evento (no por orden)
  "tipo": "cuota.cobrada",
  "ocurrido_en": "2026-11-18T01:12:00Z",   // ISO-8601 con zona; el panel guarda en UTC
  "orden_id": "ORD-10293",
  "lanzamiento": "tm2",                    // id del lanzamiento en el panel (opcional si se mapea por producto)
  "producto": "TAX MASTER",
  "plan": { "tipo": "cuotas", "cuota_numero": 2, "cuotas_total": 3, "monto_cuota_centavos": 29500 },
  "monto_centavos": 29500,
  "moneda": "USD",
  "comision_centavos": 886,                // null si no se conoce (el neto se marca como estimado)
  "gateway": "authorize_net",              // stripe | authorize_net | paypal | otro
  "gateway_transaccion_id": "60212345678",
  "cliente": { "email": "…", "telefono": "…", "ghl_contact_id": "…" },
  "motivo": null,                          // motivo del fallo o del reembolso
  "estado_contracargo": null,              // abierto | ganado | perdido
  "prueba": false                          // true = no cuenta en las métricas
}
```

## Tipos de evento
| `tipo` | Cuándo enviarlo |
|---|---|
| `orden.pagada` | Primer cobro exitoso de la orden: pago único, o la cuota 1 si es en cuotas. |
| `cuota.cobrada` | Cada cuota siguiente cobrada (2 de N, 3 de N…). |
| `cuota.fallida` | Falló el cobro de una cuota. |
| `reembolso` | Reembolso, total o parcial. `monto_centavos` es lo reembolsado. |
| `contracargo` | Se abrió un contracargo. Usa `estado_contracargo: "abierto"`. |
| `contracargo.resuelto` | Se cerró un contracargo, con `estado_contracargo` en `ganado` o `perdido`. |
| `checkout.abandonado` | Se inició el pago y no se completó, si el sistema lo sabe. |

## Cómo cuenta el panel (SPEC §Definiciones)
- **Compra:** una orden con `orden.pagada`.
- **Ventas netas:** compras menos órdenes reembolsadas por completo y menos contracargos no ganados. Una orden se resta una sola vez. Los reembolsos parciales restan dinero, pero no restan la venta.
- **Cuotas pendientes:** `(cuotas_total − cuotas cobradas) × monto_cuota` de las órdenes vigentes. Forman parte del ingreso comprometido.
- **Comisiones:** suma de `comision_centavos`. Si alguna viene en `null`, el ingreso neto se muestra como **estimado**.
- **Datos personales:** el email y el teléfono se convierten en hash al llegar y nunca se guardan en claro. Sirven para cruzar al comprador con su registro en GHL. Si envías `ghl_contact_id`, el cruce es directo.

## Prueba
```bash
PANEL_URL=https://<panel> VENTAS_SECRET=<secreto> node panel/scripts/enviar-venta-prueba.mjs principal
```
Envía una venta marcada como `prueba: true`, que no se cuenta en las métricas.
