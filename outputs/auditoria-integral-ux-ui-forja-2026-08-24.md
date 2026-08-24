# Auditoría integral UX/UI y correcciones — FORJA

Fecha: 24 de agosto de 2026

Producto: PWA autoalojada para entrenamiento, peso y composición corporal

Identidad: **FORJA — Entrena. Registra. Evoluciona.**

## 1. Resumen ejecutivo

FORJA tiene una identidad visual diferenciada, una arquitectura de información entendible y una propuesta de privacidad coherente con el producto: mismo origen, archivos JSON autoalojados y acceso mediante contraseña o Passkey. El onboarding, la planificación semanal, las métricas corporales, la biblioteca y el entrenamiento guiado forman un recorrido de producto completo.

La auditoría inicial de esta iteración encontró cinco riesgos críticos que no eran principalmente estéticos: pérdida de actualizaciones rápidas, conflictos falsos entre revisiones, descarte silencioso de cambios locales, reprogramaciones que no afectaban el entrenamiento efectivo y sesiones incompletas capaces de contabilizarse como fallos de progresión. También se identificaron problemas de foco modal, navegación tablet/móvil, semántica de gráficos, formularios del entrenamiento, feedback asíncrono y rendimiento de la biblioteca.

Los problemas corregibles quedaron resueltos directamente y cubiertos con pruebas. La segunda auditoría no encontró bloqueos críticos conocidos en las rutas disponibles. FORJA queda en un nivel de madurez **intermedio–avanzado y candidato a producción controlada**, no todavía en estado de certificación pública: siguen pendientes la sustitución de las guías genéricas por medios exactos y validados para cada ejercicio, la ejecución real de superseries, la evolución del almacenamiento monolítico y la validación manual con tecnologías de asistencia y dispositivos reales.

Puntuación global estimada: **6,8 → 8,2/10**.

> Esta puntuación es una evaluación experta del producto y del código; no sustituye investigación con usuarios, una auditoría WCAG formal ni pruebas clínicas/deportivas.

## 2. Alcance, método y evidencia

Se revisaron los flujos y componentes disponibles de:

- Acceso con usuario/contraseña y Passkey.
- Primer inicio, onboarding y regeneración de rutina.
- Resumen, peso, tendencia, constancia y mapa muscular.
- Métricas, perímetros, composición corporal y recordatorio mensual.
- Plan base, adición de ejercicios y reprogramación por fecha.
- Biblioteca de 195 ejercicios y creación de ejercicios personalizados.
- Entrenamiento guiado, series, RPE/RIR, descanso, Wake Lock y progresión.
- Perfil, Passkeys, Web Push, PWA, preferencias, cierre de sesión y sincronización.
- Estados offline, conflictos, error fatal, vacío, carga y 404.
- Proxy Nginx, límites de carga, builds y salud Docker.

Método aplicado:

- Las 10 heurísticas de Nielsen.
- Criterios relevantes de WCAG 2.2 AA: estructura, nombres accesibles, teclado, foco, modales, errores, targets, movimiento y contraste de tokens principales.
- Inspección de React/TypeScript, estado Zustand, API Node, CSS responsive y persistencia offline.
- Recorrido visual en navegador de acceso y rutas autenticadas a 1280 × 720 px.
- Escaneo semántico de siete rutas: un H1 por vista, controles con nombre, acciones iconográficas etiquetadas, IDs únicos y ausencia de overflow horizontal en el viewport revisado.
- Pruebas unitarias/de componentes, typecheck, builds de producción, reconstrucción Docker y health checks.

Limitaciones de evidencia:

- Esta segunda pasada no dispuso de un viewport móvil real controlable; mobile/tablet se verificó mediante CSS, estructura, pruebas de componentes y revisión de breakpoints. Debe repetirse en dispositivos físicos.
- No se ejecutó una auditoría humana completa con NVDA, VoiceOver o TalkBack.
- Passkeys, Push y Wake Lock necesitan hardware, permisos, HTTPS/origen final y pruebas de ciclo de vida del sistema operativo.
- No se declara conformidad WCAG 2.2 AA completa sin esa evidencia manual.

## 3. Estado del producto

### Fortalezas conservadas

- Identidad editorial reconocible y consistente con el concepto de “forjar” progreso.
- Propuesta de privacidad clara y opción de crear cuenta sin Passkey.
- Arquitectura principal corta: Resumen, Métricas, Plan, Ejercicios y Entrenar; el perfil se abre desde la identidad del usuario.
- Onboarding solo en el primer inicio, con acceso posterior desde el engranaje.
- Diferenciación comprensible entre plan base y reprogramación puntual.
- Buen uso de APIs web nativas: Service Worker, Wake Lock, Web Push y WebAuthn.
- Formularios de métricas con contexto, fórmulas y advertencia de que son estimaciones.
- Lenguaje visual y copy coherentes en acceso, cards, estados y entrenamiento.

### Riesgos principales restantes

- Las ilustraciones actuales son guías orientativas por familia de movimiento, no demostraciones exactas verificadas de los 195 ejercicios.
- Las superseries aparecen en el plan, pero el modo guiado todavía presenta ejercicios secuenciales y no alterna rondas/descansos como una superserie real.
- El estado completo del usuario se sincroniza como un único documento; el aumento a 10 MiB aplaza, pero no elimina, el límite de crecimiento.
- No existe aún un flujo permanente de exportación/importación completa, cambio de contraseña, recuperación o eliminación de cuenta.
- El CSS tiene tokens base, pero conserva 168 colores hexadecimales únicos fuera de una capa semántica completa.

## 4. Flujos críticos

| Flujo | Objetivo | Resultado después de corregir | Riesgo pendiente |
| --- | --- | --- | --- |
| Crear cuenta / entrar | Acceder sin obligar a tener Passkey | Contraseña y Passkey son opciones explícitas; errores quedan asociados a campos y el estado busy evita dobles envíos. | Probar WebAuthn y recuperación en dispositivos reales. |
| Primer inicio | Recoger datos y generar una rutina | Se ejecuta una vez, es modal accesible y puede relanzarse desde el engranaje. | Validación deportiva humana de reglas y contraindicaciones. |
| Registrar métricas | Guardar peso/perímetros y ver evolución | Feedback asíncrono, validación y borrado coherente del peso asociado. | Exportación/importación completa. |
| Reprogramar un día | Cambiar una fecha sin alterar el plan base | La excepción se aplica realmente en Resumen y Entrenar, se alinea al día elegido y evita duplicados. | Visualización de calendario mensual sería una mejora futura, no un bloqueo. |
| Entrenar | Completar series con carga previa, descanso y esfuerzo | Validación por serie, preferencias RPE/RIR, carga previa, Wake Lock robusto y cierre solo al completar todo. | Alternancia real de superseries. |
| Sincronizar/offline | No perder progreso por red o concurrencia | Cola serial, caché por usuario, rebase a tres vías, exportación de emergencia y descarte explícito. | API incremental y pruebas prolongadas multi-dispositivo. |
| Consultar un ejercicio | Encontrar y entender un movimiento | Búsqueda/categorías, render progresivo y guía declarada como orientativa. | Medios exactos licenciados y revisión técnica por ejercicio. |

## 5. Hallazgos priorizados

| ID | Área | Hallazgo | Severidad | Impacto | Recomendación | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| F-01 | Estado local | Varias actualizaciones rápidas podían clonar el mismo estado anterior y sobrescribirse. | 🔴 Critical | Pérdida silenciosa de series, métricas o preferencias. | Serializar mutaciones y actualizar memoria antes de persistir. | ✅ Corregido |
| F-02 | Sincronización | Un cambio exclusivo del servidor, como una suscripción Push, podía causar un 409 o mezclarse mal con cambios locales. | 🔴 Critical | Conflictos falsos y riesgo de pérdida de datos. | Rebase a tres vías con base, pendiente local y servidor; preservar campos gobernados por servidor. | ✅ Corregido |
| F-03 | Protección de datos | `refresh`, cierre de sesión o resolución de conflicto podían descartar cambios pendientes sin una decisión explícita. | 🔴 Critical | Pérdida irreversible del progreso local. | Bloquear refresh destructivo, intentar sincronizar, confirmar descarte y ofrecer JSON local. | ✅ Corregido |
| F-04 | Planificación | Las reprogramaciones se guardaban, pero Resumen y Entrenar seguían usando el día base. | 🔴 Critical | El usuario podía iniciar la rutina equivocada. | Calcular el plan efectivo por fecha, retirar el día original y deduplicar excepciones. | ✅ Corregido |
| F-05 | Progresión | Una sesión con series vacías podía cerrarse y contarse como fallo, incluso activar una descarga. | 🔴 Critical | Progresión incorrecta y pérdida de confianza. | Bloquear en UI y backend cualquier sesión sin ejercicios o con series incompletas. | ✅ Corregido |
| F-06 | Web Push | Activar Push implicaba refrescar estado y podía competir con cambios locales aún pendientes. | 🟠 High | Pérdida de preferencias o registros recientes. | Hacer `flush`, abortar si sigue pendiente y usar refresh protegido. | ✅ Corregido |
| F-07 | Offline | Una recarga sin red perdía la identidad autenticada y no podía abrir la caché por usuario. | 🟠 High | La PWA dejaba de ser utilizable offline tras recargar. | Conservar solo la última identidad verificada y usarla exclusivamente cuando el navegador está offline. | ✅ Corregido |
| F-08 | Recuperación | Un fallo de carga inicial podía dejar el `Outlet` vacío. | 🟠 High | Pantalla sin salida ni explicación. | Estado fatal accionable con mensaje y “Intentar de nuevo”. | ✅ Corregido |
| F-09 | Modales | Los diálogos no aislaban consistentemente el fondo, foco, scroll ni retorno al disparador. | 🟠 High | Riesgo WCAG y acciones fuera de contexto. | Primitiva Modal compartida con portal, `inert`, trampa de foco, Escape y restauración. | ✅ Corregido |
| F-10 | Responsive tablet | Entre 821 y 1100 px se mantenía una composición de escritorio demasiado estrecha. | 🟠 High | Contenido comprimido y controles incómodos. | Activar experiencia compacta hasta 1100 px y transformar paneles laterales en flujo vertical. | ✅ Corregido |
| F-11 | Navegación móvil | Los destinos no estaban todos disponibles de forma estable en la navegación compacta. | 🟠 High | Descubribilidad incompleta, incluido Perfil. | Rejilla inferior de seis destinos con safe areas y targets de 56 px. | ✅ Corregido |
| F-12 | Series | Nombres repetidos, validación débil y columnas fijas de RPE/RIR generaban ambigüedad y desalineación. | 🟠 High | Errores de captura y mala lectura por asistencia. | IDs únicos por serie/lado, rangos RPE 1–10 y RIR 0–10, foco en error y rejilla condicional. | ✅ Corregido |
| F-13 | Wake Lock | Una promesa tardía o un sentinel liberado podía dejar estado obsoleto y evitar la readquisición. | 🟠 High | Pantalla apagada durante una sesión. | Capturar sentinel solicitado, limpiar al liberar y readquirir al recuperar visibilidad. | ✅ Corregido |
| F-14 | Entrenamiento | La preferencia de carga anterior no se respetaba completamente y un ejercicio unilateral iniciaba descanso tras un solo lado. | 🟠 High | Más pasos y descanso prematuro. | Prefill según preferencia e iniciar descanso solo al completar ambos lados. | ✅ Corregido |
| F-15 | Feedback asíncrono | Plan, peso, métricas, biblioteca y perfil permitían acciones duplicadas o fallos silenciosos. | 🟠 High | Incertidumbre, duplicados y abandono. | Estados busy/disabled, mensajes error/success y valores conservados. | ✅ Corregido |
| F-16 | Métricas | Borrar una medición corporal podía dejar el peso generado automáticamente como registro huérfano. | 🟠 High | Gráficos y tendencias inconsistentes. | Vincular y eliminar la entrada exacta mediante fecha, peso y nota de origen. | ✅ Corregido |
| F-17 | Constancia | El heatmap mezclaba celdas de alineación con días y podía representar 371 posiciones como actividad anual. | 🟠 High | Métrica anual y lectura accesible incorrectas. | Exactamente 365 días reales, padding nulo separado, resumen accesible y desplazamiento a lo reciente. | ✅ Corregido |
| F-18 | Peso | Controles dentro del SVG y semántica insuficiente dificultaban teclado y lector de pantalla. | 🟠 High | Gráfico no operable de forma equivalente. | SVG decorativo, resumen textual y lista visible de botones HTML por medición. | ✅ Corregido |
| F-19 | Biblioteca | Montar animación en las 195 tarjetas elevaba trabajo inicial y distracción visual. | 🟠 High | Peor rendimiento percibido y fatiga por movimiento. | Render progresivo de 24, preview estático y pausa fuera del viewport. | ✅ Corregido |
| F-20 | Guías | Las animaciones genéricas se interpretaban como demostraciones exactas y varias no correspondían al ejercicio. | 🟠 High | Riesgo de técnica equivocada. | Declararlas “guía orientativa”, ofrecer pausa y no afirmar exactitud. Sustituir por medio validado por ejercicio. | 🟨 Mitigado; contenido pendiente |
| F-21 | Superseries | El plan modela superseries, pero el entrenamiento guiado no alterna sus ejercicios por ronda. | 🟠 High | El entrenamiento ejecutado difiere del prescrito. | Definir skip, ronda parcial y descansos; preservar estructura de bloques en la sesión. | ⏳ Pendiente estratégico |
| F-22 | Persistencia | Todo el historial viaja en un único `PUT`; 1 MiB era insuficiente y el crecimiento sigue siendo monolítico. | 🟠 High | Futuro fallo de sincronización y payload creciente. | Límite coherente de 10 MiB como contención; migrar a endpoints incrementales/paginados. | 🟨 Mitigado; arquitectura pendiente |
| F-23 | Portabilidad | Solo existe exportación de emergencia en conflicto; faltan export/import general, cambio de contraseña y eliminación de cuenta. | 🟠 High | Privacidad incompleta y recuperación operativa limitada. | Diseñar ciclo de vida de cuenta y backup firmado/validado. | ⏳ Pendiente de producto |
| F-24 | Plan | Errores, fechas incompatibles, reprogramaciones duplicadas y descansos como “90 s” generaban fricción. | 🟡 Medium | Plan ambiguo o difícil de recuperar. | Validar, alinear próximo día, enfocar formulario y mostrar “1 min 30 s”. | ✅ Corregido |
| F-25 | Plan visual | RPE podía separarse del valor y acercarse al botón eliminar en tarjetas estrechas. | 🟡 Medium | Lectura ambigua y riesgo táctil. | Agrupar “RPE 7” con `nowrap` y reservar 3,75 rem para eliminar. | ✅ Corregido y reverificado |
| F-26 | Abreviaturas | Tooltips de RPE/RIR/PWA/PIN no cubrían de forma robusta hover, foco, Escape y contenido interactivo. | 🟡 Medium | Siglas poco comprensibles y navegación inconsistente. | Botón semántico, tooltip portal hoverable, cierre diferido, Escape y foco conservado. | ✅ Corregido |
| F-27 | Acceso | Errores no estaban asociados a todos los inputs y el lema con saltos podía anunciarse sin pausas. | 🟡 Medium | Menor claridad para lectores de pantalla. | `aria-describedby`, `aria-errormessage` y nombre accesible “Entrena. Registra. Evoluciona.” | ✅ Corregido |
| F-28 | Navegación | Título de documento y foco no comunicaban cada cambio; la 404 se titulaba “Resumen”. | 🟡 Medium | Contexto incorrecto en historial y asistencia. | Títulos por ruta, foco al H1 y fallback “Página no encontrada”. | ✅ Corregido |
| F-29 | Temporizador | El arco inicial podía usar un denominador incorrecto y cambiar duración sin actualizar el total. | 🟡 Medium | Progreso visual engañoso. | Conservar duración total coherente y recalcular tras ±15 s. | ✅ Corregido |
| F-30 | Perfil | Errores podían aparecer con tratamiento de éxito y el logout no explicaba datos pendientes. | 🟡 Medium | Feedback contradictorio y riesgo de descarte. | Feedback tipado y confirmación contextual para offline/conflicto. | ✅ Corregido |
| F-31 | Datos | Onboarding permitía 14 años, mientras Métricas exigía 18. | 🟡 Medium | Perfil aceptado que luego no podía editarse. | Unificar mínimo en 18 años. | ✅ Corregido |
| F-32 | Design system | Hay tokens principales, pero 218 usos y 168 valores hexadecimales únicos permanecen en CSS. | 🟡 Medium | Variantes, contraste y mantenimiento propensos a divergir. | Migrar gradualmente a tokens semánticos y variantes de componentes. | ⏳ Pendiente estratégico |
| F-33 | Validación | No hay evidencia humana completa con lectores de pantalla ni matriz móvil/WebAuthn/Push/Wake Lock. | 🟠 High | No puede afirmarse conformidad WCAG o compatibilidad real. | Ejecutar protocolo manual en plataformas objetivo antes de lanzamiento público. | ⏳ Pendiente de validación |

## 6. Evaluación con las 10 heurísticas de Nielsen

| Heurística | Evaluación final |
| --- | --- |
| 1. Visibilidad del estado | Buena: sincronización, busy, progreso, Wake Lock, descanso, éxito, error y estados vacíos son visibles. |
| 2. Relación con el mundo real | Buena: días, descansos, carga, esfuerzo y objetivos usan lenguaje de gimnasio; siglas tienen explicación. |
| 3. Control y libertad | Mejorada: confirmaciones, cancelación, exportación de emergencia y reprogramación reversible. |
| 4. Consistencia y estándares | Buena con deuda media: patrones compartidos sólidos, pero falta completar la tokenización del CSS. |
| 5. Prevención de errores | Alta: rangos, duplicados, conflictos, series incompletas, fechas y descartes se protegen. |
| 6. Reconocimiento antes que recuerdo | Buena: carga anterior, propuestas, categorías, instrucciones y ayudas contextuales. |
| 7. Flexibilidad y eficiencia | Buena: búsqueda, filtros, plan base + excepción, contraseña/Passkey y preferencias. Superseries limitan el modo guiado. |
| 8. Diseño estético y minimalista | Fortaleza: jerarquía editorial, paleta sobria y densidad adecuada en desktop. |
| 9. Ayuda para reconocer y recuperarse de errores | Mejorada: mensajes accionables, valores conservados, reintento y conflicto explícito. |
| 10. Ayuda y documentación | Suficiente en contexto; faltan documentación operativa, recuperación y medios exactos por ejercicio. |

## 7. Accesibilidad WCAG 2.2 AA

Mejoras verificadas en código/pruebas:

- Foco visible global y retorno de foco en modales.
- Trampa de foco, fondo `inert`, Escape y bloqueo de scroll.
- Labels/nombres accesibles para controles, series, lados y acciones iconográficas.
- Errores asociados mediante `aria-describedby`, `aria-errormessage` y `aria-invalid`.
- RPE/RIR explicables por hover, foco y teclado.
- Targets táctiles mínimos para acciones compactas y expansión específica en dispositivos coarse.
- Gráficos con alternativa textual y controles HTML.
- Heatmap resumido sin exponer cientos de celdas como ruido semántico.
- `prefers-reduced-motion`, `forced-colors` y pausa de previews.
- Títulos por ruta, skip link y jerarquía H1 consistente.

Riesgos que impiden declarar conformidad completa:

- Falta prueba humana del orden completo de tabulación y anuncios con NVDA, VoiceOver y TalkBack.
- Falta verificar contraste de cada combinación dinámica, estado hover/disabled y SVG muscular, no solo tokens principales.
- Falta validar zoom 200/400 %, reflow real a 320 CSS px y orientación horizontal en dispositivos.
- Falta probar el comportamiento de tooltips y barra inferior con texto ampliado del sistema.

## 8. Responsive y contexto de uso

- **Desktop/laptop:** sidebar persistente, ancho de lectura controlado y paneles relacionados en dos columnas. La revisión a 1280 × 720 no encontró overflow ni solapamiento de Wake Lock/engranaje.
- **Tablet ≤ 1100 px:** sidebar se transforma en navegación inferior; dashboards, plan y perfil pasan a una columna; paneles sticky vuelven al flujo normal.
- **Móvil ≤ 520 px:** formularios y métricas se apilan, tarjetas de ejercicio reservan media + contenido, modal onboarding usa pantalla completa y series mantienen carga, repeticiones y RPE/RIR en dos filas.
- **Safe areas:** navegación, páginas, cabeceras, descanso y launcher respetan `env(safe-area-inset-*)`.
- **Riesgo a probar:** a 320 px con aumento de texto, “Ejercicios” puede truncarse visualmente aunque conserva el nombre accesible; requiere dispositivo/zoom real.

## 9. Design system

Patrones consolidados:

- Colores semánticos principales, foco, peligro, éxito/error, radios, sombra y escala tipográfica mínima.
- Modal compartida para confirmación, guía y onboarding.
- Estados button/input: hover, focus, disabled, busy, error y success.
- Banners de sincronización y recuperación.
- Abbreviation/tooltip reutilizable.
- Targets táctiles y reglas `reduced-motion`/`forced-colors`.

Deuda pendiente:

- Sustituir colores de componente por tokens de superficie, texto, borde y estado.
- Separar `styles.css` por capas o módulos para reducir colisiones de selectores amplios.
- Documentar variantes y estados en una galería de componentes.
- Incorporar comprobación automática de contraste y regresión visual en CI.

## 10. Priorización Impacto × Esfuerzo

| Categoría | Elementos |
| --- | --- |
| Quick Win | Título 404, nombre accesible del lema, RPE + valor, descansos legibles, edad coherente, copy de guía orientativa. |
| High Impact | Cola de estado, rebase a tres vías, protección de pendientes, plan efectivo, guard de sesión incompleta, Modal, breakpoint tablet y formularios de series. |
| Strategic Improvement | Medios exactos, superseries reales, API incremental, portabilidad/ciclo de cuenta, tokens completos y pruebas en dispositivos. |
| Low Priority | Code splitting adicional y microanimaciones nuevas, solo después de medir LCP/INP en hardware objetivo. |

## 11. Antes → cambio → después

| Antes / problema | Cambio aplicado | Después | Beneficio esperado |
| --- | --- | --- | --- |
| Mutaciones rápidas competían | Cola serial y estado en memoria | Cada operación parte de la anterior | Cero pérdida silenciosa por carrera local. |
| Cualquier 409 exigía elegir una copia | Rebase a tres vías | Cambios independientes se combinan | Menos conflictos y más confianza offline. |
| Refresh/logout podía borrar pendientes | Guard, flush, confirmación y descarga | El descarte requiere decisión informada | Protección real del progreso. |
| Reprogramar no cambiaba “hoy” | Plan efectivo por fecha | Resumen y Entrenar respetan la excepción | Correspondencia entre plan y acción. |
| Finalizar incompleto contaba como fallo | Validación UI + backend | Solo sesiones completas progresan | Cálculo de descarga fiable. |
| Modales dejaban fondo activo | Primitiva accesible compartida | Foco aislado y restaurado | Teclado y lector de pantalla predecibles. |
| Heatmap mezclaba padding/días | 365 días reales + resumen | Periodo y conteos correctos | Gráfico confiable y legible. |
| 195 previews activas | 24 por lote, estáticas/pausables | Menor trabajo inicial y movimiento | Mejor rendimiento percibido. |
| RPE/RIR ambiguos o desalineados | Rejilla condicional, rangos y ayudas | Captura clara en desktop/móvil | Menos errores durante el esfuerzo. |
| Pantalla fatal vacía | Error recuperable | Mensaje y reintento | El usuario siempre tiene salida. |
| “RPE” se separaba de “7” | Unidad `nowrap` y reserva táctil | “RPE 7” permanece unido | Lectura y toque más seguros. |
| 404 se anunciaba como Resumen | Fallback de título específico | “Página no encontrada · FORJA” | Contexto correcto en historial/AT. |

## 12. Correcciones realizadas por sistema

### Estado, offline y privacidad

- Operaciones Zustand serializadas y cachés separadas en base, cache y pendiente por usuario.
- Rebase de conflicto con conservación de campos administrados por servidor.
- Refresh destructivo bloqueado salvo confirmación explícita.
- Exportación JSON de emergencia desde el conflicto.
- Identidad verificada disponible durante recarga offline, nunca como sustituto de una respuesta anónima del servidor.

### Navegación, modales y feedback

- AppShell recuperable, títulos por ruta y foco de encabezado.
- Modal compartida con aislamiento de fondo y control de foco.
- Perfil accesible desde la identidad; navegación compacta completa.
- Formularios principales con busy/error/success y protección contra doble envío.

### Plan y entrenamiento

- Reprogramación efectiva, fechas alineadas, duplicados prevenidos y descanso humanizado.
- Carga anterior, laterales, RPE/RIR, Wake Lock y temporizador corregidos.
- Finalización incompleta bloqueada en cliente y servidor.
- Cabecera de entrenamiento sin solaparse con el engranaje.

### Métricas y gráficos

- Tendencia de peso con resumen accesible y controles HTML.
- Constancia anual exacta y centrada.
- Peso asociado eliminado junto con su medición corporal.
- Dirección de tendencia interpretada según meta, no siempre como pérdida de peso.

### Biblioteca y medios

- 195 ejercicios conservados, segmentados y buscables.
- Carga progresiva en bloques de 24.
- Duplicados de ejercicio personalizado prevenidos.
- Guías marcadas honestamente como orientativas y control de pausa.

### Infraestructura

- Límite Nginx/backend alineado en 10 MiB como mitigación temporal.
- Imágenes Docker reconstruidas sin eliminar datos persistentes.
- Frontend y backend saludables detrás de `http://127.0.0.1:8090`.

## 13. Pendientes que requieren información, producto o validación externa

| Problema | Por qué no se cerró ahora | Información/decisión necesaria | Prioridad |
| --- | --- | --- | --- |
| Medio exacto para cada ejercicio | No es seguro inventar 195 demostraciones; requiere licencia y validación técnica. | Fuente de video/GIF, derechos, formato, revisión de entrenador/fisioterapeuta y mapping por ID. | Alta |
| Ejecución real de superseries | Cambia navegación, modelo de sesión, timer y progreso parcial. | Definir saltos, rondas incompletas, descanso entre ejercicios/rondas y migración de sesiones. | Alta |
| Persistencia incremental | Requiere migración compatible con archivos JSON existentes. | Estrategia de versionado, endpoints de historial, paginación, compactación y backup. | Alta |
| Portabilidad y ciclo de cuenta | Involucra seguridad y políticas irreversibles. | Formato exportable, import validation, reautenticación, cambio/recuperación de contraseña y retención al eliminar. | Alta |
| Validación WCAG/dispositivos | No puede inferirse solo de DOM y pruebas unitarias. | NVDA/Firefox, VoiceOver/Safari, TalkBack/Chrome; zoom, teclado, iOS/Android/Windows/macOS. | Alta |
| Passkey, Push y Wake Lock reales | Dependen de hardware, permisos, HTTPS y SO. | Matriz de navegadores y sesiones de 45–90 min con pantalla bloqueada/visibilidad cambiante. | Alta |
| Validación del catálogo/rutinas | Las reglas son software, no una prescripción profesional individual. | Revisión por profesional cualificado, población objetivo y criterios de exclusión. | Alta |
| Tokenización completa | Es refactor transversal; hacerlo mecánicamente sin revisión puede cambiar contraste/identidad. | Inventario semántico y pruebas visuales de cada variante/estado. | Media |
| Investigación de usabilidad | La auditoría experta no mide comportamiento real. | 5–8 usuarios de distintos niveles, gimnasio concurrido, móvil en mano y sesiones observadas. | Media |

## 14. Segunda auditoría y verificación final

Resultados de la segunda pasada:

- Los cinco hallazgos Critical quedaron corregidos y con cobertura específica.
- Siete rutas revisadas sin controles de formulario sin nombre, acciones vacías, IDs duplicados ni overflow horizontal en 1280 px.
- Cabecera Workout: Wake Lock y engranaje sin solapamiento.
- Plan: RPE y valor permanecen juntos; botón eliminar conserva su área reservada.
- Heatmap: 365 días reales; padding no contabilizado.
- 404: H1 y título de documento coherentes.
- Acceso desplegado: contraseña y Passkey visibles, copy claro y sin overflow.

Validación técnica:

- Frontend: **23/23 archivos, 61/61 pruebas**, typecheck correcto y build correcto.
- Backend: **5/5 archivos, 17/17 pruebas**, incluida la protección de sesión incompleta; build correcto.
- Total: **78/78 pruebas**.
- Build frontend: 1.872 módulos; JavaScript 435,39 kB / 133,67 kB gzip; CSS 81,20 kB / 17,05 kB gzip.
- Docker Compose: frontend y backend `healthy`.
- Proxy: `/` responde HTTP 200 y `/api/health` responde `status: ok`.
- Sin warnings en pruebas, typecheck o builds finales.

## 15. Score final

| Dimensión | Antes | Después | Observación |
| --- | ---: | ---: | --- |
| UX | 6,6 | 8,4 | Flujos recuperables y protección de datos; superseries pendientes. |
| UI | 8,0 | 8,6 | Identidad fuerte y mejor jerarquía/feedback. |
| Accesibilidad | 6,3 | 8,1 | Base semántica sólida; falta validación humana WCAG. |
| Responsive | 6,9 | 8,2 | Transformación compacta coherente; falta matriz real de dispositivos/zoom. |
| Consistencia | 7,1 | 8,2 | Patrones compartidos; persisten valores visuales dispersos. |
| Design System | 6,7 | 7,4 | Tokens y primitivas útiles, pero tokenización incompleta. |
| Flujos | 6,2 | 8,2 | Fallos críticos cerrados; superseries/ciclo de cuenta pendientes. |
| Usabilidad | 6,5 | 8,5 | Mejor prevención, feedback y recuperación. |
| Calidad general | 6,7 | 8,3 | Builds, pruebas y despliegue saludables. |
| **Global** | **6,8** | **8,2** | Candidato a producción controlada, no certificación pública aún. |

## 16. Recomendación de salida

FORJA puede avanzar a una **beta controlada** con copias de seguridad del directorio `data`. Antes de una apertura pública, los cuatro gates recomendados son:

1. Sustituir y validar las guías de ejercicios prioritarios, empezando por los ejercicios presentes en rutinas generadas.
2. Implementar la semántica real de superseries en el modo guiado.
3. Ejecutar la matriz manual de accesibilidad, Passkeys, Push, Wake Lock y responsive físico.
4. Definir portabilidad/recuperación de cuenta y el plan de migración desde el estado monolítico.

La siguiente inversión de mayor retorno no es un rediseño visual adicional: es validar comportamiento real, exactitud del contenido y resiliencia de datos en sesiones prolongadas y multi-dispositivo.
