# Cierre de correcciones de negocio

Verificación final del área: 15 de septiembre de 2026. Evidencia histórica del 9 de septiembre conservada sin modificaciones. Todas las comprobaciones usan datos ficticios; no se modificaron cuentas ni archivos de datos reales.

## Resultado

Los 28 casos del arnés de negocio pasan, sin fallos. Incluyen 900 combinaciones de días, equipamiento, objetivo, experiencia y duración con el catálogo completo. La batería específica de interfaz de negocio pasa sus 32 pruebas en 7 archivos; el motor de progresión pasa 11 pruebas. El chequeo de tipos de frontend y backend pasa.

La validación global del repositorio, la comprobación visual en navegador y el despliegue se consolidan por separado. Este informe no constituye autorización de publicación ni certificación médica de las rutinas o calculadoras.

## Hallazgos cerrados

| Hallazgo | Corrección y evidencia |
| --- | --- |
| BUS-F01 | La regla generada coincide con su prescripción. Cada sesión nueva conserva series, rango, tiempo y bloque al iniciarse; el motor evalúa esa copia aunque se edite después el plan. BUS-002, BUS-003 y BUS-028; pruebas del motor. |
| BUS-F02 | No se generan reglas de repeticiones para movimientos por tiempo. Las reglas antiguas no provocan descargas por ausencia de repeticiones en ejercicios cronometrados. BUS-004 y prueba de ejercicio cronometrado. |
| BUS-F03 | Las prioridades se incorporan antes del recorte por cantidad y presupuesto temporal. BUS-005 y matriz de generación. |
| BUS-F04 | El ajuste usa duración estimada de trabajo, ambos lados, descansos, preparación y calentamiento. Se reduce volumen y luego ejercicios cuando corresponde. BUS-006 y las 900 combinaciones de BUS-028. La duración real depende del usuario. |
| BUS-F05 | La carga anterior se busca por número de serie y lado, con respaldo explícito si no existe esa combinación. BUS-012 y pruebas de inicialización. |
| BUS-F06 | Se alternan los integrantes de la superserie y sólo empieza el descanso cuando termina la ronda completa, incluidos ambos lados. BUS-013 y pruebas de flujo nuevo y heredado. |
| BUS-F07 | Ampliar el descanso actualiza también la programación remota. BUS-014 vuelve a pasar; implementación y validaciones adicionales a cargo del área PWA. |
| BUS-F08 / UI-F02 | Validación previa tanto al guardado al salir del campo como a completar la serie. La confirmación tardía de un campo no borra otro borrador que se esté escribiendo. BUS-015, BUS-016 y BUS-027; pruebas de SetRow. |
| BUS-F09 | Se rechazan combinaciones cuyo presupuesto energético no permite una distribución coherente. Los valores admitidos mantienen concordancia entre calorías y macronutrientes, dentro del redondeo. BUS-017 a BUS-019. |
| BUS-F10 | El formulario de métricas elige el peso más reciente entre los registros de peso y composición por fecha, no por origen. BUS-020. |
| BUS-F11 | La coordenada horizontal de la gráfica representa tiempo transcurrido. BUS-025 comprueba intervalos de 1 día frente a varios meses. |
| BUS-F12 | La elección de entrenamiento de peso corporal declara expresamente barra de dominadas y apoyos necesarios; no se presenta como modalidad sin equipamiento. BUS-026. |

## Compatibilidad de sesiones antiguas

- Para sesiones sin copia de la prescripción se recupera el contexto disponible del día del plan; se conserva el número de rondas realmente registrado, aunque el plan actual indique otro volumen.
- La interfaz recupera la agrupación de superserie y sus descansos sin modificar el plan ni sus series guardadas. Si el día ya no existe, el flujo mantiene el descanso general y no falla al acceder a campos ausentes.
- Al completar una sesión heredada, el servidor sólo adopta un objetivo recuperable y válido. Conserva las rondas registradas y mantiene la idempotencia al intentar completar de nuevo.
- Una sesión que ya contiene copia de su prescripción nunca la reemplaza con una edición posterior del plan.
- Límite histórico: una versión anterior que no guardaba la prescripción no permite reconstruir objetivos que el usuario ya eliminó o modificó. El respaldo usa el plan actualmente disponible y, si no hay objetivo válido, la regla existente. Las sesiones nuevas no presentan esta ambigüedad.

## Comandos comprobados

Desde `frontend`:

```powershell
npm run typecheck
npm test -- --reporter=dot src/test/workout.test.ts src/test/set-row.test.tsx src/test/routine-generator.test.ts src/test/onboarding-flow.test.tsx src/test/metrics-page.test.tsx src/test/metrics.test.ts src/test/charts.test.tsx
```

Resultado específico: **7 archivos, 32 pruebas, 0 fallos**.

Desde `backend`:

```powershell
npm run typecheck
npm test -- --reporter=dot tests/progression.test.ts
```

Resultado específico: **1 archivo, 11 pruebas, 0 fallos**.

Desde la raíz:

```powershell
$env:QA_OUTPUT_DIR='docs/qa/2026-09-14'
node frontend/node_modules/vitest/vitest.mjs run --config scripts/qa/business/vitest.config.ts --reporter=dot
```

Resultado: **9 pruebas agrupadoras, 28 casos registrados, 28 PASS, 0 FAIL**. Evidencia: `business-cases.json`, ejecución registrada el 15 de septiembre a las 03:23:52 UTC. El arnés verifica explícitamente que no queden casos FAIL; no basta con que termine el proceso.

La advertencia del cargador de configuración de Vite para una futura versión mayor no afecta esta ejecución. No se hicieron commit ni push.
