# Matriz consolidada de regresión

Base `acda8d3`. Generada desde los cuatro JSON de casos, sin convertir BLOCKED o NOT TESTED en PASS. Los tests existentes se reportan aparte en baseline.md.

## Resumen por frente

| Frente | Identificados | Ejecutados | PASS | FAIL | BLOCKED | NOT TESTED | N/A | Aprobación |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| backend | 133 | 126 | 110 | 16 | 3 | 3 | 1 | 87.30% |
| business | 27 | 27 | 12 | 15 | 0 | 0 | 0 | 44.44% |
| pwa | 35 | 26 | 15 | 11 | 5 | 4 | 0 | 57.69% |
| ui | 61 | 54 | 48 | 6 | 1 | 6 | 0 | 88.89% |

## Inventario funcional y cobertura mínima

Una función probada tiene al menos un caso PASS o FAIL; puede seguir teniendo escenarios bloqueados o pendientes. Esto NO representa cobertura de líneas/ramas ni agotamiento de combinaciones. Las filas comparten algunos casos; el total único de casos se calcula por ID.

| ID | Módulo / funcionalidad | Casos definidos | Ejecutados | PASS | FAIL | BLOCKED | NOT TESTED | Cobertura de casos |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| F-01 | Acceso / Registro por contraseña | 4 | 4 | 4 | 0 | 0 | 0 | 100.0% |
| F-02 | Acceso / Login por contraseña | 3 | 3 | 3 | 0 | 0 | 0 | 100.0% |
| F-03 | Acceso / Registro passkey y método adicional | 4 | 3 | 3 | 0 | 1 | 0 | 75.0% |
| F-04 | Acceso / Login passkey y ceremonia de un solo uso | 4 | 4 | 3 | 1 | 0 | 0 | 100.0% |
| F-05 | Acceso / Cierre de sesión y revocación | 4 | 4 | 2 | 2 | 0 | 0 | 100.0% |
| F-06 | Acceso / Listar/eliminar métodos sin perder acceso | 3 | 3 | 3 | 0 | 0 | 0 | 100.0% |
| F-07 | Seguridad / Aislar cuentas y denegar acceso directo | 6 | 6 | 6 | 0 | 0 | 0 | 100.0% |
| F-08 | Seguridad / Limitar intentos y concurrencia de login | 2 | 2 | 1 | 1 | 0 | 0 | 100.0% |
| F-09 | Datos / Leer/reemplazar estado y validar documento | 5 | 5 | 2 | 3 | 0 | 0 | 100.0% |
| F-10 | Datos / Persistir y recuperar tras reinicio | 3 | 3 | 3 | 0 | 0 | 0 | 100.0% |
| F-11 | Datos / Evitar duplicados y escrituras concurrentes | 4 | 3 | 3 | 0 | 0 | 1 | 75.0% |
| F-12 | Configuración / Solicitar datos iniciales una vez y reabrir | 4 | 4 | 4 | 0 | 0 | 0 | 100.0% |
| F-13 | Configuración / Generar por objetivo/experiencia/días/tiempo | 4 | 4 | 1 | 3 | 0 | 0 | 100.0% |
| F-14 | Configuración / Aplicar prioridades musculares | 2 | 2 | 1 | 1 | 0 | 0 | 100.0% |
| F-15 | Configuración / Respetar equipamiento y límites | 2 | 2 | 1 | 1 | 0 | 0 | 100.0% |
| F-16 | Plan / Crear y conservar plan base semanal | 3 | 3 | 3 | 0 | 0 | 0 | 100.0% |
| F-17 | Plan / Reprogramar una fecha sin alterar base | 2 | 2 | 2 | 0 | 0 | 0 | 100.0% |
| F-18 | Entrenamiento / Ejecutar superseries y descansos por ronda | 1 | 1 | 0 | 1 | 0 | 0 | 100.0% |
| F-19 | Entrenamiento / Iniciar/reanudar/completar/cancelar sesión | 7 | 7 | 7 | 0 | 0 | 0 | 100.0% |
| F-20 | Entrenamiento / Autocompletar cargas y registrar por lado | 4 | 4 | 3 | 1 | 0 | 0 | 100.0% |
| F-21 | Entrenamiento / Guardar carga/reps/RPE/RIR válidos | 4 | 4 | 0 | 4 | 0 | 0 | 100.0% |
| F-22 | Progresión / Lineal, estancamiento y descarga | 3 | 3 | 2 | 1 | 0 | 0 | 100.0% |
| F-23 | Progresión / Doble progresión por máximo de repeticiones | 1 | 1 | 0 | 1 | 0 | 0 | 100.0% |
| F-24 | Progresión / Lógica distintiva AMRAP de Greyskull | 1 | 0 | 0 | 0 | 0 | 1 | 0.0% |
| F-25 | Progresión / Tiempo y estimación de 1RM | 3 | 3 | 2 | 1 | 0 | 0 | 100.0% |
| F-26 | Métricas / Registrar/eliminar peso y meta | 5 | 5 | 4 | 1 | 0 | 0 | 100.0% |
| F-27 | Métricas / IMC, energía, grasa, masa magra, macros | 5 | 5 | 3 | 2 | 0 | 0 | 100.0% |
| F-28 | Métricas / Guardar/consultar/borrar medición corporal | 3 | 3 | 3 | 0 | 0 | 0 | 100.0% |
| F-29 | Recordatorios / Recordatorio mensual, posponer y rearmar | 4 | 4 | 3 | 1 | 0 | 0 | 100.0% |
| F-30 | Gráficas / Tendencia y línea de meta temporal | 2 | 2 | 0 | 2 | 0 | 0 | 100.0% |
| F-31 | Gráficas / Constancia anual de 365 días | 2 | 2 | 1 | 1 | 0 | 0 | 100.0% |
| F-32 | Gráficas / Carga muscular por sexo y estímulo | 2 | 2 | 2 | 0 | 0 | 0 | 100.0% |
| F-33 | Biblioteca / Buscar/filtrar/categorizar catálogo | 2 | 2 | 2 | 0 | 0 | 0 | 100.0% |
| F-34 | Biblioteca / Crear ejercicio y segmentar músculos | 3 | 3 | 2 | 1 | 0 | 0 | 100.0% |
| F-35 | Biblioteca / Imágenes y guía correspondiente | 4 | 3 | 1 | 2 | 0 | 1 | 75.0% |
| F-36 | Accesibilidad / Explicar siglas con interacción | 1 | 1 | 1 | 0 | 0 | 0 | 100.0% |
| F-37 | Accesibilidad / Foco, etiquetas, contraste y teclado | 4 | 3 | 3 | 0 | 0 | 1 | 75.0% |
| F-38 | Interfaz / Navegación responsive de seis rutas | 25 | 25 | 21 | 4 | 0 | 0 | 100.0% |
| F-39 | Offline / Leer/editar sin conexión y mantener borrador | 4 | 4 | 2 | 2 | 0 | 0 | 100.0% |
| F-40 | Offline / Reconciliar cambios y resolver conflictos | 2 | 2 | 0 | 2 | 0 | 0 | 100.0% |
| F-41 | PWA / Shell offline y actualización de medios | 5 | 4 | 2 | 2 | 0 | 1 | 80.0% |
| F-42 | PWA / Mantener pantalla despierta y liberar bloqueo | 3 | 2 | 2 | 0 | 1 | 0 | 66.7% |
| F-43 | PWA / Temporizador, extensión, cancelación y aviso | 8 | 7 | 3 | 4 | 1 | 0 | 87.5% |
| F-44 | PWA / Instalar y relanzar en dispositivos reales | 1 | 0 | 0 | 0 | 1 | 0 | 0.0% |
| F-45 | Infraestructura / Origen único, TTL, headers y despliegue | 4 | 2 | 1 | 1 | 2 | 0 | 50.0% |
| F-46 | Calidad / Build y dependencias conocidas | 2 | 2 | 2 | 0 | 0 | 0 | 100.0% |
| F-47 | Calidad / Regresión remota, observabilidad y carga | 4 | 1 | 1 | 0 | 0 | 3 | 25.0% |
| F-48 | Recuperación / Exportar/restaurar cuenta y recuperar corrupción | 2 | 0 | 0 | 0 | 0 | 2 | 0.0% |

## Todos los escenarios

| ID | Frente / módulo | Escenario | Estado | Detalle |
|---|---|---|---|---|
| API-001 | backend / HTTP | GET /api/health público | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-002 | backend / Auth | GET /api/auth/session anónimo | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-003 | backend / Authorization | GET /api/state sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-004 | backend / Authorization | PUT /api/state sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-005 | backend / Authorization | POST /api/body-weight sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-006 | backend / Authorization | DELETE /api/body-weight/unknown sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-007 | backend / Authorization | GET /api/workouts/previous/barbell-squat sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-008 | backend / Authorization | POST /api/workouts sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-009 | backend / Authorization | PATCH /api/workouts/unknown sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-010 | backend / Authorization | POST /api/workouts/unknown/complete sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-011 | backend / Authorization | POST /api/workouts/unknown/cancel sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-012 | backend / Authorization | GET /api/auth/passkeys sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-013 | backend / Authorization | DELETE /api/auth/passkeys/unknown sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-014 | backend / Authorization | GET /api/push/vapid-public-key sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-015 | backend / Authorization | POST /api/push/subscriptions sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-016 | backend / Authorization | DELETE /api/push/subscriptions/unknown sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-017 | backend / Authorization | POST /api/push/rest-timers sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-018 | backend / Authorization | DELETE /api/push/rest-timers/unknown sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-019 | backend / Authorization | POST /api/push/body-measurement-reminder/sync sin sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-020 | backend / HTTP | POST login con text/plain | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-021 | backend / HTTP | POST login JSON inválido | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-022 | backend / Validation | Registro inválido null | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-023 | backend / Validation | Registro inválido [] | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-024 | backend / Validation | Registro inválido {} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-025 | backend / Validation | Registro inválido {"username":123,"password":"<test-value-redacted>"} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-026 | backend / Validation | Registro inválido {"username":"qa-user","password":12} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-027 | backend / Validation | Registro inválido {"username":"../user","password":"<test-value-redacted>"} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-028 | backend / Validation | Registro inválido {"username":"ñandú","password":"<test-value-redacted>"} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-029 | backend / Validation | Registro inválido {"username":"qa-user","password":"<test-value-redacted>"} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-030 | backend / Validation | Registro inválido {"username":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","password":"<test-value-redacted>"} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-031 | backend / Validation | Registro inválido {"username":"qa-user","password":"<test-value-redacted>"} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-032 | backend / CSRF | POST origin ajeno | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-033 | backend / CSRF | POST producción sin Origin | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-034 | backend / Auth | Registro con usuario y contraseña | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-035 | backend / Auth | Cookie de sesión HttpOnly/SameSite/Max-Age | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-036 | backend / Persistence | Contraseña no persistida en claro | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-037 | backend / Auth | Registro duplicado ignorando mayúsculas | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-038 | backend / Auth | Registrar otra cuenta con sesión activa | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-039 | backend / Auth | Login contraseña errónea | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-040 | backend / Auth | Login usuario inexistente | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-041 | backend / Auth | Login normaliza mayúsculas y espacios de usuario | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-042 | backend / Auth | Sesión firmada alterada | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-043 | backend / Auth | Sesión firmada expirada | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-044 | backend / Auth | Sesión firmada usuario inexistente | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-045 | backend / HTTP | Cookie mal codificada %ZZ | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-046 | backend / HTTP | Parámetro URL mal codificado %ZZ | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-047 | backend / Authorization | Dos usuarios reciben estados independientes | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-048 | backend / Authorization | Alice intenta PUT estado de Bob | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-049 | backend / Authorization | Query userId de Bob no cambia el usuario autenticado | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-050 | backend / BodyWeight | Crear peso decimal con Unicode | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-051 | backend / Authorization | Bob no puede borrar peso de Alice | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-052 | backend / BodyWeight | Eliminar peso propio | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-053 | backend / BodyWeight | Eliminar peso otra vez | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-054 | backend / BodyWeight | Peso inválido {} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-055 | backend / BodyWeight | Peso inválido {"weightKg":null} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-056 | backend / BodyWeight | Peso inválido {"weightKg":"80"} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-057 | backend / BodyWeight | Peso inválido {"weightKg":19.99} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-058 | backend / BodyWeight | Peso inválido {"weightKg":500.01} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-059 | backend / BodyWeight | Peso inválido {"weightKg":80,"measuredAt":"not-date"} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-060 | backend / BodyWeight | Peso inválido {"weightKg":80,"note":"xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"} | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-061 | backend / BodyWeight | Peso límite 20 | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-062 | backend / BodyWeight | Peso límite 500 | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-063 | backend / Validation | Fecha imposible 2026-02-30T00:00:00Z | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-064 | backend / State | PUT estado válido If-Match | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-065 | backend / State | PUT revisión obsoleta | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-066 | backend / State | PUT If-Match inválido | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-067 | backend / State | PUT documento vacío | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-068 | backend / Concurrency | 10 reemplazos con misma revisión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-069 | backend / Concurrency | 20 altas de peso concurrentes | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-070 | backend / Concurrency | 8 registros del mismo usuario concurrentes | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-071 | backend / Security | 12 contraseñas erróneas simultáneas con límite de 5 | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-072 | backend / Security | Bloqueo tras 5 fallos secuenciales | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-073 | backend / StateValidation | weightKg negativo vía estado | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-074 | backend / StateValidation | perfil con edad negativa y sexo arbitrario | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-075 | backend / StateValidation | plan, preferencias y recordatorio nulos | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-076 | backend / StateValidation | sesión nula en colección | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-077 | backend / StateValidation | IDs duplicados de ejercicios | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-078 | backend / StateValidation | progresión con configuración nula | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-079 | backend / StateValidation | exerciseLibrary contiene null | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-080 | backend / Workout | Crear sesión con serie válida | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-081 | backend / Workout | Segundo entrenamiento activo bloqueado | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-082 | backend / Authorization | Bob no puede editar sesión de Alice | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-083 | backend / Workout | Editar notas de sesión activa | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-084 | backend / Workout | RPE fuera de límites | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-085 | backend / Workout | Completar sesión | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-086 | backend / Workout | Recuperar serie previa y 1RM 76kg | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-087 | backend / Workout | Completar dos veces es idempotente | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-088 | backend / Workout | Editar completado rechazado | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-089 | backend / Workout | Cancelar completado rechazado | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-090 | backend / Workout | Completar inexistente | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-091 | backend / Workout | Completar sin ejercicios rechazado | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-092 | backend / Workout | Cancelar activo | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-093 | backend / Workout | Completar cancelado rechazado | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-094 | backend / Workout | Ejercicio inexistente, setNumber repetido y fecha imposible | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-095 | backend / Workout | No completar sesión con ejercicio ajeno al catálogo | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-096 | backend / Push | VAPID sin configurar informa 503 | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-097 | backend / Push | Suscripción sin VAPID informa 503 | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-098 | backend / Push | Temporizador sin VAPID informa 503 | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-099 | backend / Push | Temporizador inválido informa 400 | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-100 | backend / Push | Eliminar suscripción inexistente | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-101 | backend / Push | Eliminar temporizador inexistente | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-102 | backend / Push | Sincronizar recordatorio mensual | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-103 | backend / WebAuthn | Opciones RP localhost y UV/residentKey requeridos | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-104 | backend / WebAuthn | Registro real con clave ECDSA y attestation none local | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-105 | backend / WebAuthn | Listar passkey sin exponer clave privada ni pública | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-106 | backend / Authorization | Alice no elimina passkey de otro usuario | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-107 | backend / WebAuthn | No eliminar único método de acceso | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-108 | backend / WebAuthn | Opciones de login restringidas a usuario | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-109 | backend / WebAuthn | Verificación ECDSA válida contador cero | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-110 | backend / WebAuthn | Replay idéntico de assertion y cookie de ceremonia | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-111 | backend / WebAuthn | Challenge incorrecto rechazado | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-112 | backend / WebAuthn | Origen incorrecto criptográficamente firmado rechazado | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-113 | backend / WebAuthn | Assertion válida de otra cuenta rechazada | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-114 | backend / WebAuthn | Añadir passkey a cuenta con contraseña | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-115 | backend / WebAuthn | Eliminar passkey conservando contraseña | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-116 | backend / WebAuthn | Verificación sin ceremonia | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-117 | backend / WebAuthn | Opciones cuenta inexistente | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-118 | backend / WebAuthn | Opciones login descubrible sin usuario | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-119 | backend / Persistence | Datos sobreviven reinicio del servidor | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-120 | backend / PushSecurity | Destinos Push loopback, link-local y privado llegan a transporte | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-121 | backend / Push | Suscripción sin HTTPS rechazada con VAPID activo | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-122 | backend / Auth | Logout borra cookie del navegador | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-123 | backend / Auth | Acceso sin cookie después de logout | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-124 | backend / Auth | Reutilizar cookie capturada antes de logout | FAIL | [Esperado, observado y evidencia](backend-cases.json) |
| API-125 | backend / Performance | 25 lecturas concurrentes de estado pequeño | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-126 | backend / Persistence | Escrituras atómicas no dejan temporales | PASS | [Esperado, observado y evidencia](backend-cases.json) |
| API-127 | backend / Limits | Passkey hardware/biometría/navegadores reales | BLOCKED | [Esperado, observado y evidencia](backend-cases.json) |
| API-128 | backend / Limits | Entrega Web Push a proveedor externo | BLOCKED | [Esperado, observado y evidencia](backend-cases.json) |
| API-129 | backend / Limits | HTTPS y cookie Secure extremo a extremo | BLOCKED | [Esperado, observado y evidencia](backend-cases.json) |
| API-130 | backend / Limits | Recuperar/cambiar contraseña o deshabilitar usuario | NOT APPLICABLE | [Esperado, observado y evidencia](backend-cases.json) |
| API-131 | backend / Limits | Múltiples procesos compartiendo DATA_DIR | NOT TESTED | [Esperado, observado y evidencia](backend-cases.json) |
| API-132 | backend / Limits | Corte de energía/fsync/recuperación de archivo corrupto | NOT TESTED | [Esperado, observado y evidencia](backend-cases.json) |
| API-133 | backend / Limits | Conectividad/explotación SSRF vía Push | NOT TESTED | [Esperado, observado y evidencia](backend-cases.json) |
| BUS-001 | business / Negocio | Routine matrix: all days/equipment/goals/experience resolve catalog exercises | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-002 | business / Negocio | Perfect beginner session must not count as failure | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-003 | business / Negocio | Double progression advances at the prescribed upper range | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-004 | business / Negocio | Completing timed prescription must not count as repetition failure | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-005 | business / Negocio | Selected priority muscles influence the generated routine | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-006 | business / Negocio | Thirty-minute routine fits even minimum tempo/repetitions/rest time | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-007 | business / Negocio | Prefill preserves corresponding loads of previous working sets | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-008 | business / Negocio | Turning previous-load prefill off resets loads | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-009 | business / Negocio | Per-side sets have distinct left/right identities | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-010 | business / Negocio | Exact configured failure threshold triggers one 10% deload | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-011 | business / Negocio | Completing the same workout is progression-idempotent | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-012 | business / Negocio | 1RM handles single rep and rejects fractional reps | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-013 | business / Negocio | Superset rests after the complete round | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-014 | business / Negocio | Extending rest updates the remote push deadline as well as local time | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-015 | business / Negocio | Negative load/fractional repetition cannot be marked complete | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-016 | business / Negocio | RPE outside 1..10 is rejected before autosave | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-017 | business / Negocio | Female energy/BMI independent arithmetic reference | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-018 | business / Negocio | Accepted calculator inputs yield positive coherent calorie/macronutrient totals | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-019 | business / Negocio | Optional perimeters are all-or-valid, not partial estimates | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-020 | business / Negocio | Metrics form prefills latest chronological body weight | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-027 | business / Negocio | Acknowledgement of RPE save preserves a newer RIR edit in progress | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-021 | business / Negocio | One-day reschedule removes only original occurrence and keeps base plan | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-022 | business / Negocio | Constancy window is exactly 365 unique local days excluding future/old days | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-023 | business / Negocio | Monthly reminder clamps month end and is due at exact deadline | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-024 | business / Negocio | Muscle stimulus uses 2:1 primary/secondary weighting | PASS | [Esperado, observado y evidencia](business-cases.json) |
| BUS-025 | business / Negocio | Weight trend horizontal distance preserves elapsed calendar time | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| BUS-026 | business / Negocio | Bodyweight plan supports advertised optional pull-up bar | FAIL | [Esperado, observado y evidencia](business-cases.json) |
| PWA-001 | pwa / Sync | Carga online y cacheo | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-002 | pwa / Sync | Edición offline y flush al reconectar | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-003 | pwa / Sync | Reload con cambios locales/remotos incompatibles | FAIL | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-004 | pwa / Sync | Reload offline restaura indicador pending | FAIL | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-005 | pwa / Persistencia | Fallo de escritura IndexedDB/cuota | FAIL | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-006 | pwa / Auth | Logout inaccesible y reload online | FAIL | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-007 | pwa / Auth/Sync | Load tardío tras logout/reset | FAIL | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-008 | pwa / Temporizador | Ampliar descanso actualiza Push | FAIL | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-009 | pwa / Temporizador | Omitir durante programación pendiente | FAIL | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-010 | pwa / Temporizador | Recuperación tras salto de reloj/suspensión | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-011 | pwa / WakeLock | Adquisición que resuelve después de desmontar | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-012 | pwa / WakeLock | Permiso denegado | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-013 | pwa / SW | Primera revisita offline con cachés reales | NOT TESTED | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-014 | pwa / SW | Conservar shell tras 502 y desconexión | FAIL | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-015 | pwa / SW | Actualizar imagen corregida con mismaURL | FAIL | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-016 | pwa / SW | Exclusión API de CacheStorage | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-017 | pwa / SW | Imagen vista disponible offline | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-018 | pwa / Scheduler | Restaurar descanso programado | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-019 | pwa / Scheduler | Cancelar descanso | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-020 | pwa / Scheduler | Retirar suscripción expirada410 | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-021 | pwa / Recordatorio | Envío mensual y próximo vencimiento | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-022 | pwa / Recordatorio | Reintento ante503 de proveedor | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-023 | pwa / Recordatorio | Posponer offline y sincronizar estado | FAIL | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-024 | pwa / Dependencias | npm audit frontend | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-025 | pwa / Dependencias | npm audit backend | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-026 | pwa / Infraestructura | ResoluciónCompose y origen unificado | PASS | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-027 | pwa / Infraestructura | Transferencia TTL a backendCompose | FAIL | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-028 | pwa / Infraestructura | Arranque y salud Docker/Nginx real | BLOCKED | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-029 | pwa / WebPush | Suscripción y entrega externa en SO | BLOCKED | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-030 | pwa / WakeLock | Pantalla física encendida y recuperaciónSO | BLOCKED | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-031 | pwa / Instalación | Instalación nativa Android/iOS/escritorio | BLOCKED | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-032 | pwa / Persistencia | IndexedDB real: cuota/evicción/migración | NOT TESTED | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-033 | pwa / CI | Pipeline remoto de regresión | NOT TESTED | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-034 | pwa / Infraestructura | Headers reales Nginx/TLS/proxy | BLOCKED | [Esperado, observado y evidencia](pwa-cases.json) |
| PWA-035 | pwa / Observabilidad | Fallo de disco en callback asíncronoPush | NOT TESTED | [Esperado, observado y evidencia](pwa-cases.json) |
| UI-001 | ui / Autenticación | Rechazar confirmación de contraseña distinta | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-002 | ui / Autenticación | Registro por contraseña y primera entrada | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-003 | ui / Guía inicial | Datos vacíos obligatorios | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-004 | ui / Guía inicial | Perfil femenino completo y navegación de pasos | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-005 | ui / Guía inicial | Máximo de dos prioridades | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-006 | ui / Guía inicial | Confirmación de seguridad de entrenamiento | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-007 | ui / Guía inicial | Persistencia de plan generado | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-008 | ui / Guía inicial | No repetir tras recarga y nuevo login | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-009 | ui / Guía inicial | Reabrir y cerrar sin guardar | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-010 | ui / Accesibilidad | Ayuda de RPE mediante clic y Escape | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-011 | ui / Métricas | Perímetros femeninos y recordatorio | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-012 | ui / Métricas | Unicode y HTML literal en nota | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-013 | ui / Métricas | Cancelar eliminación con Escape | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-014 | ui / Biblioteca | Búsqueda sin resultados | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-015 | ui / Biblioteca | Búsqueda exacta y guía de press banca | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-016 | ui / Biblioteca | Principales y secundarios excluyentes | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-017 | ui / Biblioteca | Crear ejercicio con Unicode | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-018 | ui / Biblioteca | Imagen para ejercicio personalizado | FAIL | [Esperado, observado y evidencia](ui-cases.json) |
| UI-019 | ui / Entrenamiento | Inicio, progreso y persistencia de sesión | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-020 | ui / Entrenamiento | Descanso intermedio y omisión local | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-021 | ui / Entrenamiento | Conservar RPE/RIR al cambiar de campo | FAIL | [Esperado, observado y evidencia](ui-cases.json) |
| UI-022 | ui / Entrenamiento | Impedir finalización parcial | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-023 | ui / Entrenamiento | Registro por lado y finalización completa | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-024 | ui / Plan | Mover sesión manteniendo plan semanal | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-025 | ui / Perfil | Acceder desde el nombre de usuario | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-026 | ui / Autenticación | Logout y acceso directo privado | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-027 | ui / Autenticación | Navegar atrás después de logout | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-028 | ui / Autenticación | Error y reintento de contraseña | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-029 | ui / Accesibilidad | Contraste de textos con fondo plano en métricas | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-030 | ui / Accesibilidad | Foco inicial de páginas y modales | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-031 | ui / Medios | Correspondencia visual de195 ejercicios completa | NOT TESTED | [Esperado, observado y evidencia](ui-cases.json) |
| UI-032 | ui / Accesibilidad | WCAG completo con lector de pantalla y zoom | NOT TESTED | [Esperado, observado y evidencia](ui-cases.json) |
| UI-033 | ui / Navegadores | Safari/iOS y Firefox reales | BLOCKED | [Esperado, observado y evidencia](ui-cases.json) |
| UI-034 | ui / Recuperación | Exportación e importación completa de usuario | NOT TESTED | [Esperado, observado y evidencia](ui-cases.json) |
| UI-035 | ui / Rendimiento | LCP/INP/CLS en móvil real y red lenta | NOT TESTED | [Esperado, observado y evidencia](ui-cases.json) |
| UI-036 | ui / Media/UI | Escenario de imagen ausente en servidor | NOT TESTED | [Esperado, observado y evidencia](ui-cases.json) |
| UI-037 | ui / Progresión | Comportamiento AMRAP distintivo de Greyskull | NOT TESTED | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R01 | ui / Responsive | / a 1440x900 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R02 | ui / Responsive | /metrics a 1440x900 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R03 | ui / Responsive | /plan a 1440x900 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R04 | ui / Responsive | /library a 1440x900 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R05 | ui / Responsive | /workout a 1440x900 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R06 | ui / Responsive | /profile a 1440x900 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R07 | ui / Responsive | / a 1280x800 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R08 | ui / Responsive | /metrics a 1280x800 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R09 | ui / Responsive | /plan a 1280x800 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R10 | ui / Responsive | /library a 1280x800 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R11 | ui / Responsive | /workout a 1280x800 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R12 | ui / Responsive | /profile a 1280x800 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R13 | ui / Responsive | / a 768x1024 | FAIL | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R14 | ui / Responsive | /metrics a 768x1024 | FAIL | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R15 | ui / Responsive | /plan a 768x1024 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R16 | ui / Responsive | /library a 768x1024 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R17 | ui / Responsive | /workout a 768x1024 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R18 | ui / Responsive | /profile a 768x1024 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R19 | ui / Responsive | / a 390x844 | FAIL | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R20 | ui / Responsive | /metrics a 390x844 | FAIL | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R21 | ui / Responsive | /plan a 390x844 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R22 | ui / Responsive | /library a 390x844 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R23 | ui / Responsive | /workout a 390x844 | PASS | [Esperado, observado y evidencia](ui-cases.json) |
| UI-R24 | ui / Responsive | /profile a 390x844 | PASS | [Esperado, observado y evidencia](ui-cases.json) |

Funciones identificadas: 48; ejercitadas al menos una vez: 45; cobertura funcional mínima: 93.75%.

Casos únicos: 256; ejecutados: 233; aprobación: 79.4%. Ejecución de escenarios aplicables: 91.37%.
