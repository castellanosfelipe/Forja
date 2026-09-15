# Auditoría de negocio y consistencia de datos — FORJA

Fecha: 9 de septiembre de 2026. Revisión: `acda8d39f379a8f1c60956b3be14022eeb692770`.

Auditoría adicional de solo lectura sobre producto. Se crearon únicamente un harness de QA en `work/qa-2026-09-09/business/` y estos artefactos. Se utilizaron fixtures sintéticos en memoria; no se accedió ni se modificó ningún archivo de `data/`, ni se crearon cuentas reales, commits o pushes.

## Inventario funcional observado

| Área | Implementación observada | Cobertura de este trabajo |
|---|---|---|
| Alta guiada | 7 pasos; inicio automático mientras falta `completedAt`; apertura manual para editar; reemplazo del plan confirmado en último paso | Lectura del flujo y ejecución de generador con catálogo real |
| Generación de rutina | 2–6 días, tres entornos de equipo, cuatro objetivos, tres experiencias; prioridades, limitaciones, tempo, RPE, volumen por edad | Matriz de 180 combinaciones; contraste plan/reglas de progresión; duración mínima y prioridades |
| Planificación | Días base, series, repeticiones/tiempo, bloques estándar/superserie, cambio de fecha sin alterar el plan base | Resolución de original/destino/semana siguiente; revisión de creación de bloques |
| Sesión guiada | Cargas anteriores, series por lado, registro opcional de RPE/RIR, descanso, cierre con cálculo de progresión | Ejecución de componentes con fixtures y callbacks controlados; comparación con servicio backend |
| Progresión | Epley 1RM, lineal, Greyskull etiquetado como lineal, doble progresión y descarga configurable | Umbral exacto de descarga, idempotencia, fracciones inválidas, conflictos de prescripción |
| Métricas | IMC, grasa por perímetros, masa magra, FFMI, gasto basal/total, objetivo energético, macros | Aritmética femenina independiente, perímetros parciales, coherencia calorías/macros, precarga cronológica |
| Recordatorio | Un mes desde medición, aplazamiento semanal y estado habilitado | Fin de mes, bisiesto, cambio de año y vencimiento exacto |
| Gráficos | Últimas 24 mediciones de peso; mapa de constancia de 365 días; últimas 5 sesiones en mapa muscular con ponderación 2:1 | Escala temporal del peso, límites anual/futuro y ponderación muscular |
| Unidades | Formularios y resultados visibles en kg, cm, segundos, kcal | Los casos usan las unidades mostradas. No se inventa requisito de UI imperial por existir un campo `preferences.units` |

## Ejecución y resultado

Comando reproducible desde la raíz del proyecto:

```powershell
$env:TZ='America/Bogota'
node frontend/node_modules/vitest/vitest.mjs run --config scripts/qa/business/vitest.config.ts
```

La ejecución inicial del harness terminó con exit code 0: 7 grupos y 26 casos registrados. Se añadió después la reproducción controlada BUS-027, que confirma la pérdida de RIR observada en el navegador. El corpus final contiene **27 casos: 12 PASS y 15 FAIL**. El runner se utiliza como registrador: su exit code no implica que el producto apruebe las comprobaciones. El detalle íntegro, con `expected`, `observed` y `evidence`, está en [business-cases.json](business-cases.json). La fecha `auditedAt` de este JSON pertenece al reloj fijo del fixture, no a la hora de ejecución. El harness original se conservó bajo `scripts/qa/business/` con la misma profundidad de importación.

Se corrigieron dos problemas del propio harness antes del resultado final: rutas de importación y el selector de la etiqueta `Peso kg`. No se modificó código de producto. Los números siguientes corresponden a esa ejecución final.

## Hallazgos reproducibles

### BUS-F01 — P1 — El plan generado y el motor de progresión exigen objetivos distintos

Módulo: Configuración/progresión. Severidad: HIGH. Prioridad: P1. Categoría: funcionalidad principal. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: Plantillas fijan series/rangos mientras progressionRule genera otro contrato. Impacto: Una ejecución correcta se convierte en fallo o impide el aumento de carga.

Recomendación: Derivar plan y regla del mismo objeto de prescripción; probar principiantes, intermedios y todos los rangos.

Casos **BUS-002, BUS-003**. Confianza alta.

Reproducción: generar perfil inicial de hipertrofia, principiante, gimnasio completo, 3 días, 60 minutos. El primer ejercicio (`leg-press`) prescribe **2 series de 6–10**. Completar las dos con 10 repeticiones y 50 kg. Resultado: `succeeded=false`, `consecutiveFailures=1` porque la regla exige **3 series**. La repetición de entrenamientos perfectamente cumplidos produce descargas indebidas. En perfil intermedio, prescribe **3 × 6–10**, pero la regla de doble progresión usa **8–12**: completar el máximo mostrado (3 × 10) no permite subir carga.

Esperado: el objetivo utilizado para evaluar una sesión corresponde a las series y rango del plan mostrado. Ubicación: `frontend/src/features/onboarding/routine-generator.ts:129`, `:152`, `:153`; `backend/src/services/progression.service.ts:35` y `:37`.

### BUS-F02 — P2 — Los ejercicios por tiempo acumulan fallos de repeticiones

Módulo: Progresión por tiempo. Severidad: MEDIUM. Prioridad: P2. Categoría: modelo de medición. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: La regla de duración llega al evaluador de repeticiones. Impacto: Acumula estancamientos y descargas no correspondientes al tiempo completado.

Recomendación: Crear evaluación por duración o excluir estos ejercicios de progresión de carga por repeticiones.

Caso **BUS-004**. Confianza alta.

Reproducción: el mismo perfil genera `front-plank` 2 × 30 segundos y le asigna una regla lineal de repeticiones. Completar ambas series por tiempo, con `repetitions=null`. Resultado: el contador de fallos aumenta a 1; después de tres ejecuciones se contabiliza una descarga aunque se haya cumplido el tiempo.

Esperado: cumplir una prescripción por tiempo no debe penalizarse por ausencia de repeticiones. Ubicación: `frontend/src/features/onboarding/routine-generator.ts:93` y `:145`; `backend/src/services/progression.service.ts:30` y `:97`.

### BUS-F03 — P2 — Las prioridades musculares elegidas desaparecen por el límite de ejercicios

Módulo: Personalización. Severidad: MEDIUM. Prioridad: P2. Categoría: generación de rutina. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: Se añaden prioridades y luego se descartan con slice del límite de ejercicios. Impacto: La selección del usuario no cambia el plan de60min probado.

Recomendación: Reservar espacio o redistribuir volumen para las prioridades; mostrar incompatibilidades de tiempo.

Caso **BUS-005**. Confianza alta.

Reproducción: comparar el plan inicial de 60 minutos sin prioridades con el generado eligiendo pecho y brazos. Resultado: los días, ejercicios, series, tempo y bloques son idénticos. Se agregan accesorios al final de una plantilla de 6 ejercicios y acto seguido se recorta otra vez a 6.

Esperado: las prioridades seleccionadas afecten a la rutina o se informe de la limitación antes de guardar. Ubicación: `frontend/src/features/onboarding/routine-generator.ts:102` y `:106`.

### BUS-F04 — P3 — La rutina de 30 minutos supera el tiempo incluso a su mínimo prescrito

Módulo: Agenda. Severidad: LOW. Prioridad: P3. Categoría: estimación de duración. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: La cantidad de ejercicios no valida el tiempo mínimo de series y descansos. Impacto: Un plan anunciado de30min necesita al menos33min24s sin transiciones.

Recomendación: Presupuestar tempo, series, descanso y margen de transición al generar.

Caso **BUS-006**. Confianza alta sobre la aritmética; duración real no medida con personas.

Reproducción: fuerza, intermedio, peso libre, 3 días, 30 minutos. Sumar series × repeticiones mínimas × tempo y descansos entre series, sin calentamiento ni transiciones. Resultado: **2.004 segundos (33 min 24 s) en cada uno de los tres días**.

Esperado: la duración mínima que deriva del propio plan cabe en la disponibilidad seleccionada, o la UI la comunica como estimación incompatible. Ubicación: `frontend/src/features/onboarding/routine-generator.ts:83`, `:129`, `:130`, `:136`, `:137`.

### BUS-F05 — P2 — La precarga copia la primera carga de la sesión anterior a todas las series

Módulo: Autocompletado. Severidad: MEDIUM. Prioridad: P2. Categoría: integridad de historial. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: La primera carga previa se reutiliza para las otras series. Impacto: Se pierde la correspondencia con cargas progresivas o series de bajada.

Recomendación: Relacionar cargas por serie y lado; mantener fallback explícito para series nuevas.

Caso **BUS-007**. Confianza alta.

Reproducción: sesión anterior de press banca con series de 40, 50 y 60 kg. Crear la siguiente sesión con 3 series y precarga habilitada. Resultado: **40, 40, 40 kg**. Las cargas por serie se pierden al autocompletar; sucede también con diferencias entre lados porque solo se toma el primer valor no nulo.

Esperado: usar las cargas de las series/lados correspondientes, con fallback definido si faltan registros. Ubicación: `frontend/src/features/guided-workout/WorkoutPage.tsx:185` y `:189`.

### BUS-F06 — P1 — El entrenamiento guiado omite el descanso de las superseries

Módulo: Superseries. Severidad: HIGH. Prioridad: P1. Categoría: flujo de entrenamiento. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: Las series aplanadas no consumen rounds/restAfterRoundSeconds al cerrar una ronda. Impacto: No aparece el descanso previsto al completar la pareja de ejercicios.

Recomendación: Ejecutar una estructura de rondas con pausa al completar todas sus series; probar orden e idempotencia.

Caso **BUS-013**. Confianza alta.

Reproducción ejecutada en el componente: crear bloque de 2 ejercicios, 2 rondas y **90 segundos entre rondas**; ambos ejercicios tienen `restSeconds=0` como genera FORJA. Completar A1, pasar a B, completar B1. Resultado: ambos registros están completados pero **no aparece descanso de 90 segundos**. El flujo muestra cada ejercicio con todas sus series; se descarta el contexto del bloque al aplanar las prescripciones y solo se consulta el descanso individual (0).

Esperado: respetar `restAfterRoundSeconds` al completar la ronda; la secuencia debe conservar los datos de la superserie. No se supone que el avance automático sea obligatorio: el fallo probado es el descanso omitido. Ubicación: `frontend/src/features/guided-workout/WorkoutPage.tsx:37`, `:46`, `:80`; origen del contrato en `frontend/src/features/onboarding/routine-generator.ts:121` y `frontend/src/features/planning/PlanPage.tsx:158`.

### BUS-F07 — P2 — Ampliar un descanso no aplaza la notificación programada

Módulo: Temporizador. Severidad: MEDIUM. Prioridad: P2. Categoría: integración local/remota. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: La extensión modifica solo el deadline del hook. Impacto: Aviso externo llega antes del tiempo mostrado.

Recomendación: Actualizar o reemplazar el timer remoto con operación versionada. Duplicado de PWA-F06; corregir una vez.

Caso **BUS-014**. Confianza alta para las solicitudes; entrega real Web Push no ejercitada aquí.

Reproducción con el hook real y API simulada: `start(60)`, luego `add(30)` con avisos permitidos. Resultado: el temporizador local muestra **90 segundos**, pero la única llamada remota sigue siendo `scheduleTimer(60)` y no hay cancelación/reprogramación. El servidor puede avisar 30 segundos antes de lo mostrado.

Esperado: el vencimiento remoto coincide con el descanso ampliado. Ubicación: `frontend/src/hooks/useRestTimer.ts:31`.

### BUS-F08 — P1 — Se pueden guardar series y esfuerzo fuera de los límites declarados

Módulo: Registro de series. Severidad: HIGH. Prioridad: P1. Categoría: validación/persistencia. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: El botón no impone todas las reglas HTML y onBlur persiste sin validación. Impacto: Se guardan cargas negativas, repeticiones fraccionarias o esfuerzo fuera de rango.

Recomendación: Validar por campo antes del autosave y en todas las entradas API/estado; bloquear finalización inválida.

Casos **BUS-015, BUS-016**. Confianza alta.

Reproducción en `SetRow`: introducir carga **-10** y repeticiones **1,5**, pulsar Completar. Resultado: el callback recibe la serie como completada, con ambos valores inválidos. Otro caso: introducir **RPE=12** y salir del campo; el callback de autosave recibe 12 aunque Completar luego lo rechace. Los atributos HTML `min/max/step` no protegen estos callbacks porque no se somete un formulario validado.

Esperado: validar antes de persistir o marcar completado; el contrato backend de workouts exige carga no negativa, repeticiones enteras y RPE 1–10. `estimateOneRepMax(100, 1.5)` lanza excepción (BUS-012), de modo que ese dato puede bloquear la finalización posterior. La confirmación HTTP de aceptación de estado completo corresponde a la auditoría backend y no se afirma haberla ejecutado en este trabajo.

Ubicación: `frontend/src/components/workout/SetRow.tsx:45`, `:73`, `:77`, `:78`; contrato de contraste `backend/src/http/routes/workout.routes.ts:138`, `:139`, `:142`.

### BUS-F09 — P2 — Las calorías y los macros pueden contradecirse dentro del rango admitido

Módulo: Calculadoras. Severidad: MEDIUM. Prioridad: P2. Categoría: consistencia aritmética. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: Objetivo energético y macros usan límites independientes. Impacto: Los gramos sugeridos no representan las calorías declaradas en un extremo admitido.

Recomendación: Definir dominio de cálculo válido y resolver asignación de macros coherente; rechazar combinaciones no soportadas.

Caso **BUS-018**. Confianza alta sobre la suma; no es evaluación clínica.

Reproducción de límite admitido por la calculadora: mujer, 100 años, 100 cm, 20 kg, sedentaria, reducir grasa, sin perímetros. Resultado: **167 kcal** de objetivo, pero **44 g proteína + 5 g grasa + 0 g carbohidratos = 221 kcal**; discrepancia de 54 kcal, muy superior al redondeo. La proteína puede consumir todo el presupuesto antes de sumar la grasa, y los carbohidratos simplemente se recortan a cero.

Esperado: una combinación aceptada produce cantidades mutuamente coherentes o un error explicativo. Este caso extremo comprueba integridad aritmética de un rango que la aplicación acepta; no prescribe esos valores a una persona. Ubicación: `frontend/src/features/metrics/calculations.ts:116` a `:123`.

### BUS-F10 — P2 — Métricas precarga un peso antiguo aunque haya un registro reciente

Módulo: Métricas. Severidad: MEDIUM. Prioridad: P2. Categoría: cronología de datos. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: La precarga prefiere latestMetric.weightKg sin comparar fechas con latestWeight. Impacto: Puede reintroducir un peso antiguo como nueva medición.

Recomendación: Elegir el registro de peso cronológicamente más reciente de ambas fuentes.

Caso **BUS-020**. Confianza alta.

Reproducción en `MetricsPage`: guardar medición corporal el 1 de agosto con 80 kg y posteriormente peso en dashboard el 9 de septiembre con 75 kg. Abrir Métricas. Resultado: el campo `Peso kg` muestra **80**, porque siempre prioriza la última entrada de composición sobre el último peso, sin comparar fechas. Guardar sin advertirlo genera una nueva medición con el peso antiguo y puede contaminar la tendencia.

Esperado: precargar el peso cronológicamente más reciente de las fuentes. Ubicación: `frontend/src/features/metrics/MetricsPage.tsx:69` a `:75`.

### BUS-F11 — P2 — La gráfica de peso representa intervalos muy distintos con la misma distancia

Módulo: Gráfica de peso. Severidad: MEDIUM. Prioridad: P2. Categoría: representación de datos. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: Coordenada X depende del índice del registro, no del tiempo transcurrido. Impacto: La pendiente visual confunde intervalos de un día con meses.

Recomendación: Usar escala temporal y mantener accesibilidad de puntos y texto resumen.

Caso **BUS-025**. Confianza alta.

Reproducción renderizada: medidas el **1 de enero**, **2 de enero** y **9 de septiembre**. Resultado SVG: coordenadas x **48, 389, 730**, es decir, 341 unidades entre cada punto, aunque el primer intervalo es de un día y el segundo de unos ocho meses. La gráfica muestra fechas y se presenta como tendencia temporal, por lo que las pendientes inducen una comparación errónea de la velocidad del cambio.

Esperado: una escala temporal acorde a las fechas, o comunicar explícitamente que el eje es el número de medición. Ubicación: `frontend/src/components/charts/WeightChart.tsx:39`.

### BUS-F12 — P2 — La rutina de peso corporal exige la barra anunciada como opcional

Módulo: Equipamiento. Severidad: MEDIUM. Prioridad: P2. Categoría: contrato de configuración. Estado: OPEN.

Precondiciones: fixture sintético y configuración detallados en la reproducción siguiente; catálogo real del commit auditado. Frecuencia: Siempre bajo las condiciones exactas del caso ejecutado, sin inferir frecuencia en usuarios reales.

Causa probable: Bodyweight incluye ejercicios de barra sin preguntar disponibilidad. Impacto: La rutina exige equipamiento anunciado como opcional.

Recomendación: Solicitar barra como opción independiente y sustituir patrones cuando no exista.

Caso **BUS-026**. Confianza alta.

Reproducción: seleccionar Peso corporal en el alta guiada, que describe la barra de dominadas como opcional. El plan de 3 días introduce obligatoriamente **pull-up, chin-up y neutral-grip-pull-up**; no hay control de disponibilidad de barra ni variante generada sin ella.

Esperado: respetar el equipo declarado como opcional, mediante selección explícita o alternativas. Ubicación: `frontend/src/features/onboarding/OnboardingWizard.tsx:221`; plantillas de `frontend/src/features/onboarding/routine-generator.ts:28` a `:30`.

## Límites y casos no ejercitados aquí

BUS-027 reproduce un acuse tardío de guardado de RPE=8 que repone el objeto `set` anterior y borra RIR=2 ya escrito. Se consolida con **UI-F02**, no se cuenta como otro defecto. Causa: `SetRow.tsx:25` rehidrata todos los campos ante cualquier cambio de objeto, aunque el usuario esté editando. Ver pasos, impacto y recomendación completos en [ui-findings.md](ui-findings.md).

- **NOT TESTED:** adecuación clínica de fórmulas, recomendaciones de nutrición, sustituciones por lesiones o rutinas para una persona. Se auditó coherencia de software, no validación profesional sanitaria.
- **NOT TESTED:** fidelidad visual/anatómica completa de las siluetas e imágenes de 195 ejercicios; corresponde al frente visual.
- **NOT TESTED:** entrega real de notificaciones a navegadores/sistemas operativos; BUS-014 comprueba el contrato local/remoto mediante API simulada.
- **NOT TESTED:** comportamiento distintivo de `amrapSetNumber` de Greyskull. La lectura muestra que el motor comparte el camino lineal y no consume ese campo; no se clasificó automáticamente como defecto sin un criterio funcional explícito adicional.
- **NOT APPLICABLE:** conversión imperial visible: la UI auditada solo ofrece kg/cm. No se añadió un requisito por la mera presencia del campo de preferencia en el esquema.
- **PASS acotados:** BUS-021 prueba traslado individual y conservación del plan base; BUS-022 exactamente 365 días sin pasado fuera de ventana/futuro; BUS-023 fin de mes bisiesto y vencimiento; BUS-024 ponderación muscular 2:1. No implican cobertura total de todos los gráficos o calendarios.

No se corrigieron los hallazgos en esta auditoría. Prioridad de resolución propuesta: alinear prescripción y progresión (BUS-F01/F02), evitar persistencia de series inválidas (BUS-F08), ejecutar el descanso real de superseries (BUS-F06), corregir peso reciente y temporizador remoto (BUS-F10/F07), después las restantes inconsistencias.
