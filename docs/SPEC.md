# Panel de control de lanzamientos

Vas a construir un panel web para controlar mis lanzamientos de principio a fin: antes (captación), durante (lives, clases y carrito) y después (cierre, cobros y liquidación), con el historial de todos. Lo voy a usar sobre todo desde mi iPad. Cada número tiene que salir de una fuente real; si algo es estimado, se marca como estimado.

Antes de empezar, guarda este documento como docs/SPEC.md y trabaja siempre contra él.

## Cómo vamos a trabajar
1. Fase 0, sin código: verifica en la documentación oficial cada API (endpoints, permisos, límites de uso y zona horaria de los datos) y devuélveme el plan: arquitectura, modelo de datos, costo mensual estimado, la lista exacta de credenciales que necesitas y qué métricas de este documento NO se pueden obtener por API, con la alternativa (webhook, carga manual o exportación). No inventes endpoints ni campos. Espera mi OK.
2. Luego construye por fases. Al terminar cada conector, muéstrame una conciliación: mismo rango de fechas, total en la fuente contra total en el panel.
3. El panel solo lee. No crea, edita ni pausa nada en Meta, GHL ni Stripe.
4. Si necesitas que yo configure algo (un webhook en un workflow de GHL, un usuario del sistema en Meta), dame los pasos exactos.

## Cómo es un lanzamiento
Manejo varias marcas (Profinance Academy, TAX MASTER de Northbound y las que vengan) y cada una lanza varias veces al año:
- Captación con anuncios de Meta hacia una landing de registro; los registrados entran a GHL.
- Lives previos por Instagram.
- 3 clases en vivo por YouTube: martes, miércoles y jueves.
- El carrito abre en la clase 2; deadline de bonos el viernes; live de cierre el martes siguiente; luego el cierre.
- Pago único o cuotas, cobrados en Stripe; garantía de 7 días.
- Liquidación con el experto: del ingreso se descuentan gastos y se reparte un porcentaje.

Cada lanzamiento se configura en el panel: marca, experto, edición, fecha y hora de cada hito, zona horaria del lanzamiento, precios, meta de ventas, tope de pauta, reparto, gastos que se descuentan y el mapeo a sus fuentes (cuenta publicitaria y campañas, subcuenta y etiquetas de GHL, cuenta y productos de Stripe, videos de YouTube).

## Fuentes
- **Meta Marketing API** (token de usuario del sistema, solo lectura): gasto, impresiones, CPM, CTR, clics, leads y compras por campaña, conjunto y anuncio, por día y por hora; y el registro de actividad de la cuenta para saber cuándo hubo cambios.
- **GHL (API v2 de LeadConnector)**, con token de integración privada por subcuenta: contactos con fecha de registro, etiquetas clave (registro, compra, interesadonopago) y atribución (UTM y variante de landing si llega en un campo oculto). Webhooks desde los workflows para los registros en tiempo real y una conciliación periódica por la API. Verifica si expone métricas de correo (enviados, rebotes, aperturas).
- **Stripe** (clave restringida de solo lectura y webhooks firmados): pagos, cuotas, pagos fallidos, checkouts no completados si el checkout lo permite, reembolsos, contracargos y comisiones. Puede haber una cuenta por marca.
- **YouTube Data API**: durante cada clase en vivo, guarda los conectados (concurrentViewers) cada minuto para tener la curva, el pico y los conectados al final, más likes y comentarios. Esto solo se puede capturar mientras la clase está al aire.
- **Carga manual** rápida desde el iPad para lo que no tiene API: miembros de la comunidad de WhatsApp, conectados en los lives de Instagram y notas del día.
- **Historial**: importador de CSV y XLSX para lanzamientos pasados (ventas por día de carrito, leads, gasto, conectados). Te voy a pasar curvas_lanzamientos_tax_master.xlsx.

Cruza compradores de Stripe con contactos de GHL por email normalizado (teléfono como respaldo) para saber cuándo se registró cada comprador y de qué anuncio vino. No copies datos personales que no hagan falta: guarda el ID del contacto y enlaza a GHL.

## Pantallas
- **Resumen**: el lanzamiento activo en una pantalla: fase, cuenta regresiva al próximo hito, gasto contra tope, registrados, CPL, ventas, ingreso, alertas y la hora de actualización de cada fuente.
- **Antes**: registrados por día y acumulado contra meta; CPL pagado y total; gasto por campaña y anuncio; ritmo de gasto con proyección contra el tope; resultados por variante de landing; registrados en GHL contra leads de Meta; comunidad de WhatsApp.
- **Durante**: curva en vivo y show up de cada clase; ventas por hora desde la apertura; mix de pago único y cuotas; ventas por cada 100 conectados en vivo; listas para Ventas (pago fallido o checkout no completado, con enlace al contacto en GHL); cuenta regresiva del deadline; curva del carrito contra lanzamientos anteriores a la misma hora de carrito.
- **Después**: ventas netas; cuotas cobradas, pendientes y fallidas; ingreso bruto, neto y comprometido; CPA y ROAS; conversión por antigüedad del lead (días entre registro y clase 1); liquidación con el experto y su PDF.
- **Historial**: todos los lanzamientos con sus métricas clave, filtros por marca y experto, y el registro de cada conversión (hora, anuncio de origen, tipo de pago).
- **Conexiones**: estado de cada fuente, último dato recibido y errores. Si una fuente falla, el panel lo dice; nunca muestra ceros en silencio.

## Definiciones (no las cambies sin avisarme)
- Registrados: contactos únicos de GHL con la etiqueta de registro del lanzamiento.
- CPL pagado = gasto de Meta / registrados atribuidos a Meta. CPL total = gasto / registrados totales.
- Show up de una clase = pico de conectados / registrados al inicio de esa clase.
- Ventas netas = compras menos reembolsos y contracargos. Conversión = ventas netas / registrados.
- Ingreso comprometido incluye las cuotas por cobrar. Ingreso neto descuenta comisiones de Stripe y reembolsos.
- CPA = gasto total / ventas netas. ROAS = ingreso comprometido / gasto.

## Lectura y alertas
- La lectura válida es el cierre del día. Durante el día, compara solo contra el mismo corte horario de días anteriores, nunca contra días completos: mi público usa poco el celular en horario laboral y sube en la tarde y la noche. Marca como parcial el día en curso.
- En pauta, muestra los resultados desde el último cambio de campaña, sin arrastrar semanas anteriores.
- Cada alerta lleva icono, el dato, el umbral y la acción sugerida para hoy. Umbrales configurables por lanzamiento: CPL alto, gasto al 80 % y al 100 % del tope, horas sin registros durante la captación, pagos fallidos, contracargo nuevo, rebotes de correo y fuente sin datos.
- Un resumen del día corto, con solo lo nuevo; el detalle completo va en una vista semanal.

## Requisitos técnicos
- Web app pensada primero para iPad (Safari, vertical y horizontal), instalable en la pantalla de inicio (PWA) y usable en celular. Modo oscuro, botones grandes y gráficos táctiles.
- Stack: propónlo en la fase 0 con su costo. Si no hay una razón fuerte para otra cosa: Next.js con TypeScript, Postgres (Supabase) y tareas programadas para sincronizar.
- Interfaz en español neutro, montos en USD con formato $16,500 y fechas como "mar 17 nov". Guarda en UTC y muestra en la zona del lanzamiento, con la hora de Miami al lado en los contadores.
- Seguridad: acceso solo para mí con passkey (Face ID) o enlace mágico; credenciales solo en el servidor; webhooks verificados por firma; sincronización idempotente y con reintentos.
- Deja listo el modelo de roles para después (sin construirlo): media buyer solo con pauta, ventas solo con sus listas y vista del experto con su calendario y su liquidación, sin registrados, CPL, show up ni conversión.
- Pruebas automáticas de los cálculos de métricas con datos de ejemplo.

## Lanzamientos para cargar
- **TAX MASTER 2.ª edición** (experta Susana Aguilar): captación desde el 3 nov 2026; lives de IG 11 y 13 nov; clases 17, 18 y 19 nov a las 7:30 PM hora de Miami por YouTube; carrito abre el 18; deadline de bonos vie 20 nov; live de cierre mar 24 nov; cierre por definir. Zona del lanzamiento: hora de Chicago. Pago único $785, cuotas por definir. Tope de pauta $16,500. Reparto 60/40 después de pauta y $2,000 de producción. GHL: subcuenta Tax Master (locationId kZT0P8HbGrGXuUGi7QJy). Stripe: cuenta de Northbound Studio. Landings: masterclass.tax-master.us y tax-master.us/cursocompleto.
- **TAX MASTER edición 1** (clases del 20 al 22 oct 2026) como histórico con sus datos reales; los compradores tienen la etiqueta comprotm1.
- **Profinance Academy** (instructora Marielys Bravo): próximo lanzamiento con clases del 1 al 3 dic 2026; los anteriores entran por el importador.

## Fases
- **Fase 1, objetivo lun 16 nov 2026**: acceso, configuración de lanzamientos, conectores de Meta, GHL y Stripe con carga histórica, sincronización programada y webhooks, captura en vivo de YouTube, carga manual, pantallas Resumen, Antes, Durante (la comparación con lanzamientos importados llega en la fase 2) y Conexiones, instalación en el iPad y despliegue. La captura de YouTube tiene que estar probada antes del mar 17 nov, porque los conectados en vivo no se recuperan después.
- **Fase 2**: Después completo con liquidación y PDF del experto; Historial con importador y comparación de curvas; pronóstico de cierre con base en lanzamientos anteriores (piso, central y techo, marcado como estimado); conversión por antigüedad del lead; notificaciones push al iPad; roles; cruce de audiencias entre marcas.

## Terminado significa
- Cada número dice de qué fuente sale y a qué hora se actualizó.
- La conciliación de cada conector cuadra con la fuente en el mismo rango.
- Funciona instalado desde Safari en el iPad.
- Ningún secreto llega al navegador.
