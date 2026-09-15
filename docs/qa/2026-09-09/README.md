# Auditoría QA integral de FORJA

9 de septiembre de 2026 · commit `acda8d39f379a8f1c60956b3be14022eeb692770`

## Dictamen: NO RECOMENDADO PARA PRODUCCIÓN

El flujo principal funciona con datos válidos, pero se reprodujeron pérdida silenciosa de cambios, problemas de cierre de sesión y replay de autenticación, persistencia de estructuras inválidas, errores de progresión y defectos de presentación móvil. No basta con que las pruebas existentes estén en verde.

La auditoría concluye con evidencia y limitaciones explícitas. No certifica ausencia de vulnerabilidades, idoneidad clínica ni compatibilidad con todos los dispositivos. No se corrigió código del producto, no se usaron datos reales, no se hizo commit/push y no se inició Docker.

## Resumen ejecutivo

| Medida | Resultado |
|---|---:|
| Capacidades funcionales identificadas | 48 |
| Capacidades con al menos una comprobación ejecutada | 45 |
| Cobertura funcional mínima | 93,75% |
| Escenarios adicionales identificados | 256 |
| Escenarios ejecutados con resultado evaluable | 233 |
| PASS / FAIL | 185 / 48 |
| BLOCKED / NOT TESTED / NOT APPLICABLE | 9 / 13 / 1 |
| Tasa de aprobación de casos ejecutados | 79,40% |
| Ejecución de escenarios aplicables | 91,37% |
| Tests existentes, contabilizados aparte | 102 PASS |
| Build frontend / backend | PASS / PASS |
| Defectos confirmados, deduplicados | 34 |
| P0 / P1 / P2 / P3 | 0 / 13 / 18 / 3 |
| Mejoras P4 propuestas, no defectos | 4 |

Cobertura funcional mínima = 45/48: una función puede tener un caso ejecutado y otros pendientes. **No es cobertura total de requisitos, ramas, combinaciones ni dispositivos.** Tasa de aprobación = 185/233. Ejecución de escenarios aplicables = 233/(256−1). Los 48 FAIL son casos, no 48 defectos independientes. Se cuentan varias pruebas del mismo defecto como escenarios diferentes, pero se deduplican los hallazgos. `BUS-F07` y `PWA-F06` son el mismo problema; `BUS-027` y `UI-021` prueban `UI-F02`.

Las cifras se calculan desde los JSON, no se estiman: [summary.json](summary.json), [matriz completa](regression-matrix.md) y [48 capacidades con dependencias y rol](inventory.md).

## Qué funciona en el alcance comprobado

- Registro y login por contraseña, validación de confirmación, errores comprensibles y entrada sin repetir el asistente completado.
- Guía de siete pasos, perfil femenino, límite de dos prioridades, generación y persistencia del plan; acceso manual superior para reabrirla.
- Aislamiento de datos entre cuentas en las peticiones probadas, rechazo de origen ajeno, cookies HttpOnly/SameSite y contraseña no almacenada en claro.
- Registro/verificación criptográfica de passkeys en el backend con autenticador sintético; rechazo de challenge, origen y cuenta incorrectos. Esto no aprueba el replay ni prueba Face ID/Touch ID.
- Flujo de entrenamiento completo con 14 series, identidades por lado, bloqueo de finalización parcial, reanudación y finalización idempotente del backend.
- Mediciones y perímetros, nota Unicode/HTML literal, recordatorio mensual en condiciones normales y reprogramación puntual conservando el plan base.
- Búsqueda, vacío de resultados, selector de músculos principales/secundarios excluyentes y creación de ejercicio personalizado.
- Escrituras concurrentes de un solo proceso, controles de revisión, reinicio con datos conservados y pruebas de calendario/365 días/ponderación muscular.
- En la muestra de accesibilidad: ayudas de siglas, foco contextual, Escape y 88 textos de Métricas con contraste suficiente en fondos planos.

Cada afirmación anterior tiene un alcance limitado al caso referenciado en la matriz; no debe extenderse a las variantes que fallan a continuación.

## Defectos prioritarios

| Prioridad | IDs | Resultado comprobado | Impacto |
|---|---|---|---|
| P1 | API-D001, API-D002 | Cookie anterior al logout sigue válida; assertion y cookie de ceremonia se aceptan otra vez | Sesión/ceremonia sin invalidación efectiva. Requiere conservar el material firmado; no equivale a acceso arbitrario sin credencial |
| P1 | API-D003 | PUT de estado acepta pesos, perfiles, planes y colecciones inválidas; un consumidor acaba en 500 | Corrupción del estado de la cuenta y fallos de disponibilidad |
| P1 | API-D008 | Destinos Push loopback, privados y link-local llegan a un transporte interceptado | Falta de barrera contra SSRF; conectividad/explotación real no probada |
| P1 | PWA-F01–F05 | Recarga/reconexión pierde cambios; indicador pending omitido; errores de cuota sin recuperación; logout fallido reautentica; load tardío restaura datos tras reset | Pérdida de información y límites de privacidad inconsistentes |
| P1 | BUS-F01 | El plan prescribe objetivos diferentes de la regla que lo evalúa | Cumplimiento perfecto contabilizado como fallo o sin progresión |
| P1 | BUS-F06, BUS-F08 | Superseries sin descanso por ronda; autosave admite series/esfuerzo fuera del dominio | Entrenamiento guiado y datos de progreso inconsistentes |
| P1 | UI-F02 | Un guardado tardío borra el RIR que acaba de escribirse | Pérdida silenciosa durante el registro normal |

Los informes de [backend](backend-security.md), [PWA](pwa-infra.md), [negocio](business-data.md) e [interfaz](ui-findings.md) contienen precondiciones, pasos, resultados, frecuencia, causa probable, recomendaciones y evidencia. Todos los defectos están **OPEN**.

## Registro completo de defectos

| ID | Prioridad | Título abreviado | Ficha |
|---|---|---|---|
| API-D001 | P1 | Logout no revoca el token | [Backend](backend-security.md) |
| API-D002 | P1 | Replay de ceremonia WebAuthn | [Backend](backend-security.md) |
| API-D003 | P1 | Reemplazo de estado sin validación profunda | [Backend](backend-security.md) |
| API-D008 | P1 | Destinos Push internos sin barrera al transporte | [Backend](backend-security.md) |
| PWA-F01 | P1 | Base de conflicto sobrescrita al recargar | [PWA](pwa-infra.md) |
| PWA-F02 | P1 | Pending offline no restituido; logout sin aviso | [PWA](pwa-infra.md) |
| PWA-F03 | P1 | Cuota/IndexedDB fallida deja guardado sin recuperación | [PWA](pwa-infra.md) |
| PWA-F04 | P1 | Logout fallido permite reentrada automática | [PWA](pwa-infra.md) |
| PWA-F05 | P1 | Load previo restaura datos tras logout/reset | [PWA](pwa-infra.md) |
| BUS-F01 | P1 | Plan y regla de progresión contradictorios | [Negocio](business-data.md) |
| BUS-F06 | P1 | Descanso de superserie omitido | [Negocio](business-data.md) |
| BUS-F08 | P1 | Series/esfuerzo inválidos persistidos | [Negocio](business-data.md) |
| UI-F02 | P1 | Acuse tardío borra edición RIR | [Interfaz](ui-findings.md#ui-f02) |
| API-D004 | P2 | Cookies/rutas mal codificadas producen 500 | [Backend](backend-security.md) |
| API-D005 | P2 | Fecha imposible aceptada/normalizada | [Backend](backend-security.md) |
| API-D006 | P2 | Concurrencia supera límite de login | [Backend](backend-security.md) |
| API-D007 | P2 | Referencias de ejercicios y series duplicadas admitidas | [Backend](backend-security.md) |
| BUS-F02 | P2 | Tiempo completo contado como fallo de repeticiones | [Negocio](business-data.md) |
| BUS-F03 | P2 | Prioridades descartadas al recortar rutina | [Negocio](business-data.md) |
| BUS-F05 | P2 | Primera carga previa copiada a todas las series | [Negocio](business-data.md) |
| BUS-F09 | P2 | Calorías y macros incoherentes en extremo admitido | [Negocio](business-data.md) |
| BUS-F10 | P2 | Peso antiguo precargado sobre uno reciente | [Negocio](business-data.md) |
| BUS-F11 | P2 | Eje de peso ignora distancia temporal | [Negocio](business-data.md) |
| BUS-F12 | P2 | Barra necesaria anunciada como opcional | [Negocio](business-data.md) |
| PWA-F06 | P2 | Extender timer no extiende Push; alias BUS-F07 | [PWA](pwa-infra.md) |
| PWA-F07 | P2 | Omitir durante programación deja aviso huérfano | [PWA](pwa-infra.md) |
| PWA-F08 | P2 | Navegación 502 contamina shell offline | [PWA](pwa-infra.md) |
| PWA-F09 | P2 | Medios en caché no reciben correcciones | [PWA](pwa-infra.md) |
| PWA-F10 | P2 | Posposición offline pierde programación futura | [PWA](pwa-infra.md) |
| PWA-F11 | P2 | TTL configurado no llega al contenedor | [PWA](pwa-infra.md) |
| UI-F03 | P2 | Resumen ensancha página a 911 px en móvil/tableta | [Interfaz](ui-findings.md#ui-f03) |
| BUS-F04 | P3 | Rutina mínima excede disponibilidad de 30 minutos | [Negocio](business-data.md) |
| UI-F01 | P3 | Ejercicio propio sin opción de imagen | [Interfaz](ui-findings.md#ui-f01) |
| UI-F04 | P3 | Historial genera ancho global vacío | [Interfaz](ui-findings.md#ui-f04) |

No hay P0 demostrado en esta ejecución. Esto no implica que los P1 puedan publicarse sin corregir.

## Flujos y estado por módulo

| Flujo | Precondición y pasos | Resultado observado / punto de fallo |
|---|---|---|
| Crítico: alta y puesta en marcha | Sin cuenta → contraseña → siete pasos → generar → recargar | Alta/configuración funcionan; prescripción y regla de progresión divergen posteriormente |
| Crítico: entrenar y registrar | Plan guardado → empezar → editar campos → completar series → terminar → resumen | Sesión termina y persiste; campos pueden perderse y validaciones/superseries tienen fallos |
| Crítico: privacidad al salir | Cuenta con sesión → logout → recargar/reusar token/terminar request previo | UI bloquea acceso normal; token anterior y determinadas carreras no respetan cierre completo |
| Crítico: trabajo offline | Estado base → editar sin red → otro cambio remoto → recargar → reconectar | Caso simple funciona; base de conflicto se sustituye y se pierde cambio remoto |
| Principal: mediciones y evolución | Perfil → perímetros → guardar → historial/gráficas → recordatorio | Registro funciona; precarga puede usar peso viejo; eje temporal y extremos de macros fallan |
| Principal: planificación | Plan base → elegir sesión → mover fecha → revisar próxima semana | Reprogramación probada conserva base; prioridades/equipo/tiempo de generación no siempre se respetan |
| Secundario: biblioteca y ayudas | Buscar → vacío/resultado → guía → crear ejercicio → seleccionar músculos | Búsqueda/listas/medios de muestra funcionan; personalizados sin media; contenido corregido puede quedar obsoleto en caché |
| Integración: notificar descanso | Serie → programar → ampliar/omitir → vencer | Simulación confirma desacuerdo local/remoto y cancelación incompleta; entrega real bloqueada |
| Operación | Configurar Compose → proxy común → arrancar → TLS/headers/salud | Configuración revisada; TTL no transferido; despliegue real bloqueado por Docker detenido |

| Módulo | Estado | Cobertura disponible | Riesgo |
|---|---|---|---|
| Acceso y API | Parcial | 26/26 rutas alcanzadas; 126 casos ejecutados | Alto: revocación/replay/validación/Push |
| Guía y generación | Parcial | UI completa y matriz de 180 perfiles sintéticos | Alto: progresión contradictoria |
| Plan | Parcial | Reprogramación real y componentes/servicios | Medio: superseries y contrato generado |
| Entrenamiento | Parcial | Flujo de 14 series; validación y carreras | Alto: pérdida de campos y datos inválidos |
| Métricas y gráficas | Parcial | Aritmética, calendario, DOM y capturas | Medio: datos, escala y reflow |
| Biblioteca | Parcial | Tests de activos y muestra visual | Medio: caché; postura completa no certificada |
| Offline y sincronización | No apto para publicación | Dobles controlados sobre stores/SW reales | Alto: pérdida de cambios/privacidad |
| Push y Wake Lock | Parcial / integración bloqueada | Contratos, scheduler y hooks; sin SO real | Alto/medio según escenario |
| Responsive/accesibilidad | Parcial | 24 combinaciones ruta/tamaño y muestra a11y | Medio: desbordamiento; sin certificación AA |
| Infraestructura | Bloqueado en runtime | Configuración y dependencias inspeccionadas | Sin cierre hasta validar proxy/TLS real |

## Pruebas no funcionales, seguridad y límites

La API respondió a 25 lecturas concurrentes del estado pequeño con p50 59,18 ms, p95 97,85 ms y máximo 101,83 ms; todas 200. Veinte altas de peso concurrentes conservaron sus filas. No equivale a carga sostenida, multiinstancia, miles de sesiones, red móvil o disco lento.

`npm audit` no informó vulnerabilidades conocidas en los dos lockfiles en esta ejecución; no constituye certificación de seguridad. Se ejercitaron entradas inválidas, separación entre usuarios, Origin, errores HTTP, firmas/tokens alterados, replay, concurrencia e integridad. Los logs registran requestId sin exponer stack al cliente. El riesgo SSRF se comprobó con transporte interceptado y sin sondear servicios internos.

Bloqueos y pendientes principales:

- Docker/Nginx/TLS efectivos; flags de cookie Secure en HTTPS, headers reales y navegación por proxy.
- Face ID, Touch ID y llaves físicas; Safari/iOS, Firefox y dispositivos reales.
- Suscripción/entrega Web Push, pantalla física encendida, instalación/relanzamiento PWA real y permisos del sistema. No se aceptaron permisos ni se crearon credenciales reales para suplir esos casos.
- Caché HTTP fría, cuota/evicción real de IndexedDB, fallo de disco, recuperación de archivos corruptos y varios procesos con el mismo DATA_DIR.
- Verificación biomecánica de las 341 imágenes para 195 ejercicios; se separa de los checks automáticos de registro y archivos. No hay validación clínica de rutinas o calculadoras.
- Lectores de pantalla, zoom y todos los criterios de accesibilidad; LCP/INP/CLS y carga móvil real.
- Comportamiento AMRAP distintivo de Greyskull, exportación/restauración completa y pipeline CI remoto. No se confundieron campos o botones existentes con funcionalidad completa demostrada.

No se inventaron roles de administrador, pagos, email o recuperación de contraseña. Su ausencia se documenta como límite o mejora, no como un endpoint aprobado. El historial corporal muestra hasta 24 registros por lectura del código; la navegación de historial extenso no quedó verificada y debe entrar en la regresión de datos grandes.

## Plan de corrección propuesto

No se ejecutó este plan. Complejidad relativa: baja, media o alta; no es una estimación de plazo.

| Orden | Prioridad | Alcance | Acción y criterio de aceptación | Responsable / complejidad |
|---|---|---|---|---|
| 0 | P0 | Ninguno confirmado | Si una corrección revela pérdida general o acceso no autorizado, detener publicación y reclasificar | QA + ingeniería |
| 1 | P1 | API-D001/D002 | Revocar sesión y consumir ceremonia en servidor; replay y token anterior rechazados sin bloquear uso válido | Backend / media |
| 2 | P1–P2 | API-D003/D007, BUS-F08 | Esquema profundo compartido, referencias únicas y validación en todas las rutas; migración de datos existentes precedida de backup | Full-stack / alta |
| 3 | P1 | API-D008 | Restringir destino Push y tráfico saliente con validación robusta de URL/resolución; mantener compatibilidad con proveedores válidos | Backend/infra / media |
| 4 | P1 | PWA-F01–F05, UI-F02 | Conservar base original y borradores; invalidar operaciones al cambiar identidad; manejo de cuota/logout; proteger campo activo de acuses antiguos | Frontend / alta |
| 5 | P1–P2 | BUS-F01/F02/F06 | Unificar prescripción/regla y rondas; completar lo prescrito no penaliza; tiempo y superseries tienen semántica propia | Full-stack / alta |
| 6 | P2 | PWA-F06–F10 | Un único deadline local/remoto, cancelación incluso diferida, rearmado tras sync y caché que conserve shell útil/revalide medios | Full-stack / media-alta |
| 7 | P2 | API-D004–D006, PWA-F11 | Manejar codificación y fechas inválidas, limitar intentos concurrentes, transmitir TTL y comprobarlo en contenedor | Backend/infra / media |
| 8 | P2 | BUS-F03/F05/F09–F12 | Corregir prioridades, carga por serie, aritmética, fecha de peso, eje temporal y barra opcional | Frontend / media |
| 9 | P2–P3 | UI-F03/F04, BUS-F04, UI-F01 | Contener anchos, respetar tiempo disponible y decidir flujo de imagen propia; verificar páginas pobladas a320/390/768px | Frontend / media |
| 10 | P4 | QA-I01 | Añadir CI con tests, typecheck, build, validación de medios y artefactos de regresión; pipeline trazable por commit | Calidad / media |
| 11 | P4 | QA-I02 | Medir rendimiento real antes de presupuestar; evaluar carga diferida del catálogo y bundle de602,6kB | Frontend / media |
| 12 | P4 | QA-I03 | Definir estrategia de backup/restauración y recuperación de acceso; probarla con cuentas desechables | Producto/backend / media-alta |
| 13 | P4 | QA-I04 | Proceso de revisión visual por ejercicio, origen/licencia/versionado y criterio claro para medios personalizados | Contenido/frontend / media |

QA-I01–QA-I04 son oportunidades de mejora OPEN, no fallos explotados ni funciones que se hayan declarado implementadas. Se apoyan en los límites de CI, rendimiento, recuperación y revisión de medios documentados arriba.

### Puerta de salida antes de publicar

1. Cerrar los 13 P1 con regresión reproducible y revisar los P2 de integridad, avisos y flujo principal.
2. Rerun de los 48 casos FAIL, los 102 tests existentes y pruebas relacionadas; ningún PASS previo debe perderse.
3. Validar el despliegue real aislado con Nginx/TLS, un autenticador físico y Push/Wake Lock/instalación en dispositivos soportados.
4. Repetir offline/recarga/reconexión/logout con requests lentas, conflicto real y cuota fallida; comprobar que no se pierde ni reaparece información.
5. Rerun responsive con gráficos e historial poblados, lectura de pantalla y zoom. Documentar pendientes aceptados por el responsable, sin cambiar sus estados a PASS.

## Evidencias y reproducción

- [Baseline y entorno](baseline.md), [inventario](inventory.md), [matriz de 256 escenarios](regression-matrix.md).
- Fichas: [backend/seguridad](backend-security.md), [negocio/datos](business-data.md), [PWA/infra](pwa-infra.md), [UI/accesibilidad](ui-findings.md).
- Resultados crudos: [API](backend-cases.json), [negocio](business-cases.json), [PWA](pwa-cases.json), [UI](ui-cases.json), [logs sanitizados](backend-server.ndjson).
- [Captura del desbordamiento móvil](evidence/dashboard-mobile-overflow.png), [campo RIR perdido](evidence/workout-lost-rir.png), [guía de muestra](evidence/guide-bench-desktop.png), [medidas responsive](evidence/responsive-observations.json).
- Harness versionables: `scripts/qa/README.md`. Configuraciones preservadas verificadas con `vitest list`; la relocalización del harness no modifica el producto. `node scripts/qa/consolidate.mjs` valida IDs/estados y regenera matriz, inventario legible y cifras.

La prueba de navegador siguió la guía disponible de control de interfaz: navegador real para interacción, DOM de solo lectura para medidas y datos ficticios en un servidor aislado. No se automatizaron diálogos de seguridad del sistema ni biometría. Las capturas no son mockups.
