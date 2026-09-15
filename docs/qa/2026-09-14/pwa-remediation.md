# Cierre de correcciones PWA

Ejecución local del 14–15 de septiembre de 2026. Última comprobación del artefacto compilado: `2026-09-15T13:45:43.142Z`. Este documento complementa, sin sobrescribir, la auditoría histórica del 9 de septiembre. No certifica por sí solo la salida completa a producción.

## Resultado

Las regresiones automatizadas de PWA-F01 a PWA-F09 pasan con la implementación corregida. Se preservan borradores pendientes y su base de comparación, se comunica el fallo de almacenamiento, se impide que operaciones de una cuenta anterior repongan datos después de salir y se mantiene coherencia entre descanso local y programación remota. El código fuente y el artefacto de producción fueron comprobados.

| Verificación | Resultado observado |
| --- | --- |
| Suite frontend completa, 14 de septiembre por la noche | 32 archivos, 126 pruebas: PASS |
| Subconjunto PWA/auth/perfil dentro de esa suite | 8 archivos, 38 pruebas: PASS |
| Harness adicional estado/temporizadores/worker, 15 de septiembre | 3 archivos, 17 pruebas: PASS |
| Harness PWA completo, después del ajuste backend del scheduler | 4 archivos, 23 pruebas: PASS; incluye los 17 anteriores |
| `npm run build` frontend | PASS; TypeScript y Vite completaron sin errores |
| Precaché del worker compilado | PASS: 24 entradas, 19 archivos JS/CSS, incluidos 18 chunks JS |
| Lecturas offline desde el precaché instalado en VM | 23 recursos: PASS, sin requerir red |
| Navegación offline a `/workout` y exclusión de `/api/state` | PASS |

Los subconjuntos y el harness repiten escenarios; **no se suman** sus conteos a los 126 tests. La suite completa representa el estado observado durante esta ejecución, no cambios posteriores de otros módulos. El agente principal realizará el build final de integración.

## Hallazgos y trazabilidad

| Hallazgo | Corrección comprobada | Evidencia automatizada |
| --- | --- | --- |
| PWA-F01 | La carga remota no sustituye la base de un borrador pendiente; conflicto real conserva ambas versiones sin sobrescritura silenciosa. | `state-recovery.test.ts`: PWA-003; `state-store.test.ts`: merge de tres vías y concurrencia. |
| PWA-F02 | Se recupera el indicador de cambios pendientes al reabrir offline; perfil exige confirmación antes de descartarlos. | PWA-004; `profile.test.tsx`. |
| PWA-F03 | Escritura atómica de caché/borrador; error recuperable de cuota; se conserva el borrador en memoria y se puede reintentar. | PWA-005, 036, 037, 040. |
| PWA-F04 | La intención de salir persiste si falla la red; iniciar no vuelve a aceptar automáticamente la cookie anterior. | PWA-006; `auth-store.test.ts`. La revocación servidor se verifica por separado en backend. |
| PWA-F05 | Generación e identidad invalidan respuestas tardías; borrado se ordena después de escrituras ya iniciadas. | PWA-007, 038, 039. |
| PWA-F06 | `+30` cancela el aviso anterior y programa otro con el tiempo restante actualizado. | PWA-008, 042. |
| PWA-F07 | Omitir/cambiar/salir del entrenamiento cancela también un identificador recibido tardíamente. | PWA-009, 041, 042. |
| PWA-F08 | Un 502 no reemplaza el último HTML válido para uso offline. | PWA-014. |
| PWA-F09 | Los medios se revalidan en línea; el ejemplar guardado sigue disponible cuando falla la conexión. | PWA-015, 017. |

PWA-F10 pertenece al servicio backend de recordatorios: sus seis escenarios de scheduler también pasaron en la ejecución completa de las 08:47 del 15 de septiembre, con destino Push y resolución de nombres simulados. El cierre backend detallado se documenta por separado. PWA-F11 pertenece a Docker Compose y no se declara cerrado en este documento.

## Cierre adicional

- El build genera el manifiesto de precaché con todos los chunks de las rutas React cargadas bajo demanda, CSS e iconos. El identificador de caché depende del manifiesto y del worker. La entrada principal del build comprobado mide 282,21 kB, 89,57 kB comprimida; no es el total descargado al completar la instalación offline.
- Se retiró la activación forzada de una actualización. La nueva versión espera a que se cierren las pestañas controladas por la anterior para no eliminar sus chunks durante una sesión abierta. PWA-045 comprueba esa decisión de ciclo de vida y la limpieza posterior a la activación. Para aplicar una actualización pendiente deben cerrarse las ventanas de FORJA y abrirse de nuevo.
- Wake Lock serializa adquisiciones pendientes. Si la página se ocultó o se desmontó antes de recibir el permiso, libera la adquisición; errores de liberación no generan una promesa rechazada sin manejar. PWA-011, 012, 043 y 044 cubren estos casos simulados.
- El harness del worker ahora inspecciona el worker de **producción**, no el archivo público anterior a la inserción de precaché. La prueba de medios espera revalidación seguida de recuperación local; la prueba `+30` espera la cancelación/reprogramación asíncrona antes de afirmar su resultado. No se redujeron los criterios funcionales para hacer pasar pruebas.

## Reproducción

Desde la raíz, después de instalar las dependencias con los lockfiles:

```powershell
npm test --prefix frontend
npm run build --prefix frontend
node scripts/qa/verify-precache.mjs
node frontend/node_modules/vitest/vitest.mjs run --config scripts/qa/pwa/vitest.config.mjs scripts/qa/pwa/state.test.ts scripts/qa/pwa/timers.test.ts scripts/qa/pwa/worker.test.ts
node frontend/node_modules/vitest/vitest.mjs run --config scripts/qa/pwa/vitest.config.mjs
```

`verify-precache.mjs` lee los archivos reales de `frontend/dist` y ejecuta el worker en una VM aislada con almacenamiento y transporte controlados. Comprueba que todos los archivos existen, que los chunks están incluidos y que se sirven sin red después de instalar. Sólo lee artefactos; no accede a cuentas ni datos reales, ni envía notificaciones. Su resultado de esta ejecución se conserva en `evidence/pwa-precache.json`.

## Pendiente en dispositivos reales

Estas validaciones no se sustituyen con las simulaciones automatizadas:

- Instalación desde HTTPS, cierre completo y primer arranque offline con el caché HTTP vacío; actualización entre dos versiones con varias pestañas abiertas.
- Persistencia real IndexedDB bajo cuota agotada, cierre abrupto y restricciones de almacenamiento de cada navegador. Las pruebas actuales inyectan fallos y comprueban la recuperación del estado, no la política de almacenamiento del sistema operativo.
- Mantener y liberar pantalla encendida en teléfonos reales, incluyendo ahorro de batería y denegación de Wake Lock.
- Entrega y cancelación de avisos Web Push con pantalla bloqueada, suspensión prolongada o aplicación cerrada, con permiso del usuario y claves VAPID del despliegue. La cancelación ya iniciada en un proveedor no puede garantizarse desde el navegador; la interfaz informa cuando no pudo cancelarse.

No se han manipulado permisos nativos, publicado el servicio, usado datos personales ni ejecutado commit/push.
