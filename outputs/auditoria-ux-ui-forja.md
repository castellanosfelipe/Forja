# Auditoría integral UX/UI — FORJA

Fecha: 24 de agosto de 2026

Producto: PWA autoalojada de entrenamiento, peso y composición corporal

Identidad revisada: **FORJA — Entrena. Registra. Evoluciona.**

## Resumen ejecutivo

FORJA parte de una base de producto sólida: la propuesta de privacidad es clara, el acceso con Passkeys está bien explicado, la arquitectura de información es comprensible y el lenguaje visual verde/cal/editorial transmite disciplina sin parecer una aplicación clínica. La opción **Crear cuenta** resuelve correctamente el caso de una persona que todavía no tiene una Passkey: la primera credencial se crea durante el registro.

La auditoría inicial detectó fricción sistémica en cuatro áreas: contraste y texto secundario, navegación y captura móvil, protección de acciones destructivas y feedback insuficiente en algunos formularios. El problema funcional más relevante estaba en el entrenamiento móvil: RPE y RIR desaparecían por CSS aunque el usuario los hubiera activado.

Se corrigieron directamente los hallazgos accionables sin cambiar la lógica central, la arquitectura, el modelo de privacidad ni WebAuthn. No quedan bloqueos críticos conocidos. La madurez UX/UI pasa de **intermedia (6,8/10)** a **alta para una versión autoalojada (8,7/10)**. La validación final incluyó escritorio, móvil, estructura semántica, responsive, compilación, pruebas y despliegue Docker.

## Alcance y método

Se revisaron las rutas y componentes de acceso, resumen, métricas, plan semanal, biblioteca, entrenamiento guiado, perfil, gráficos, mapa muscular, temporizador, estados offline/sincronización y página 404.

La evaluación combinó:

- Las 10 heurísticas de Nielsen.
- Criterios relevantes de WCAG 2.2 AA.
- Inspección de código React/TypeScript y CSS.
- Prueba en navegador a 1280 × 720 y 360 × 800 px.
- Medición de targets, tipografía, overflow y contraste computado.
- Pruebas de componentes, typecheck, builds de producción y health checks Docker.

Los flujos autenticados se auditaron por estructura, estados, código y pruebas automatizadas. La ceremonia biométrica real, Web Push, Wake Lock y lectores de pantalla físicos quedan como validación de dispositivo, porque requieren hardware, permisos y una cuenta Passkey real.

## Arquitectura de información y flujos críticos

| Flujo | Entrada | Resultado | Evaluación final |
| --- | --- | --- | --- |
| Acceso / registro | Pantalla pública | Sesión protegida por Passkey | Claro, dos rutas visibles y sin contraseña; ayuda contextual añadida. |
| Registrar peso | Resumen → Peso | Tendencia y meta actualizadas | 1 paso, validación explícita y sin pérdida de datos. |
| Calcular composición | Métricas | IMC, grasa, masa magra, FFMI, energía y macros | Cadena de cálculo comprensible; advertencia médica conservada. |
| Ajustar plan | Plan | Cambio recurrente o excepción por fecha | Diferencia entre plan base y reprogramación bien comunicada; errores prevenidos. |
| Crear ejercicio | Biblioteca | Ejercicio y regla de progresión | El formulario adapta la progresión al tipo de medición y acepta nombres musculares comunes. |
| Entrenar | Entrenar → día → series | Sesión completada y progresión calculada | Wake Lock, descanso y captura conservados; salida protegida y RPE/RIR recuperados en móvil. |
| Gestionar dispositivo | Perfil | Passkeys, Push, instalación y preferencias | Estados más claros y eliminación de credenciales protegida. |

## Evaluación heurística de Nielsen

| Heurística | Resultado |
| --- | --- |
| Visibilidad del estado | Mejorada con skeletons, estado de sincronización, progressbar, Wake Lock, avisos y confirmaciones. |
| Relación con el mundo real | Buena. Se simplificaron nombres musculares técnicos y unidades. |
| Control y libertad | Mejorada con cancelación segura, diálogos, cierre de formularios y limpieza de búsquedas. |
| Consistencia y estándares | Consolidada mediante tokens, tamaños mínimos, estados y componentes reutilizables. |
| Prevención de errores | Mejorada: duplicados, fechas, rangos, borrados y salida de sesión se validan antes de mutar datos. |
| Reconocimiento frente a memoria | Buena: ayudas en contexto, propuestas de carga, etiquetas y navegación persistente. |
| Flexibilidad y eficiencia | Buena: registro rápido, autocompletado previo, búsqueda y reprogramación sin alterar el plan base. |
| Diseño estético y minimalista | Fortaleza. Se conservó la identidad editorial y se elevó la legibilidad secundaria. |
| Ayuda con errores | Mejorada: los fallos ya no son silenciosos y explican cómo corregirlos. |
| Ayuda y documentación | Suficiente en contexto; falta documentación extensa solo para operación avanzada del servidor. |

## Hallazgos

| ID | Área | Hallazgo / evidencia | Severidad | Impacto | Corrección | Estado |
| --- | --- | --- | --- | --- | --- | --- |
| A11Y-01 | Color | Naranja original sobre superficie clara: 3,5:1. | 🟠 High | Texto de estado no cumplía AA. | Token naranja ajustado a `#a84024`: 6,03:1 sobre papel y 6,13:1 con blanco. | Corregido |
| A11Y-02 | Teclado | Botones y enlaces no tenían foco global consistente. | 🟠 High | Navegación por teclado poco visible. | Foco `:focus-visible` de 3 px, skip links y foco específico para toggles. | Corregido |
| A11Y-03 | Tipografía | Numerosos textos operativos entre 8,3 y 11,5 px. | 🟠 High | Baja legibilidad, especialmente en móvil. | Escala mínima de 12/14/16 px según función y colores secundarios más oscuros. | Corregido |
| A11Y-04 | Semántica | Puntos del gráfico anunciados como botones sin acción y 371 celdas del heatmap expuestas. | 🟡 Medium | Ruido y expectativas incorrectas en lector de pantalla. | Puntos como imágenes enfocables; mapa anual resumido como una sola imagen accesible. | Corregido |
| A11Y-05 | Touch | Iconos de 35 px y acciones del plan aún menores. | 🟠 High | Mayor probabilidad de toque accidental. | Targets circulares de 44 px y botones móviles de 56 px. | Corregido |
| A11Y-06 | Temporizador | `aria-live` podía anunciar el contador cada segundo. | 🟡 Medium | Interrupción continua para lectores de pantalla. | Rol `timer` con live desactivado y nombres accesibles en acciones compactas. | Corregido |
| RESP-01 | Navegación | Seis destinos comprimidos en columnas iguales con texto de 8,8 px. | 🟠 High | Navegación móvil apretada y difícil de tocar. | Barra horizontal desplazable, targets mínimos, estado activo con color y superficie. | Corregido |
| RESP-02 | Entrenamiento | RPE/RIR se ocultaban por debajo de 820 px. | 🟠 High | Pérdida de captura en el principal contexto de uso. | Rejilla móvil en dos niveles; ambos campos permanecen visibles. | Corregido |
| SAFE-01 | Seguridad UX | Passkeys, mediciones, plan y sesiones se eliminaban/cancelaban inmediatamente. | 🟠 High | Pérdida accidental de datos o credenciales. | Diálogo reutilizable accesible con foco seguro y confirmación explícita. | Corregido |
| FEED-01 | Formularios | Peso inválido, misma fecha y duplicados fallaban en silencio. | 🟠 High | El usuario no sabía por qué no avanzaba. | Mensajes accionables, roles alert/status y conservación de valores. | Corregido |
| FLOW-01 | Plan | Permitía rangos invertidos, duplicados y fecha original incompatible con el día. | 🟡 Medium | Plan inconsistente o difícil de entender. | Validación previa y formulario adaptado a repeticiones o duración. | Corregido |
| FLOW-02 | Biblioteca | Búsqueda sin resultados dejaba una zona vacía. | 🟡 Medium | Duda sobre error, carga o ausencia de datos. | Estado vacío con término buscado y acción para limpiar. | Corregido |
| CONTENT-01 | Biblioteca | El usuario debía conocer identificadores musculares en inglés. | 🟡 Medium | Carga cognitiva y mapa muscular incompleto. | Alias en español y ayuda contextual; normalización al modelo existente. | Corregido |
| PWA-01 | Instalación | “Ya disponible” mezclaba instalado, no soportado y prompt ausente. | 🟡 Medium | Estado ambiguo. | Acción “Ver cómo” con instrucción manual cuando el prompt no existe. | Corregido |
| LOAD-01 | Rendimiento percibido | Carga de datos mostraba solo marca y texto. | 🟢 Low | Sensación de espera indeterminada. | Skeleton responsive con semántica de estado y reducción de movimiento. | Corregido |
| DS-01 | Design system | Colores, radios, sombras, tipografía y estados eran valores aislados. | 🟡 Medium | Cambios futuros propensos a divergencias. | Tokens semánticos y patrones compartidos para foco, feedback, peligro y carga. | Corregido |
| TRUST-01 | Perfil | Última Passkey deshabilitada sin explicar el motivo. | 🟡 Medium | Confusión al gestionar credenciales. | Ayuda visible y explicación contextual; eliminación restante protegida. | Corregido |
| FORM-01 | Acceso | Inputs correctos, pero sin ayuda sobre usuario opcional/identificador. | 🟡 Medium | Duda durante acceso y alta. | `aria-describedby`, ayudas visibles y estado busy del formulario. | Corregido |

No se identificó ningún hallazgo **Critical** que impidiera completar el acceso público o que exigiera desactivar una función.

## Priorización Impacto × Esfuerzo

| Categoría | Cambios |
| --- | --- |
| Quick Win | Contraste, foco, labels, mensajes, targets, estado vacío, copy de instalación. |
| High Impact | RPE/RIR móvil, confirmaciones destructivas, navegación móvil, validación del plan. |
| Strategic Improvement | Tokens, normalización muscular, semántica de gráficos, skeleton compartido. |
| Low Priority | División futura del bundle por rutas y documentación operativa avanzada. |

## Correcciones realizadas: antes → después

| Antes | Cambio | Después / beneficio esperado |
| --- | --- | --- |
| Contraste naranja insuficiente | Token accesible y paleta secundaria sólida | Lectura AA y estados más fiables. |
| Estados de foco parciales | Foco global, skip links y toggles visibles | Uso completo por teclado. |
| Navegación móvil comprimida | Barra desplazable con targets de 56 px | Menos errores de toque y etiquetas legibles. |
| RPE/RIR ocultos en móvil | Rejilla móvil de dos filas | Se conserva toda la captura del entrenamiento. |
| Borrado inmediato | `ConfirmDialog` reutilizable | Prevención de pérdida accidental. |
| Fallos silenciosos | Validación y feedback contextual | Recuperación rápida sin reiniciar el flujo. |
| Identificadores musculares técnicos | Alias españoles normalizados | Menor carga cognitiva y mapa más útil. |
| Estados de carga genéricos | Skeleton responsive | Mejor rendimiento percibido. |
| Heatmap verboso para lector | Resumen semántico | Menos ruido sin perder el total anual. |
| Instalación ambigua | Instrucción manual contextual | Próximo paso claro en navegadores sin prompt. |

## Responsive final

- **Móvil (320–520 px):** navegación inferior desplazable, cards a una columna, formularios apilados, temporizador compacto sin perder etiquetas y sets en dos niveles.
- **Tablet (521–820 px):** dos columnas donde aportan comparación, sidebar sustituida por navegación inferior y paneles laterales integrados en flujo.
- **Laptop / desktop:** sidebar persistente, ancho máximo de lectura, métricas en cuatro columnas y paneles relacionados lado a lado.
- **Pantallas grandes:** el contenido autenticado mantiene un máximo de 96 rem para evitar líneas y distancias excesivas; el acceso utiliza el espacio completo como composición de marca.
- **Validación final:** sin overflow horizontal en la pantalla pública a 360 y 1280 px.

## Design system consolidado

Se añadieron tokens para color semántico, foco, peligro, éxito/error, radios, sombra y escalas tipográficas. Los patrones compartidos ahora cubren:

- Botón primario, secundario, finalización y peligro.
- Hover, focus, active, disabled y loading.
- Inputs focus/invalid.
- Banner de éxito/error/estado.
- Diálogo destructivo accesible.
- Skeleton de página.
- Targets iconográficos de 44 px.
- Tipografía secundaria mínima y colores de alto contraste.
- `prefers-reduced-motion` y `forced-colors`.

## Pendientes reales

| Pendiente | Motivo | Información / prueba necesaria | Prioridad |
| --- | --- | --- | --- |
| Ceremonia Passkey completa | Requiere hardware/biometría y cuenta real. | iOS Safari, Android Chrome, macOS Safari y Windows Hello. | Alta antes de producción pública |
| Web Push con pantalla bloqueada | Depende de permisos, sistema operativo y entrega externa. | Matriz de dispositivos y políticas de notificación. | Alta |
| Wake Lock en sesiones largas | Depende de visibilidad, batería y soporte del navegador. | Sesión real de 45–90 minutos en móvil. | Alta |
| Lector de pantalla de extremo a extremo | La revisión semántica no sustituye pruebas humanas. | VoiceOver, TalkBack y NVDA con una cuenta autenticada. | Alta |
| Investigación con usuarios | Los scores son evaluación experta, no evidencia conductual. | 5–8 atletas con distintos niveles y contextos de gimnasio. | Media |
| División del bundle por rutas | Bundle actual: 103,53 kB gzip; no bloquea la experiencia. | Medir LCP/INP en el servidor y dispositivos objetivo. | Baja |

## Verificación técnica final

- Frontend: **12/12 pruebas**, typecheck correcto y build Vite correcto.
- Backend: **12/12 pruebas** y build TypeScript correcto.
- Total: **24/24 pruebas**.
- Producción: imágenes Docker reconstruidas; frontend y backend saludables.
- Proxy unificado: `http://localhost:8090` responde 200 y `/api/health` responde `ok`.
- Bundle: 334,60 kB JavaScript / **103,53 kB gzip**; CSS **10,31 kB gzip**.
- Navegador final: asset actualizado, título correcto, skip link presente y sin overflow horizontal.

## Score final

Las puntuaciones son una rúbrica experta de calidad, no resultados de un estudio de usabilidad.

| Dimensión | Antes | Después |
| --- | ---: | ---: |
| UX | 7,1 | 8,6 |
| UI | 8,0 | 8,7 |
| Accesibilidad | 5,8 | 8,6 |
| Responsive | 6,2 | 8,8 |
| Consistencia | 7,1 | 8,7 |
| Design System | 6,5 | 8,5 |
| Flujos | 6,8 | 8,5 |
| Usabilidad | 6,9 | 8,7 |
| Calidad general | 7,0 | 8,7 |
| **Global** | **6,8** | **8,7** |

## Conclusión

FORJA conserva lo que ya funcionaba —privacidad, identidad, Passkeys, lenguaje directo y foco en el entrenamiento— y ahora presenta una base más segura, legible, consistente y preparada para uso móvil. La siguiente inversión con mayor retorno no es otro rediseño: es validar los cuatro comportamientos dependientes de dispositivo y observar a usuarios reales completar acceso, una sesión y una medición corporal.
