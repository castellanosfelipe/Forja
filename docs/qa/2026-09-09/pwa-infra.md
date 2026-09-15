# Auditoría PWA, sincronización e infraestructura — FORJA

Fecha: 2026-09-09. Referencia auditada: `acda8d3`. Alcance: stores de autenticación/estado, IndexedDB, Service Worker, avisos/temporizadores, Wake Lock, recordatorio mensual, Compose/Nginx, dependencias y operación. Se modificaron solamente archivos de auditoría. No se modificó el producto, no se accedió a datos reales y no se inició Docker ni ningún servidor desde esta revisión.

**Resultado del módulo: NO RECOMENDADO PARA PRODUCCIÓN.** Se reprodujeron pérdidas de cambios y límites incorrectos entre cierre de sesión, caché y operaciones pendientes. Los casos de código ejecutan módulos reales con red, almacenamiento y reloj sustituidos por dobles controlados; no certifican hardware, entrega Push externa, cuotas reales del navegador ni instalación PWA nativa. El navegador y el resto de la auditoría pertenecen al informe consolidado.

## Inventario y cobertura

| ID funcional | Módulo/componente | Función y flujo | Usuario | Dependencias | Estado inicial | Casos |
|---|---|---|---|---|---|---|
| F-PWA-01 | state.store | Cargar, editar offline, sincronizar/rebasar, refrescar, limpiar | Autenticado | API, IndexedDB, Zustand | Implementado, pendiente de validar | 001–005, 007 |
| F-PWA-02 | auth.store / perfil | Continuidad offline y cierre de sesión | Autenticado/visitante | Cookie HttpOnly, localStorage, API | Implementado, pendiente de validar | 006–007 |
| F-PWA-03 | Service Worker | Caché shell/medios, navegación offline, exclusión API | Todos | CacheStorage, Fetch, ciclo SW | Implementado, pendiente de validar | 013–017, 031 |
| F-PWA-04 | useRestTimer | Inicio, extensión, omisión, suspensión | Autenticado entrenando | reloj, React, Push API | Implementado, pendiente de validar | 008–010 |
| F-PWA-05 | useWakeLock | Solicitud, rechazo, limpieza del bloqueo | Autenticado entrenando | Wake Lock, visibilidad | Implementado, pendiente de validar | 011–012, 030 |
| F-PWA-06 | PushService | Programar, restaurar, cancelar y enviar | Autenticado | web-push, VAPID, repositorio | Implementado, pendiente de validar | 018–020, 029 |
| F-PWA-07 | Recordatorio mensual | Envío, repetición, reintento, posponer offline | Autenticado | PushService, estado, API | Implementado, pendiente de validar | 021–023 |
| F-INF-01 | Paquetes | Dependencias conocidas vulnerables | Operador | Registro npm | Pendiente de validar | 024–025 |
| F-INF-02 | Compose/Nginx/config | Un origen, volúmenes, TTL, headers, salud | Operador | Docker, Nginx, variables | Configurado, runtime apagado | 026–028, 034 |
| F-INF-03 | Instalación/almacenamiento nativo | Instalar, relanzar, persistencia real | Todos | Navegador/SO | Sin validar en este submódulo | 031–032 |
| F-INF-04 | CI/observabilidad | Verificación automática, logs, recuperación | Operador | CI, stdout/stderr | Pruebas y logs presentes; CI no encontrada | 033, 035 |

Flujos críticos: editar offline → recargar → reconectar → resolver revisión; cerrar sesión con cambios o requests pendientes; volver a entrar tras logout fallido. Flujos principales: descanso → ampliar/omitir → aviso; periodicidad mensual → posponer → sincronizar. Flujos de operación: restaurar temporizadores al iniciar backend y cargar por Nginx con el mismo origen.

La matriz completa, precondiciones, acciones, resultados y evidencia están en `pwa-cases.json`. 35 escenarios identificados: 26 ejecutados con criterio evaluable (15 PASS, 11 FAIL), 5 BLOCKED, 4 NOT TESTED. Cobertura de escenarios evaluables: 26/35 = 74,3%; tasa de aprobación: 15/26 = 57,7%. Se excluyó del cómputo ejecutado el escenario 013: su simulación detectó precaché incompleta, pero no modela la caché HTTP real necesaria para dictaminar el primer relanzamiento offline. Los fallos de tests de auditoría son evidencia del producto actual, no tests corregidos para aprobar.

## Método y evidencia

Harness aislado: `work/qa-2026-09-09/pwa/`. Comando reproducible desde la raíz:

```powershell
& '.\frontend\node_modules\.bin\vitest.cmd' run --config '.\scripts\qa\pwa\vitest.config.mjs' --reporter=verbose
```

Ejecuciones realizadas: `state.test.ts` y `timers.test.ts` (12 casos: 5 aprobados, 7 fallidos); `worker.test.ts` (5 aserciones: 2 aprobadas, 3 fallidas; la aserción 013 se considera evidencia parcial y no resultado E2E); `scheduler.test.ts` (6 casos: 5 aprobados, 1 fallido). El comando completo vuelve a ejecutar todas las aserciones, incluida la 013 deliberadamente limitada.

Los dobles de IndexedDB emplean un `Map` por claves reales; las APIs usan respuestas y errores controlados. Los tests de hooks montan hooks reales con React Testing Library. Los tests del SW ejecutan el archivo público real dentro de `node:vm`, con caché/fetch controlados. El scheduler ejecuta `PushService` real con repositorio en memoria y `web-push` interceptado, sin contactos de red. Ninguno toca `./data` ni almacenes del navegador del usuario.

## Hallazgos

### PWA-F01 — Recargar con cambios pendientes destruye la base de comparación

ID: PWA-F01. Módulo: sincronización. Severidad/prioridad: HIGH — P1. Categoría: error / pérdida de información. Estado: OPEN.

Descripción: `load()` escribe el estado remoto en `server-state` antes de leer y rebasar el borrador pendiente. La comparación de tres versiones usa como base el remoto nuevo, por lo que deja de detectar cambios del otro dispositivo.

Precondiciones: una cuenta, estado base revisión 1, borrador local no enviado y revisión 2 modificada desde otro dispositivo.

Pasos: 1. Guardar `locale=es` como base. 2. Editar offline a `en`; otro dispositivo guarda `pt`. 3. Recargar online; el primer PUT recibe 409. 4. Observar segundo PUT y borrado de pending.

Esperado: conflicto explícito que conserva ambos lados. Obtenido: `status=idle`, `locale=en`, dos PUT y pending eliminado; `pt` queda sobrescrito. Frecuencia: siempre con esta secuencia.

Impacto: el mismo algoritmo opera sobre historial, métricas y plan; puede descartar cambios remotos válidos en todo un campo superior. Evidencia: PWA-003, `state.test.ts:52`, observación `{"status":"idle","locale":"en","replaceCalls":2,"pending":false}`; `frontend/src/stores/state.store.ts:54`, `:57`, `:155`.

Causa probable: actualizar la base antes de completar la reconciliación. Recomendación: conservar la base asociada al pending hasta resolverlo, actualizarla solo después de aceptar una versión guardada y verificar edición concurrente del mismo campo al relanzar.

### PWA-F02 — El relanzamiento offline oculta cambios pendientes al cerrar sesión

ID: PWA-F02. Módulo: estado/perfil. Severidad/prioridad: HIGH — P1. Categoría: error / pérdida de información. Estado: OPEN.

Precondiciones: caché con edición local y `pending-state` persistido, recarga sin conexión.

Pasos: 1. Editar offline. 2. Recargar offline. 3. Abrir perfil y cerrar sesión. Esperado: advertir que se perderán cambios no enviados. Obtenido: la carga muestra caché pero conserva `hasPendingChanges=false`; el perfil comprueba ese flag/conflict y permite `reset()` directamente. `reset()` elimina pending. Frecuencia: siempre en el escenario reproducido.

Impacto: pérdida silenciosa del trabajo local. Evidencia: PWA-004 `{"status":"offline","pendingFlag":false,"pendingStored":true}`; `frontend/src/stores/state.store.ts:49`, `:66`, `:121`; `frontend/src/features/profile/ProfilePage.tsx:97`.

Causa probable: pending se consulta únicamente después de GET remoto exitoso. Recomendación: recuperar pending y su indicador antes de depender de la red; resolver explícitamente el descarte al salir. La eliminación final se determina por el código real del perfil; el harness reproduce el flag incorrecto sin interactuar con datos reales.

### PWA-F03 — Fallo de persistencia local deja “Guardando” sin datos persistidos

ID: PWA-F03. Módulo: estado/IndexedDB. Severidad/prioridad: HIGH — P1. Categoría: error / recuperación y pérdida de información. Estado: OPEN.

Precondiciones: estado cargado, navegador online y escritura local que rechaza por cuota/almacenamiento no disponible.

Pasos: 1. Editar una preferencia o registro. 2. Hacer rechazar `writeOfflineValue`. 3. Inspeccionar estado y error después del rechazo. Esperado: error visible, acción de recuperación/exportación y distinción entre memoria y guardado persistente. Obtenido: `status=syncing`, `error=null`, sin pending persistido; el Promise de update rechaza antes de llamar al servidor. Frecuencia: siempre con la escritura fallida simulada.

Impacto: el usuario cree que se está guardando; recargar pierde el cambio que solo existe en memoria. Evidencia: PWA-005 `{"status":"syncing","error":null,"pendingStored":false}`; `frontend/src/stores/state.store.ts:100`, `:109`; `offline-db.ts:34`.

Causa probable: cambio optimista anterior a IndexedDB sin manejo del rechazo en `update()`. Recomendación: capturar fallos locales, informar persistencia real y permitir recuperación. Una cuota física real de navegador no fue provocada; sí se ejecutó el camino de rechazo del módulo.

### PWA-F04 — Cierre de sesión fallido vuelve a autenticar tras recargar

ID: PWA-F04. Módulo: autenticación/perfil. Severidad/prioridad: HIGH — P1. Categoría: seguridad funcional / cierre de sesión. Estado: OPEN.

Precondiciones: cookie válida, falla de red antes de que logout alcance servidor.

Pasos: 1. Cerrar sesión con endpoint inaccesible. 2. La UI pasa a anónimo por el `finally`. 3. Recuperar conexión y recargar. Esperado: completar revocación pendiente o advertir claramente que el cierre no terminó antes de recuperar acceso. Obtenido: `initialize()` recibe la sesión aún válida y vuelve a autenticado sin credenciales. Frecuencia: siempre si servidor no recibió logout y cookie continúa válida.

Impacto: en un dispositivo compartido una persona puede volver a abrir la cuenta que aparentemente se cerró. Evidencia: PWA-006 `{"statusAfterReload":"authenticated"}`; `frontend/src/stores/auth.store.ts:39`, `:42`, `:18`; `frontend/src/features/profile/ProfilePage.tsx:88`. El harness modela servidor no revocado; no manipula cookies de cuentas reales.

Causa probable: logout local incondicional sin marca de revocación pendiente/reintento. Recomendación: conservar una intención de logout verificable y no reautenticar automáticamente mientras esté pendiente, reintentar la revocación al recuperar conexión y mostrar estado comprensible.

### PWA-F05 — Operaciones previas al logout restauran datos privados después del reset

ID: PWA-F05. Módulo: estado/autenticación. Severidad/prioridad: HIGH — P1. Categoría: concurrencia / privacidad. Estado: OPEN.

Precondiciones: `load()` iniciado y GET pendiente; usuario con caché puede acceder a perfil durante la carga.

Pasos: 1. Iniciar carga lenta. 2. Ejecutar reset y logout. 3. Resolver el GET anterior. Esperado: ignorar resultados de la identidad/sesión anterior y mantener datos eliminados. Obtenido: usuario anónimo, pero estado global y `cached-state` recuperan datos de `qa-user`. Frecuencia: siempre en el orden reproducido.

Impacto: limpieza de datos privados no fiable y riesgo de mostrar estado anterior al entrar otra cuenta mientras carga. No se afirma acceso cruzado mediante API: el fallo reproducido es memoria/caché del cliente. Evidencia: PWA-007 `{"authenticated":"anonymous","restoredUser":"qa-user","cached":true}`; `frontend/src/stores/state.store.ts:47`, `:54`, `:62`, `:121`.

Causa probable: reset no invalida/cancela la cola ni requests y no existe comprobación de identidad/generación antes de aceptar resultados. Recomendación: invalidar operaciones al cambiar identidad o cerrar sesión, esperar limpiezas de almacenamiento y rechazar resultados obsoletos.

### PWA-F06 — Extender descanso no extiende su aviso Push

ID: PWA-F06. Módulo: entrenamiento/temporizador. Severidad/prioridad: MEDIUM — P2. Categoría: inconsistencia de integración. Estado: OPEN.

Precondiciones: notificaciones concedidas y descanso de 60 segundos programado.

Pasos: 1. Iniciar 60 s. 2. Añadir 30 s. 3. Comparar plazo local y solicitud remota. Esperado: ambos vencen a los 90 s. Obtenido: UI 90 s y única programación remota 60 s. Frecuencia: siempre al ampliar.

Impacto: aviso prematuro aunque siga tiempo pendiente. Evidencia: PWA-008 `{"remaining":90,"scheduledSeconds":[60]}`; `frontend/src/hooks/useRestTimer.ts:26`, `:31`.

Causa probable: `add()` solo ajusta deadline local. Recomendación: actualización/cancelación y reprogramación del temporizador remoto con control de concurrencia.

### PWA-F07 — Omitir descanso durante programación lenta deja un aviso huérfano

ID: PWA-F07. Módulo: entrenamiento/temporizador. Severidad/prioridad: MEDIUM — P2. Categoría: race condition. Estado: OPEN.

Precondiciones: solicitud de programación Push todavía pendiente.

Pasos: 1. Iniciar descanso. 2. Omitir antes de recibir el ID remoto. 3. Resolver programación. Esperado: cancelar el timer que responde tarde. Obtenido: descanso detenido pero `cancelTimer` nunca llamado; el ID se guarda después de cancelar. Frecuencia: siempre con ese orden.

Impacto: notificaciones de descansos descartados; inicios repetidos pueden superponer programación. Evidencia: PWA-009 `{"running":false,"cancelCalls":0}`; `frontend/src/hooks/useRestTimer.ts:13`, `:26`, `:27`.

Causa probable: cancel solo actúa sobre ID existente y start no comprueba si fue invalidado al regresar. Recomendación: token de operación/estado cancelado que limpie una respuesta tardía.

### PWA-F08 — Una respuesta 502 reemplaza el shell útil para funcionamiento offline

ID: PWA-F08. Módulo: Service Worker. Severidad/prioridad: MEDIUM — P2. Categoría: disponibilidad / recuperación. Estado: OPEN.

Precondiciones: shell válido previamente cacheado y navegación cuyo servidor/proxy devuelve 502.

Pasos: 1. Instalar shell 200. 2. Navegar y responder 502. 3. Fallar la siguiente navegación por falta de red. Esperado: conservar el último shell válido y usarlo offline. Obtenido: cache `/` contiene `upstream failed`, status 502; esa misma respuesta se sirve offline. Frecuencia: siempre en el escenario.

Impacto: una incidencia temporal impide abrir el frontend offline aunque antes estaba disponible. Evidencia: PWA-014 `{"status":502,"body":"upstream failed"}`; `frontend/public/service-worker.js:27`, `:29`. Se ejecutó el handler original en VM; navegador real no cubierto por esta prueba.

Causa probable: no revisar `response.ok`/tipo de respuesta antes de reemplazar `/`. Recomendación: cachear únicamente shell válido, conservar versión previa ante respuestas HTTP de error y usar `waitUntil` para escrituras necesarias.

### PWA-F09 — El caché permanente de medios impide recibir correcciones de imágenes

ID: PWA-F09. Módulo: biblioteca/PWA. Severidad/prioridad: MEDIUM — P2. Categoría: contenido obsoleto / actualización. Estado: OPEN.

Precondiciones: imagen vista previamente y nuevo despliegue con contenido corregido en la misma ruta.

Pasos: 1. Cachear imagen v1. 2. Servidor cambia a v2 manteniendo URL. 3. Activar SW actual y solicitar online. Esperado: política de actualización eventual o URL/caché versionada. Obtenido: v1 y ninguna segunda solicitud; no hay TTL/revalidación de CacheStorage. Frecuencia: siempre hasta eliminación/evicción manual o cambio de versión/ruta.

Impacto: usuarios existentes conservan demostraciones antiguas incluso tras publicar correcciones. Evidencia: PWA-015 `{"body":"asset-v1","fetchCalls":1}`; `frontend/public/service-worker.js:2`, `:41`; `frontend/nginx.conf:31`. El max-age HTTP de un día no expira la entrada de CacheStorage.

Causa probable: URL estable y cache-first sin invalidación/revalidación. Recomendación: hash/versionado de activos o estrategia de revalidación explícita con pruebas de actualización.

### PWA-F10 — Posponer recordatorio offline puede apagar su programación futura

ID: PWA-F10. Módulo: recordatorios/sincronización. Severidad/prioridad: MEDIUM — P2. Categoría: integración / tarea perdida. Estado: OPEN.

Precondiciones: aviso mensual activo y temporizador ya armado; posponer sin conexión, luego guardar por sincronización general.

Pasos: 1. Restaurar servicio con aviso pendiente a t+1. 2. Cambiar `nextDueAt` a t+5 como hace PUT `/api/state`, sin endpoint adicional de sync. 3. Avanzar más allá de ambas fechas. Esperado: un aviso en nueva fecha. Obtenido: cero envíos y cero handles, aunque fecha vencida. Frecuencia: siempre con esta secuencia.

Impacto: recordatorio deja de llegar hasta otro sync explícito, reconfiguración o reinicio. Evidencia: PWA-023 `{"dueAt":"2026-09-09T00:00:05Z","now":"2026-09-09T00:00:06.000Z","sent":0,"pendingHandles":0}`; `backend/src/http/routes/state.routes.ts:24`, `backend/src/services/push.service.ts:216`, `frontend/src/features/dashboard/DashboardPage.tsx:80`.

Causa probable: PUT de estado no actualiza scheduler; el handle viejo lee una fecha futura y retorna sin rearmar. Recomendación: reprogramación central después de persistir cambios relevantes, y rearmado cuando un callback detecta próxima fecha aún futura.

### PWA-F11 — Variables de duración de sesión documentadas no llegan al contenedor

ID: PWA-F11. Módulo: infraestructura/configuración. Severidad/prioridad: MEDIUM — P2. Categoría: configuración / seguridad operativa. Estado: OPEN.

Precondiciones: despliegue oficial con Compose y configuración de TTL en `.env` según ejemplo.

Pasos: 1. Consultar las opciones TTL del ejemplo. 2. Resolver Compose. 3. Inspeccionar únicamente las dos variables de entorno del backend. Esperado: TTL configurables transferidos. Obtenido: `SESSION_TTL_SECONDS=null`, `AUTH_FLOW_TTL_SECONDS=null` en entorno Compose; backend usa sus defaults 30 días/5 minutos. Frecuencia: siempre con Compose actual.

Impacto: un operador que reduzca caducidad puede creer que está aplicada. Evidencia: PWA-027, resolución de `docker compose config --format json` con selección explícita sin imprimir secretos; `.env.example:12`, `docker-compose.yml:59`, `backend/src/config/env.ts:89`.

Causa probable: variables soportadas en Node pero omitidas del mapa Compose. Recomendación: transferirlas explícitamente, documentar defaults y verificar configuración efectiva. No fue necesario iniciar Docker.

## Riesgos/deuda sin defectos E2E confirmados

- PWA-R01, P4: install precachea solamente `/` y manifest. VM confirma ausencia de assets JS/CSS tras install, pero el navegador puede servirlos desde su caché HTTP. No se afirma primer relanzamiento roto sin prueba real. Incorporar verificación de instalación fría, cierre completo, actualización y funcionamiento offline con caché HTTP no disponible; considerar manifiesto de precaché generado por build. Fuente: `service-worker.js:4`.
- PWA-R02, P4: no se encontró `.github/workflows` ni otra configuración CI versionada. Las pruebas locales existen; no equivale a un pipeline ejecutado. Automatizar typecheck/test/build y validación de activos en cada cambio.
- PWA-R03, P4: el artefacto de frontend inspeccionado contiene un JS de 602.604 bytes sin comprimir y CSS 76.420 bytes. No se midió LCP/INP en dispositivo; no se clasifica el rendimiento como aprobado/degradado solo por tamaño. Evaluar carga diferida de registro multimedia y presupuestos.
- PWA-R04, P2 potencial sin reproducción: callbacks de Push usan `void deliver(...)` sin manejo de rechazo externo; fallos de lectura/escritura del repositorio podrían producir rechazo no manejado en Node. Se revisó código, no se provocó caída de proceso. Añadir catch/log y estrategia de recuperación antes de certificar resistencia a disco no disponible (`push.service.ts:153`, `:171`).
- La revisión de SSRF/validación de suscripciones está asignada a auditoría API y debe consolidarse allí para no duplicar hallazgos.

## Infraestructura y limitaciones

`npm audit --json` terminó con código 0 para frontend y backend: cero avisos conocidos a la fecha de consulta. Frontend: 195 dependencias totales declaradas por audit; backend: 161. Esto no demuestra ausencia de vulnerabilidades propias ni cubre imágenes base de Docker.

Compose resolvió correctamente: puerto público en `127.0.0.1`, frontend y backend sin puertos públicos, volumen datos hacia `/app/data`. Dockerfiles usan `npm ci`, backend `USER node`, raíz read-only y tmpfs; Compose contiene healthchecks y Nginx es el único punto de entrada. Se revisó configuración, no se ejecutó Nginx ni se validaron permisos Linux del bind mount en esta sesión.

Headers CSP/nosniff/frame/referrer y exclusión de caché API están declarados; respuestas reales del proxy, TLS, certificado, redirecciones y políticas efectivas de navegador se mantienen BLOCKED por Docker apagado en este alcance. La documentación requiere terminación HTTPS externa; no hay servidor TLS incluido. Logs backend incluyen requestId, método, ruta, status y duración; no se revisaron logs de tráfico de usuarios reales. No hay evidencia runtime de tolerancia a disco lleno/corrupción, caída en callback o backup/restore operativo.

No se contactó un proveedor Push, no se usaron suscripciones reales, no se probó sonido/vibración físicos, instalación Android/iOS o Wake Lock bajo bloqueo del SO. No se escanearon imágenes Docker. Los resultados con dobles quedan identificados para que no sustituyan esas pruebas.

## Orden de corrección propuesto

| Orden | Prioridad | Hallazgo | Acción | Complejidad | Riesgo mitigado |
|---:|---|---|---|---|---|
| 1 | P1 | F01 | Conservar base original del borrador al recargar | Media | Sobrescritura silenciosa de información |
| 2 | P1 | F02 | Recuperar pending offline y advertir descarte | Baja-media | Pérdida local al salir |
| 3 | P1 | F05 | Invalidar operaciones al cambiar identidad | Media | Datos privados tras logout |
| 4 | P1 | F04 | Manejar revocación fallida/pending logout | Media | Reentrada a cuenta supuestamente cerrada |
| 5 | P1 | F03 | Manejar error de persistencia y recuperación | Media | Cambio solo en memoria |
| 6 | P2 | F10 | Reconciliar scheduler al persistir recordatorio | Media | Recordatorio mensual perdido |
| 7 | P2 | F06–F07 | Unificar timer local/remoto con cancelación de operaciones | Media | Avisos incorrectos |
| 8 | P2 | F08–F09 | Validar shell e invalidar/revalidar medios | Media | PWA obsoleta/no disponible |
| 9 | P2 | F11 | Transferir TTL a Compose y comprobar efecto | Baja | Caducidad operativa incorrecta |
| 10 | P4 | R01–R03 | QA real de instalación, CI y medición de carga | Media | Riesgo residual sin cobertura |

Las correcciones quedan propuestas, no aplicadas. El dictamen consolidado debe añadir los resultados de API, interfaz, funcionalidad y navegador sin transformar casos bloqueados/no probados en PASS.
