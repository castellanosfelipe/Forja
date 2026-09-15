# Auditoría backend, API, identidad y persistencia — FORJA

Fecha: 2026-09-09. Baseline: `acda8d39f379a8f1c60956b3be14022eeb692770`.

## Resultado ejecutivo

**NO RECOMENDADO PARA PRODUCCIÓN** en el alcance backend. Las rutas principales funcionan y el aislamiento de usuarios resiste las pruebas ejecutadas, pero el cierre de sesión no revoca tokens, una autenticación WebAuthn admite replay y el reemplazo de estado permite persistir estructuras inválidas que después causan HTTP 500. También está comprobada la ausencia de restricciones de destino antes de entregar suscripciones Push al transporte; la explotación SSRF por conectividad real no se ejecutó.

Se ejecutaron **126 casos: 110 PASS y 16 FAIL, tasa de aprobación 87,30 %**. Los fallos se agrupan en **8 hallazgos**, no en 16 defectos diferentes: 4 P1 y 4 P2; ningún P0 demostrado. Además se declaran 3 BLOCKED, 3 NOT TESTED y 1 NOT APPLICABLE. La matriz contiene 133 filas.

## Entorno y evidencia

- Harness reproducible: `scripts/qa/backend-audit.mts`, ejecutable desde raíz con `backend/node_modules/.bin/tsx scripts/qa/backend-audit.mts` (en Windows, `tsx.cmd`).
- Corpus: [backend-cases.json](backend-cases.json). Cada caso tiene ID, módulo, escenario, estado, esperado, observado y evidencia. Las respuestas duplicadas se referencian mediante `responseReference: observed`.
- Logs HTTP y excepciones: [backend-server.ndjson](backend-server.ndjson), correlacionables con `requestId`. Cuatro excepciones inducidas están documentadas abajo. No se revelan stack traces al cliente.
- Node v24.16.0, proceso local HTTP en puerto efímero, `nodeEnv: production` para verificar Origin obligatorio; origen lógico `http://localhost:3101`. Docker/TLS no participaron.
- DATA_DIR nuevo por ejecución: `work/qa-2026-09-09/backend/run-<timestamp>`. Solo cuentas y claves sintéticas del harness. No se leyó ni mutó `./data` real.
- WebAuthn se probó con una clave ECDSA P-256 creada localmente, attestation `none`, UV/UP en authenticatorData y firma real validada por SimpleWebAuthn. Esto valida el protocolo backend, no biometría ni disponibilidad de hardware.
- Para Push se sustituyó temporalmente `web-push.sendNotification` por un stub en memoria. Las claves VAPID se generaron solo para el harness. **No salió tráfico Push a los destinos declarados.** Se restauró el transporte y se cerraron todos los servidores/temporizadores propios al terminar.
- Los documentos no contienen contraseñas, tokens de sesión/ceremonia, hashes de contraseñas, sales ni claves privadas de ejecución. El harness contiene únicamente una contraseña y secreto fijos de QA, limitados al directorio aislado.
- Las pruebas PASS no se repitieron tras la reanudación; la última operación fue depurar/documentar la evidencia existente.

## Inventario funcional previo a las pruebas

La aplicación usa un único rol de usuario. No existe administrador, deshabilitación de cuenta ni endpoint de recuperación/cambio de contraseña. Las funciones de plan, perfil, métricas, biblioteca y preferencias se persisten mediante el documento `/api/state`; no tienen APIs CRUD independientes.

| ID | Módulo | Componentes/rutas | Función | Rol | Dependencias | Estado inicial |
|---|---|---|---|---|---|---|
| B01 | HTTP | `app.ts`, router, request/response | Health, JSON, Origin, errores, headers | Público/usuario | Node HTTP | Implementado, pendiente ejecutar |
| B02 | Contraseña | register/login | Crear cuenta, scrypt, autenticar, limitar fallos | Público | db.json | Implementado, pendiente ejecutar |
| B03 | Sesión | session/logout | Cookie HMAC expirable, consulta, cierre | Público/usuario | SessionService/db.json | Implementado, pendiente ejecutar |
| B04 | WebAuthn | register/options, register/verify | Alta de cuenta o passkey adicional | Público/usuario | SimpleWebAuthn, RP/origen, db.json | Implementado, pendiente ejecutar |
| B05 | WebAuthn | login/options, login/verify | Autenticación descubrible o por usuario | Público | Claves públicas guardadas | Implementado, pendiente ejecutar |
| B06 | Passkeys | GET/DELETE passkeys | Listar y retirar métodos conservando acceso | Usuario propietario | db.json | Implementado, pendiente ejecutar |
| B07 | Estado | GET/PUT state | Estado completo, migración, revisión/If-Match | Usuario propietario | state-<key>.json | Implementado, pendiente ejecutar |
| B08 | Peso | POST/DELETE body-weight | Alta/eliminación de mediciones | Usuario propietario | UserStateRepository | Implementado, pendiente ejecutar |
| B09 | Entrenar | previous, POST, PATCH, complete, cancel | Sesión guiada, historial, estados, 1RM | Usuario propietario | ProgressionService | Implementado, pendiente ejecutar |
| B10 | Push | clave, suscripciones, temporizadores | Suscribir, borrar, programar/cancelar | Usuario propietario | VAPID, proveedor Web Push | Implementado, integración condicionada |
| B11 | Recordatorio | body-measurement-reminder/sync | Armar recordatorio mensual | Usuario propietario | Estado, Push, setTimeout | Implementado, integración condicionada |
| B12 | Persistencia | repositorios, atomic-json | Aislamiento, mutex, escritura temporal+rename | Interno | Filesystem | Implementado, pendiente ejecutar |

Se identificaron **26 combinaciones método/ruta** y todas recibieron al menos una solicitud activa (100 % de alcance de rutas, **no** 100 % de cobertura de sus combinaciones y límites). Los casos negativos de autorización cubren las 17 rutas protegidas.

| Grupo | Métodos/rutas inventariados |
|---|---|
| Público | GET `/api/health`; GET `/api/auth/session`; POST `/api/auth/logout` |
| Contraseña | POST `/api/auth/password/register`, `/api/auth/password/login` |
| WebAuthn | POST `/api/auth/register/options`, `/api/auth/register/verify`, `/api/auth/login/options`, `/api/auth/login/verify` |
| Métodos de acceso | GET `/api/auth/passkeys`; DELETE `/api/auth/passkeys/:credentialId` |
| Estado/peso | GET/PUT `/api/state`; POST `/api/body-weight`; DELETE `/api/body-weight/:entryId` |
| Entrenamientos | GET `/api/workouts/previous/:exerciseId`; POST `/api/workouts`; PATCH `/api/workouts/:sessionId`; POST `/api/workouts/:sessionId/complete`, `/api/workouts/:sessionId/cancel` |
| Push | GET `/api/push/vapid-public-key`; POST `/api/push/subscriptions`; DELETE `/api/push/subscriptions/:subscriptionId`; POST `/api/push/rest-timers`; DELETE `/api/push/rest-timers/:timerId`; POST `/api/push/body-measurement-reminder/sync` |

## Flujos críticos y autorización

| Flujo / precondición | Pasos ejecutados y decisiones | Resultado | Evidencia |
|---|---|---|---|
| Nueva cuenta sin sesión | Registrar → recibir cookie → leer estado → revisar db.json; duplicado/concurrencia y tipos inválidos | PASS | API-022–038, 047, 070 |
| Acceso con contraseña | Usuario correcto/incorrecto/inexistente → verificación → cookie o error; ráfaga simultánea | Parcial: carrera en limitador | API-039–044, 071–072 |
| Passkey sin cuenta | Opciones → crear autenticador local → registro firmado → login firmado → replay | Parcial: replay admitido | API-103–110 |
| Passkey adicional | Sesión de contraseña → opciones → añadir → listar/borrar; intentar borrar clave ajena/última | PASS | API-105–107, 114–115 |
| Cerrar sesión | Login → guardar cookie QA → logout → quitar cookie → reenviar cookie vieja | FAIL al reenviar cookie | API-122–124 |
| Guardar/sincronizar datos | GET → editar → PUT con revisión → mismo PUT obsoleto → 10 concurrentes | PASS con If-Match | API-064–069 |
| Integridad del estado | GET → inyectar campos/tipos inválidos → PUT → consumir historial | FAIL | API-073–079 |
| Entrenamiento | Crear → editar → completar → historial previo → completar otra vez/cancelar/editar | PASS para datos válidos; fallo con referencias inválidas | API-080–095 |
| Reinicio | Escribir múltiples pesos/entrenamientos → cerrar app → nueva instancia → GET | PASS, estado idéntico | API-119 |
| Notificación | Suscribir destinos controlados → temporizador 1 s → stub registra argumentos | Falla restricción de destino; entrega real no probada | API-120–121 |

| Función | Anónimo | Dueño | Otro usuario | Resultado ejecutado |
|---|---|---|---|---|
| Estado, pesos, entrenamientos, Push, passkeys | 401 | Acceso según validación | No cambia identidad por query ni owner | PASS API-003–019, 047–049 |
| Borrar peso ajeno | 401 | 204 | 404 | PASS API-051–053 |
| Editar entrenamiento ajeno | 401 | 200 activo | 404 | PASS API-082–083 |
| Borrar passkey ajena | 401 | 204 con contraseña; 409 si último método | 404 | PASS API-106–107, 115 |
| Assertion de otra cuenta | Ceremonia requerida | Firma válida aceptada | 401 si allowedUserId distinto | PASS API-113 |

## Hallazgos

### API-D001 — El cierre de sesión no invalida el token emitido

- **Módulo:** autenticación/sesión. **Severidad/Prioridad:** HIGH P1. **Categoría:** seguridad, revocación. **Estado:** OPEN.
- **Descripción:** logout elimina la cookie en el cliente, pero cualquier copia del token sigue autorizando lecturas hasta `exp` (por defecto del producto, 30 días).
- **Precondiciones:** cuenta y copia propia de cookie válida antes de logout; no requiere otra cuenta ni falsificación de firma.
- **Pasos:** 1. Registrar/iniciar sesión y conservar cookie. 2. POST `/api/auth/logout`. 3. GET `/api/state` sin cookie. 4. Repetir GET con la cookie conservada.
- **Esperado:** logout 204; ambos accesos posteriores rechazados 401.
- **Obtenido:** sin cookie 401; cookie previa 200 y devuelve el estado privado, revisión 44.
- **Frecuencia:** siempre en ambas ejecuciones auditadas. **Impacto:** la salida no termina una sesión copiada/comprometida; el usuario no puede revocarla.
- **Evidencia:** API-122–124; `backend/src/services/session.service.ts:36` solo llama serializeCookie con Max-Age=0; `:66` comprueba firma/expiración y usuario, sin revocación. Ruta `backend/src/http/routes/auth.routes.ts:75`.
- **Causa probable:** tokens enteramente stateless sin sessionId, lista de revocación ni versión de sesión por usuario.
- **Recomendación:** sesiones revocables en servidor, ID aleatorio por sesión y revocación efectiva al salir. Verificar también expiración, sesiones simultáneas y cierre en todas las pestañas.

### API-D002 — Una assertion WebAuthn se acepta de nuevo con la misma ceremonia

- **Módulo:** WebAuthn. **Severidad/Prioridad:** HIGH P1. **Categoría:** seguridad, replay. **Estado:** OPEN.
- **Descripción:** la cookie firmada de ceremonia se borra en la respuesta pero no se invalida en el servidor. Una assertion y cookie previamente válidas pueden reutilizarse dentro del TTL.
- **Precondiciones:** passkey ECDSA válida que usa contador cero, modalidad admitida por WebAuthn; copia del request firmado y cookie de ceremonia. No basta conocer el challenge sin la firma.
- **Pasos:** 1. Registrar autenticador local. 2. POST login/options. 3. Firmar challenge y enviar login/verify con contador cero. 4. Repetir exactamente body y cookie del paso 3.
- **Esperado:** primero 200, segundo 401 por ceremonia consumida.
- **Obtenido:** ambos devuelven 200, `verified: true` y una nueva cookie de sesión.
- **Frecuencia:** siempre en ambas ejecuciones con contador cero. **Impacto:** pérdida de propiedad de un solo uso; un request capturado sirve de nuevo durante cinco minutos configurados.
- **Evidencia:** API-109–110. `backend/src/services/session.service.ts:52` no persiste consumo; `backend/src/services/webauthn.service.ts:176` verifica firma/counter sin invalidación del challenge. Las pruebas con challenge y origin incorrectos sí rechazaron 401 (API-111–112).
- **Causa probable:** se confunde borrar la cookie del navegador con consumir el reto en el backend.
- **Recomendación:** guardar retos aleatorios por ceremonia y consumirlos de forma atómica antes de completar; vincularlos a cuenta/operación y expirar. No usar el contador como sustituto de protección anti-replay, porque algunas passkeys mantienen cero.

### API-D003 — PUT del estado evita validaciones y permite datos que rompen consumidores

- **Módulo:** sincronización/persistencia transversal. **Severidad/Prioridad:** HIGH P1. **Categoría:** integridad y disponibilidad por usuario. **Estado:** OPEN.
- **Descripción:** se validan algunas colecciones, schemaVersion y owner, pero no sus elementos, campos obligatorios, enums, rangos, unicidad ni referencias. La API incremental de peso rechaza entradas que PUT acepta.
- **Precondiciones:** sesión propia y estado válido obtenido de GET `/api/state`.
- **Pasos:** 1. Cambiar `workoutSessions` a `[null]`. 2. PUT estado con su owner legítimo. 3. GET `/api/workouts/previous/barbell-squat`. Variantes: peso -400/fecha inválida; edad -10/sexo arbitrario; preferencias y weeklyPlan null; ID de ejercicio repetido; regla con config/state null; exerciseLibrary `[null]`.
- **Esperado:** 400 con campo/causa y conservación del estado previo; ningún error interno por entradas controlables.
- **Obtenido:** seis variantes se aceptan 200; sesión null se persiste y después historial devuelve 500; exerciseLibrary `[null]` devuelve 500 durante PUT antes de guardar. `bodyMeasurementReminder:null` se normaliza a valor por defecto: el fallo de esa variante corresponde a **preferencias/weeklyPlan** null, no al recordatorio.
- **Frecuencia:** siempre en ambas ejecuciones. **Impacto:** datos inválidos persistentes, resultados inconsistentes y funcionalidades inaccesibles hasta reparar estado. No se demostró acceso ni corrupción de otra cuenta.
- **Evidencia:** API-073–079; excepciones requestId `d37a94ac-6b2a-47c3-86d0-0ef89849b8b3` y `ad6e792b-c8b8-415c-9184-2732262ad964` en log. `backend/src/repositories/user-state.repository.ts:85`, `:111`, `:136`; consumidor `backend/src/services/progression.service.ts:108`.
- **Causa probable:** interfaces TypeScript convertidas con cast sobre entrada JSON desconocida, sin validador runtime profundo.
- **Recomendación:** esquema runtime completo con errores 400, identidad del owner controlada por servidor, constraints de colecciones/referencias e invariantes de sesión. Reutilizar validaciones entre endpoints incrementales y sincronización. Agregar migración/reparación controlada para datos ya inválidos.

### API-D004 — Cookies y parámetros URL mal codificados provocan HTTP 500

- **Módulo:** HTTP/router/cookies. **Severidad/Prioridad:** MEDIUM P2. **Categoría:** robustez/manejo de errores. **Estado:** OPEN.
- **Descripción:** `decodeURIComponent` lanza URIError sin captura sobre valores enviados por el cliente.
- **Precondiciones:** ninguna para cookie; el parámetro se decodifica antes de autenticar la ruta.
- **Pasos:** 1. GET `/api/auth/session` con `Cookie: og_session=%ZZ`. 2. GET `/api/workouts/previous/%ZZ`.
- **Esperado:** 400 por codificación inválida; alternativamente ignorar cookie inválida y responder sesión anónima. Nunca 500.
- **Obtenido:** ambos 500 `INTERNAL_ERROR`; servidor registra `URIError: URI malformed`. Mensaje cliente genérico, sin stack.
- **Frecuencia:** siempre. **Impacto:** solicitudes malformadas generan errores internos evitables y ruido de logs; no se probó caída del proceso.
- **Evidencia:** API-045–046; requestIds `ff45ddb9-20e1-4908-8e55-2303dd2ba2f5`, `500ea80c-d1e8-4d45-a83d-43ad887dba3f`. `backend/src/utils/cookies.ts:23`; `backend/src/http/router.ts:49`.
- **Causa probable:** parser sin guardia de errores para porcentaje/UTF-8 inválidos.
- **Recomendación:** parser defensivo que convierte fallos de URI en 400 o cookie ignorada; pruebas de `%`, UTF-8 truncado y cookies auxiliares malformadas.

### API-D005 — Fechas inexistentes se normalizan o persisten

- **Módulo:** peso y entrenamiento. **Severidad/Prioridad:** MEDIUM P2. **Categoría:** validación/consistencia de fechas. **Estado:** OPEN.
- **Precondiciones:** usuario autenticado.
- **Pasos:** POST `/api/body-weight` con `{"weightKg":80,"measuredAt":"2026-02-30T00:00:00Z"}`. Variante entrenamiento: scheduledDate `2026-02-30`.
- **Esperado:** 400 porque febrero de 2026 no tiene día 30.
- **Obtenido:** peso 201 con `measuredAt: 2026-03-02T00:00:00.000Z`; entrenamiento creado con literal `2026-02-30`.
- **Frecuencia:** siempre. **Impacto:** fechas cambiadas silenciosamente, agrupación temporal y constancia potencialmente incorrectas.
- **Evidencia:** API-063 y API-094. `backend/src/utils/validation.ts:65` y `:73` dependen de Date/Date.parse, que normalizan ciertos desbordamientos.
- **Causa probable:** validación sintáctica y parseabilidad sin comprobación del calendario original.
- **Recomendación:** comparar componentes originales con fecha reconstruida, validar calendario y zona obligatoria en date-time. Separar fecha civil de instante UTC.
- **Estado:** OPEN.

### API-D006 — El limitador de contraseña permite superar el umbral con concurrencia

- **Módulo:** autenticación por contraseña. **Severidad/Prioridad:** MEDIUM P2. **Categoría:** seguridad/concurrencia. **Estado:** OPEN.
- **Precondiciones:** usuario sin fallos previos; mismo clientKey/username para las solicitudes.
- **Pasos:** lanzar 12 POST login simultáneos con contraseña incorrecta; enviar después un login adicional.
- **Esperado:** máximo 5 verificaciones en ventana, resto 429 según MAX_FAILURES=5.
- **Obtenido:** los 12 devuelven 401, todos fueron verificados; el siguiente sí devuelve 429.
- **Frecuencia:** reproducido en ambas ejecuciones. **Impacto:** ráfagas eluden el límite efectivo y consumen trabajo scrypt; no se probó saturación del servidor ni intento masivo contra usuarios reales.
- **Evidencia:** API-071–072. `backend/src/services/password-auth.service.ts:63` comprueba antes de await; `:67` deriva la clave; `:69` incrementa después. Estado del limitador solo en memoria, se pierde en restart (observación por código).
- **Causa probable:** no se reserva de forma atómica un intento antes de iniciar la operación asíncrona.
- **Recomendación:** admisión atómica/in-flight por clave, límites por cuenta y origen, expiración/limpieza del mapa. Añadir prueba de ráfagas y política coherente ante reinicio.

### API-D007 — Entrenamientos admiten referencias inexistentes y series duplicadas

- **Módulo:** entrenamientos/historial. **Severidad/Prioridad:** MEDIUM P2. **Categoría:** integridad referencial. **Estado:** OPEN.
- **Precondiciones:** sesión, sin entrenamiento activo; `does-not-exist` ausente de exerciseLibrary.
- **Pasos:** crear entrenamiento con exerciseId `does-not-exist` y dos series completas con setNumber 1; completar su sessionId. El caso exploratorio incluyó fecha imposible, tratada como API-D005.
- **Esperado:** rechazar referencia ajena al catálogo del usuario y numeración duplicada antes de persistir/completar.
- **Obtenido:** POST 201, completar 200, historial conserva ejercicio inexistente y calcula 1RM 76 kg con dos series número 1.
- **Frecuencia:** siempre en la combinación ejecutada. **Impacto:** historial sin nombre/guía resoluble, posibles dobles conteos y asignación ambigua de series. Las variantes se observaron juntas; no se afirma una prueba aislada por cada campo.
- **Evidencia:** API-094–095. `backend/src/http/routes/workout.routes.ts:113` solo comprueba strings y arrays; `:130` valida setNumber individual sin unicidad. No consulta exerciseLibrary para resolver IDs.
- **Causa probable:** validación local de tipos sin invariantes de relaciones y colección.
- **Recomendación:** verificar IDs existentes o mantener un snapshot histórico explícito; rechazar duplicados de setNumber por ejercicio/lado según contrato. Aplicar igual regla en POST, PATCH y PUT state.

### API-D008 — Los destinos Web Push internos llegan sin restricción al transporte

- **Módulo:** Push. **Severidad/Prioridad:** HIGH P1. **Categoría:** seguridad, riesgo SSRF comprobado hasta frontera de transporte. **Estado:** OPEN.
- **Descripción:** solo se exige prefijo `https://`. Una cuenta puede persistir loopback, link-local e IP privada y hacer que el temporizador pase esas URLs a sendNotification.
- **Precondiciones:** VAPID configurado; usuario autenticado. La auditoría usó VAPID efímero y transporte stub sin red.
- **Pasos:** 1. Suscribir `https://127.0.0.1:9443/internal`, `https://169.254.169.254/metadata` y `https://10.0.0.1/admin`. 2. POST rest-timers durationSeconds=1. 3. Inspeccionar llamadas capturadas por stub.
- **Esperado:** destinos internos rechazados antes de persistir/despachar, conservando compatibilidad con proveedores Push válidos.
- **Obtenido:** tres suscripciones 201; temporizador 201; tres llamadas al stub con los tres destinos exactos.
- **Frecuencia:** una ejecución del escenario controlado, tres destinos aceptados. **Impacto:** frontera de salida de red controlable por usuario; posibilidad de solicitudes desde red del servidor si transporte/clave/TLS/conectividad lo permiten. **No se afirmó acceso a metadatos, lectura de respuesta, elusión TLS ni explotación real.** Las claves de suscripción eran ficticias porque el stub no cifra; la validación criptográfica del proveedor no forma parte de esta evidencia.
- **Evidencia:** API-120. `backend/src/services/push.service.ts:27`, `:34`, `:191`, `:227`. POST sin HTTPS sí devuelve 400 (API-121).
- **Causa probable:** validación de esquema URL insuficiente, sin filtro de IP/DNS/destino antes de envío.
- **Recomendación:** parsear URL, bloquear credenciales y rangos locales/privados/link-local/IPv6 equivalentes, validar resolución DNS y redirecciones en punto de envío, restringir egreso de contenedor; considerar lista explícita de proveedores soportados. Validar claves Push antes de persistir y repetir QA con proveedor controlado.

## Cobertura, estabilidad y límites

Los caminos verificados incluyen registros duplicados/mayúsculas, tipos inválidos, JSON roto, Content-Type incorrecto, CSRF por Origin, cookies alteradas/expiradas, propiedad cruzada, CRUD peso, revisiones optimistas, concurrencia, transición de entrenamiento, WebAuthn firmado con negativos, persistencia tras reinicio y errores sanitizados. Los 26 endpoints están alcanzados, pero no todos los límites (10 MiB, 100 ejercicios/series, timeout, rate limit distribuido), campos ni cambios simultáneos entre procesos fueron ejecutados.

La prueba de 25 GET de estado concurrentes dio p50 **59,18 ms**, p95 **97,85 ms**, máximo **101,83 ms**, todos 200: aceptable en este equipo y dataset pequeño. No equivale a benchmark de producción. Veinte altas concurrentes conservaron sus veinte filas e IDs únicos; diez PUT con la misma revisión produjeron un 200 y nueve 409; ocho altas de mismo username produjeron un 201 y siete 409.

| Área no cubierta | Estado | Razón |
|---|---|---|
| Passkey hardware/biometría y compatibilidad navegador | BLOCKED | Backend probado con autenticador local, sin intervención en dispositivos personales |
| Entrega real Push/proveedor/expiración 410 y restauración de entrega | BLOCKED | Sin notificaciones externas autorizadas; transporte controlado |
| TLS, cookie Secure y proxy Nginx ejecutándose | BLOCKED | No Docker/TLS durante esta subauditoría |
| Recuperación/cambio de contraseña, usuario deshabilitado | NOT APPLICABLE | No existen endpoints ni requisito confirmado para esos flujos |
| Múltiples procesos sobre mismo DATA_DIR | NOT TESTED | Compose define réplica única; mutex solo protege un proceso |
| Corte de energía, fsync, permisos de archivo/corrupción y recuperación | NOT TESTED | No se indujo fallo de disco; rename atómico no aporta backup/fsync |
| Conectividad/explotación SSRF | NOT TESTED | Se verificó destino entregado al stub, no tráfico real |

Riesgos adicionales por lectura: reemplazar estado sin If-Match está permitido (posible sobrescritura por clientes no conformes); db/state completos se cargan y serializan en cada mutación, sin índice transaccional; no hay bloqueo entre procesos; el mapa de intentos no limpia globalmente claves abandonadas; errores de proveedor Push distintos de 404/410 se absorben sin detalle observable; no hay límites de usuarios/suscripciones ni cuotas de disco. Son riesgos/deuda técnica, no fallos adicionales contados como reproducidos.

## Plan de corrección propuesto

| Orden | Prioridad | Hallazgo | Acción | Complejidad | Riesgo de cambio |
|---:|---|---|---|---|---|
| 1 | P1 | API-D003 | Validación runtime completa + plan de reparación de estados | Alta | Alto: compatibilidad de datos |
| 2 | P1 | API-D001 | Sesiones revocables y logout efectivo | Media | Medio: migrar sesiones |
| 3 | P1 | API-D002 | Challenges WebAuthn de un solo uso atómico | Media | Medio: reintentos y múltiples pestañas |
| 4 | P1 | API-D008 | Restringir destinos Push y egreso, validar claves | Media | Medio: compatibilidad proveedores |
| 5 | P2 | API-D006 | Limitador atómico, limpieza y concurrencia | Media | Bajo/medio |
| 6 | P2 | API-D007 | Referencias y unicidad de series en todos los writes | Media | Medio: historial existente |
| 7 | P2 | API-D005 | Fechas estrictas sin normalización silenciosa | Baja | Bajo |
| 8 | P2 | API-D004 | Decodificación URI defensiva | Baja | Bajo |

No se corrigió código de producto, no se hizo commit/push y no se reinició el entorno del usuario. Los cambios entregados son exclusivamente scripts de auditoría y evidencia.
