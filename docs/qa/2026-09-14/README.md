# FORJA — cierre de remediación para producción

Última integración: **15 de septiembre de 2026**. La carpeta conserva la fecha de inicio de la campaña. Cambios locales, sin commit, push ni publicación. La auditoría histórica y los datos reales se conservaron.

## Dictamen

Las correcciones de los fallos reproducidos están implementadas y las pruebas finales ejecutadas pasan. **La publicación sigue condicionada** a validar Docker, HTTPS y los dispositivos reales. No se declara la instalación pública aprobada.

| Comprobación | Resultado final |
| --- | --- |
| Tipos y compilación backend/frontend | PASS |
| Tests backend | 92/92, 7 archivos |
| Tests frontend | 126/126, 32 archivos |
| Auditoría HTTP | 125 PASS, 0 FAIL; 3 BLOCKED, 3 NOT TESTED, 1 N/A |
| Casos de negocio | 28/28; incluyen 900 combinaciones de rutinas |
| Harness PWA adicional | 23/23, incluido scheduler |
| Precaché compilado | 24 entradas, 18 chunks JS; navegación y 23 recursos offline correctos en VM |
| Copia/restauración | 2/2: conservación de bytes, no sobrescritura, daño y rutas inválidas |
| Dependencias de producción (`npm audit --omit=dev`) | 0 vulnerabilidades conocidas en ambos proyectos |
| Diseño adaptable | 24/24: seis pantallas en 360, 390, 768 y 1440 px sin desbordamiento global |
| RPE/RIR en navegador | Valores 8 y 2 conservados tras editar rápidamente y recargar |
| Compose | Configuración aceptada; ejecución bloqueada por Docker no disponible |
| `git diff --check` | PASS |

Los subconjuntos/harness se solapan y sus conteos no deben sumarse. Una primera pasada frontend produjo un timeout de 5 segundos en AuthScreen bajo alta concurrencia de procesos DOM. Se limitó Vitest a dos workers, sin aumentar el timeout ni cambiar la prueba; la repetición completa pasó 126/126 en 51,47 segundos.

## Correcciones aplicadas

- **Cuentas y seguridad:** revocación persistente, retos WebAuthn de un uso, límite de intentos concurrentes, validación de fechas/referencias/JSON, archivos corruptos controlados y bloqueo Push de destinos privados/rebinding. [Detalle backend](backend-remediation.md).
- **Guardado y PWA:** persistencia atómica, borradores offline conservados, aislamiento al cambiar de cuenta, recuperación de cuota, descansos/avisos coherentes, tratamiento de 502, revalidación de medios y actualización del worker sin expulsar sesiones abiertas. [Detalle PWA](pwa-remediation.md).
- **Entrenamiento y métricas:** prescripción por sesión, progresión acorde con series/rangos reales, movimientos por tiempo, prioridades/tiempo disponible, cargas por serie/lado, superseries, valores válidos y borradores protegidos, peso reciente y eje temporal correcto. [Detalle de negocio y compatibilidad](business-remediation.md).
- **Interfaz:** tarjetas del resumen e historial sin desbordamiento. Imágenes propias con descripción, optimización local y límites de almacenamiento. Los ejercicios nuevos requieren imagen; los anteriores permiten añadirla desde su guía. Se distingue una imagen del usuario de una demostración verificada. Contratos/componentes y backend cubren la carga y persistencia; no se afirma revisión manual de cada dispositivo ni certificación biomecánica de todo el catálogo.
- **Operación:** TTL de sesiones/ceremonias transmitidos en Compose (PWA-F11), salud del proxy, Nginx actualizado, CI Windows/Linux y prueba Compose aislada. Copias/restauración en destinos nuevos. [Guía de producción](../../production.md).

La entrada principal baja de 618,49 kB a **282,21 kB** (89,57 kB gzip) con división por rutas. No es el total instalado offline: también se guardan las demás rutas.

## Evidencia visual

[Geometría de 24 pantallas](evidence/responsive.json), [persistencia RPE/RIR](evidence/set-persistence.json) y [precaché](evidence/pwa-precache.json). Capturas de la cuenta ficticia: [métricas móvil](evidence/metrics-mobile.png) y [entrenamiento móvil](evidence/workout-mobile.png).

## Pendiente antes de publicar

1. **Docker operativo:** el 14 y 15 de septiembre no respondió `dockerDesktopLinuxEngine`. La prueba aislada se detuvo al construir, sin crear un despliegue. Ejecutar `node scripts/qa/compose-smoke.mjs` con Docker iniciado y exigir PASS. Los nuevos trabajos de GitHub no se ejecutaron porque no se hizo push.
2. **Dominio definitivo y TLS:** comprobar un único origen, cookies Secure, certificado válido y renovación. No exponer el HTTP interno a Internet.
3. **Dispositivos reales:** passkey física, instalación/reapertura offline, Wake Lock y Push con pantalla bloqueada. Las simulaciones no sustituyen esas comprobaciones.
4. **Operación:** ensayar restauración con datos representativos, definir retención/permisos y vigilar disco/salud. Una sola réplica por directorio JSON. No se probaron cortes eléctricos ni escritura multiproceso.

No se borraron datos del usuario ni se modificaron sus credenciales. Las nuevas copias de QA y archivos temporales son ficticios. El siguiente paso es completar las comprobaciones de despliegue, no publicar automáticamente.
