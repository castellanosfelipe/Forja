# Interfaz, flujos reales y accesibilidad

Fecha: 2026-09-09. Base: `acda8d3`. Navegador Chromium integrado, build de producción, origen `http://localhost:5180`. Backend real con `DATA_DIR` exclusivo de auditoría; no es el despliegue Docker/Nginx. Los perfiles, medidas y entrenamientos son ficticios.

Se ejecutó registro → guía inicial → rutina → métricas → biblioteca → entrenamiento de 14 series → reprogramación → perfil → logout → nuevo login. La API/archivos de QA confirmaron una sesión completada, 3 días base, 1 cambio puntual, 196 ejercicios (195 base + 1 prueba), 1 medición y revisión 27. No se modificó código del producto.

La matriz [ui-cases.json](ui-cases.json) delimita cada PASS. Los 24 casos responsive verifican renderizado y ancho del documento, no certifican todos los píxeles ni todos los estados de esas páginas. Capturas clave en [evidence](evidence/).

## UI-F01

Título: Los ejercicios personalizados no pueden tener demostración visual desde el formulario.

Módulo: biblioteca. Severidad: LOW. Prioridad: P3. Categoría: cobertura funcional/contenido. Estado: OPEN.

Descripción: el catálogo base tiene medios, pero crear un ejercicio propio no ofrece adjuntar o vincular una imagen. La guía lo reconoce explícitamente; no se muestra una animación incorrecta como sustituto. No cumple el alcance original de imagen para todos los ejercicios.

Precondiciones: cuenta autenticada; biblioteca cargada.

Pasos:

1. Nuevo ejercicio; nombre `QA Press personalizado`, categoría Pecho, equipamiento mancuernas/banco.
2. Principal Pectoral mayor; secundario Tríceps; guardar.
3. Buscarlo y abrir la guía.

Esperado: demostración específica o un flujo para agregar una imagen propia con validaciones.

Obtenido: “Sin demostración verificada”; no existe entrada de medios en el formulario.

Frecuencia: Siempre en la ruta de creación inspeccionada; una creación ejecutada. Impacto: el ejercicio se puede registrar, pero no dispone de la orientación visual solicitada.

Evidencia: UI-017/018; `frontend/src/features/exercises/LibraryPage.tsx`; componente de medios/guía. Causa probable: el registro de medios corresponde al catálogo fijo, no al esquema de creación personalizado.

Recomendación: incorporar imagen validada y guía editable para ejercicios propios, o definir explícitamente la limitación de alcance. No asignar una demostración de otro movimiento por similitud del nombre.

## UI-F02

Título: El autoguardado de una serie borra el campo que se está editando.

Módulo: entrenamiento guiado. Severidad: HIGH. Prioridad: P1. Categoría: pérdida de datos/carrera de actualizaciones. Estado: OPEN.

Descripción: al cambiar de campo se guarda la fila; una respuesta o actualización posterior repone todos los valores del objeto anterior, incluyendo el campo nuevo aún no guardado.

Precondiciones: sesión activa, preferencias de RPE y RIR activadas, dos campos editables; guardado anterior pendiente.

Pasos:

1. En Hip thrust en máquina, serie 2, escribir esfuerzo RPE `8`.
2. Pasar a RIR y escribir `2` mientras se guarda el campo anterior.
3. Esperar la actualización anterior sin borrar ni cambiar RIR.

Esperado: mantener RPE=8 y RIR=2, y guardar los dos al completar.

Obtenido: RIR=2 aparece inicialmente, luego vuelve a vacío; RPE=8 permanece. En otra fila, una secuencia carga→RPE→RIR dejó ambos campos opcionales vacíos.

Frecuencia: Intermitente, dependiente del orden de acuses; 2 secuencias observadas y reproducción determinista del mismo orden en BUS-027. Impacto: pérdida silenciosa de esfuerzo/reserva; potencialmente otros campos de la misma fila.

Evidencia: UI-021, BUS-027, [captura de la serie](evidence/workout-lost-rir.png). Causa probable: `frontend/src/components/workout/SetRow.tsx:25` rehidrata todos los estados locales con cada cambio de referencia `set`; los `onBlur` de las líneas 73–79 guardan snapshots completos.

Recomendación: conservar un borrador de fila con campos modificados y versionado, fusionar acuses sin sobrescribir edición más reciente y serializar guardados. Añadir regresión con respuesta diferida y tabulación rápida. No basta con retrasar artificialmente el foco.

## UI-F03

Título: El resumen se ensancha hasta 911 px en pantallas de 390 y 768 px.

Módulo: resumen/gráficas. Severidad: MEDIUM. Prioridad: P2. Categoría: responsive/usabilidad/accesibilidad. Estado: OPEN.

Descripción: la rejilla móvil conserva el ancho mínimo intrínseco del mapa anual y ensancha las otras tarjetas; texto, botón de peso y gráfica quedan fuera de pantalla.

Precondiciones: usuario configurado con peso; resumen autenticado.

Pasos:

1. Abrir `/` con viewport 390×844 o 768×1024.
2. Desplazarse verticalmente hasta Tendencia de peso.
3. Comparar el ancho de la ventana con `document.documentElement.scrollWidth`.

Esperado: tarjetas y texto ajustados a pantalla; desplazamiento horizontal, si hace falta, limitado a la gráfica o mapa anual.

Obtenido: documento 911 px en ambas medidas; tarjeta de peso 895 px y contenido interior 849 px. El encabezado de esa tarjeta no se adapta; existe scroll horizontal de toda la página.

Frecuencia: Siempre en las dos medidas repetidas con el fixture. Impacto: lectura y acciones fuera de pantalla en el resumen principal.

Evidencia: UI-R13/UI-R19, [medidas](evidence/responsive-observations.json), [captura del recorte](evidence/dashboard-mobile-overflow.png). Causa probable: `frontend/src/styles.css:383` usa columna `1fr` con mínimo automático; `.heat-card` no limita ese mínimo y `.heatmap` exige 50rem (`:149`, `:186`).

Recomendación: aislar anchos intrínsecos con `minmax(0, 1fr)`/mínimos de tarjetas apropiados y mantener el scroll dentro de cada gráfico; comprobar también 320 px y zoom. No ocultar el problema recortando todo el documento.

La excepción de reflow para tablas/diagramas no exime al texto y controles adyacentes de ajustarse. Esta observación justifica una corrección y una reevaluación de [WCAG 2.2, 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html); no se declara certificación ni prueba completa de 400% de zoom.

## UI-F04

Título: El historial introduce desplazamiento global vacío fuera de su contenedor.

Módulo: métricas. Severidad: LOW. Prioridad: P3. Categoría: responsive/contención CSS. Estado: OPEN.

Descripción: la tabla tiene correctamente su propio scroll, pero el documento también se extiende hasta 775 px. Un elemento de accesibilidad absoluto se sitúa al extremo de la tabla fuera de la anchura móvil.

Precondiciones: al menos una medición guardada; viewport 390×844 o 768×1024.

Pasos:

1. Abrir `/metrics` y llegar a Historial corporal.
2. Comprobar el scroll interno de tabla y el ancho global.
3. Inspeccionar geometría de `.sr-only` del encabezado Acciones.

Esperado: ancho del documento no mayor que la ventana; solo la tabla necesita desplazamiento lateral.

Obtenido: documento 775 px; tabla 800 px dentro del contenedor; elemento `.sr-only` absoluto termina en x=775 y no tiene contenedor de posición local. A diferencia de UI-F03, las tarjetas principales sí ajustan su texto.

Frecuencia: Siempre en las dos medidas observadas con un registro. Impacto: desplazamiento lateral innecesario y espacio vacío; la tabla sigue utilizable.

Evidencia: UI-R14/UI-R20; [captura](evidence/metrics-mobile-overflow.png); `frontend/src/styles.css:258–259`; `frontend/src/features/metrics/MetricsPage.tsx`, encabezado de acciones.

Causa probable: texto oculto con posición absoluta y coordenada estática fuera del viewport sin bloque de contención apropiado.

Recomendación: corregir contención del texto para lector de pantalla sin retirarlo de accesibilidad; añadir prueba de ancho global con tabla poblada.

## Accesibilidad: resultados y límites

En la muestra funcionaron el foco inicial contextual, Escape para cerrar diálogos y ayudas, los nombres de campos en el DOM y la exclusión de un músculo ya principal del selector secundario. El árbol simplificado de una herramienta omitió nombres del desplegable nativo; el DOM accesible sí los contenía, por lo que no se clasificó como defecto.

88 textos con fondos planos de Métricas cumplieron el ratio aplicable en la medición de colores computados; se excluyeron transparencias/gradientes, SVG y estados interactivos no medidos. Criterio de referencia: [WCAG 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Ver [datos de contraste](evidence/contrast-metrics.json). No equivale a conformidad integral AA. Quedan lectores de pantalla, zoom, contraste no textual, teclado exhaustivo y comprobación de [foco no oculto](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

Las capturas usan datos ficticios y se toman por viewport. Se descartó una captura de página completa que tenía duplicaciones de composición de la herramienta, no de la aplicación. Las medidas responsive no dependen de esa captura.
