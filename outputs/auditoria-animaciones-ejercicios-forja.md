# Auditoría integral de animaciones de ejercicios — FORJA

Fecha: 24 de agosto de 2026

## Veredicto

El sistema actual **no es apto para presentarse como guía visual de ejecución correcta**. No existen GIF individuales por ejercicio: FORJA dibuja un SVG genérico y clasifica los 195 ejercicios en únicamente 24 patrones mediante categoría y palabras del nombre.

Esto explica los tres problemas reportados:

- ejercicios diferentes muestran el mismo dibujo;
- muchos dibujos representan otro ejercicio o inventan equipo;
- varias instrucciones contradicen el movimiento seleccionado.

La auditoría fue de solo lectura. No se modificó el código de producción.

## Alcance y método

- Catálogo revisado: **195 ejercicios**, 16 categorías.
- Patrones visuales revisados: **24 de 24**.
- Revisión estática de la asignación ejercicio–patrón.
- Revisión de los SVG, transformaciones CSS, instrucciones, accesibilidad, rendimiento y soporte offline.
- Renderización comparativa de los 24 patrones para comprobar postura, equipo y trayectoria.

## Resultados cuantitativos

| Indicador | Resultado |
|---|---:|
| Ejercicios del catálogo | 195 |
| Patrones genéricos | 24 |
| Ejercicios que comparten dibujo y texto con otro | 194 de 195 |
| Estructuras corporales base | 2: de pie y tumbada |
| Ejercicios con figura de pie | 149 |
| Ejercicios con figura tumbada | 46 |
| Figuras de pie con pesas ficticias | 80 |
| Figuras tumbadas con barra ficticia | 33 |
| Flecha vertical genérica | 195 |
| Pruebas de correspondencia visual | 0 |

Solo `leg-extension` pertenece a un patrón sin otro ejercicio. Esto no significa que su dibujo sea técnicamente suficiente; únicamente que no está duplicado.

## Hallazgos críticos

### 1. La animación no se asigna explícitamente por ejercicio

`exercise-guide.ts:217-249` infiere un patrón usando categoría y coincidencias de texto. El ejercicio no contiene un identificador de medio, variante biomecánica ni estado de revisión.

Consecuencias comprobadas:

- `dead-hang` y `plate-pinch` se convierten en curl de bíceps.
- `dumbbell-shrug` y `barbell-shrug` se convierten en caminata con carga.
- `bulgarian-split-squat`, `leg-press` y `wall-sit` se convierten en sentadilla libre.
- `dumbbell-pullover` se convierte en jalón vertical de pie.
- `face-pull` y `reverse-pec-deck` se convierten en elevación lateral.
- `copenhagen-plank` se convierte en aislamiento de cadera de pie.
- `dead-bug`, `bird-dog` y `hollow-body-hold` se convierten en plancha frontal.
- bicicleta, remo, SkiErg, cuerda, cajón y saco muestran la misma caminata.
- gato-vaca, foam roller y todos los estiramientos muestran el mismo balanceo de pie.

La heurística también es frágil ante ejercicios personalizados, sinónimos y nombres en otro idioma.

### 2. El SVG inventa equipo

`ExerciseAnimation.tsx:39-80` contiene solo dos figuras.

- La figura de pie siempre dibuja un peso en cada mano (`:48-49`), aunque el ejercicio use una máquina, barra de dominadas, banda, bicicleta o ningún implemento.
- La figura tumbada dibuja una barra siempre que el patrón no sea plancha (`:72`). La barra aparece en crunches, curls femorales, aperturas con mancuernas, puentes, frog pump, rueda abdominal, flexiones y fondos.
- El campo `exercise.equipment` no interviene en el dibujo.
- La misma flecha descendente (`:31-34`) aparece en trayectorias ascendentes, horizontales, circulares, estáticas y antirotacionales.

### 3. La biomecánica dibujada no articula las zonas correctas

- Bisagra: rota únicamente la línea del torso; cabeza, hombros, brazos y cadera permanecen quietos.
- Press tumbado: desplaza el bloque completo de brazos y lo separa de los hombros.
- Aperturas: brazos y barra ficticia giran como una sola pieza hacia el mismo lado.
- Curl y tríceps: usan exactamente los mismos fotogramas.
- Sentadilla: encoge verticalmente toda la figura; no flexiona cadera, rodilla ni tobillo.
- Zancada: gira cada pierna como una vara rígida.
- Extensión y curl de pierna: rotan desde la cadera en vez de articular la rodilla.
- Hip thrust: traslada cabeza, torso, brazos y piernas como un bloque.
- Pantorrillas: eleva también los pies y parece un salto.
- Rotación de core: inclina todo el cuerpo en 2D; no muestra rotación ni antirotación.
- Cardio y transporte: el cuerpo se desplaza, pero las piernas permanecen inmóviles.
- Plancha: el cuerpo rebota aunque sea un ejercicio isométrico.

### 4. Las instrucciones también corresponden al patrón genérico

`exercise-guide.ts:17-210` tiene un único bloque de texto por patrón. Ejemplos de riesgo:

- Pinza con discos y suspensión pasiva: ordena acercar una carga al hombro.
- Encogimientos: ordena caminar con pasos cortos.
- Elevación de tibial: ordena subir el talón, que es la acción contraria.
- Tirones olímpicos: ordena recibir la barra aunque no tienen recepción.
- Curl nórdico y glute-ham raise: ordena alinear la rodilla con el eje de una máquina y usar un rodillo inexistente.
- Jalón con brazos rectos y pullover: ordena llevar la barra a la parte alta del pecho.

El diálogo admite que la animación representa solo “el patrón principal”, pero los accesos prometen “Ver técnica” y “ejecución correcta”. Esa promesa es engañosa.

## Matriz completa de patrones

| Patrón | Cantidad | Evaluación principal |
|---|---:|---|
| Movilidad | 16 | Crítico: todos usan una figura de pie con pesas; no representa estiramientos, cuadrupedia ni foam roller. |
| Press horizontal | 15 | Crítico: flexiones, fondos, máquina y polea aparecen como press tumbado con barra. |
| Curl | 15 | Crítico: incluye curls de muñeca, pinza con discos y suspensión pasiva. |
| Cardio | 13 | Crítico: bicicleta, remo, escaladora, cuerda, cajón y saco parecen una caminata con pesas. |
| Bisagra | 11 | Alto: solo gira la línea del torso; no representa barra, máquina, swing ni hiperextensiones. |
| Flexión de core | 10 | Crítico: figura tumbada con barra ficticia para crunch, elevaciones colgadas, rueda y dragon flag. |
| Halterofilia | 10 | Crítico: no muestra barra, tirón, trayectoria ni recepción diferenciada. |
| Tirón vertical | 9 | Crítico: parece un press con pesas; dominadas, jalones y pullover comparten escena. |
| Sentadilla | 9 | Alto: la figura solo se comprime; prensa, búlgara y wall sit son incorrectos. |
| Remo | 8 | Crítico: torso erguido y pesas laterales; no representa remos inclinados, sentados o en máquina. |
| Elevación de hombro | 8 | Crítico: face pull, pájaros y remo al mentón aparecen como elevación lateral. |
| Aislamiento de cadera | 8 | Crítico: máquina sentada, banda lateral y Copenhagen aparecen como pierna de pie. |
| Cuerpo completo | 8 | Crítico: burpee, trineo, cuerdas y balón medicinal aparecen como una sentadilla genérica. |
| Tríceps | 7 | Crítico: es visualmente idéntico al curl de bíceps. |
| Pantorrilla | 7 | Alto: no distingue sentado, prensa, donkey ni tibial; el cuerpo parece saltar. |
| Press vertical | 6 | Alto: no distingue sentado, Arnold, máquina o landmine. |
| Curl femoral | 6 | Crítico: tumbado sin máquina; sentado, de pie, nórdico, GHR y slider son incorrectos. |
| Hip thrust | 6 | Crítico: incluye banco y barra flotante sobre el pecho; traslada todo el cuerpo. |
| Transporte | 5 | Alto: encogimientos reciben instrucciones de caminar; las piernas no marchan. |
| Zancada | 5 | Alto: step-up y zancada lateral no tienen banco ni desplazamiento lateral. |
| Plancha | 5 | Crítico: side plank, dead bug, bird dog y hollow usan la misma plancha frontal. |
| Aperturas | 4 | Crítico: aparece una barra única para mancuernas, poleas y pec deck. |
| Rotación de core | 3 | Crítico: Pallof, woodchop y giro ruso reciben la misma inclinación del cuerpo. |
| Extensión de pierna | 1 | Medio: la silla es esquemática y la pierna rota desde una articulación incorrecta. |

## Cobertura de pruebas insuficiente

- `exercise-guide.test.ts` comprueba tres pasos y longitudes mínimas de texto, no que sean correctos.
- Solo se verifican diez clasificaciones simples.
- `library.test.tsx` comprueba que exista un elemento con rol `img`, no lo que representa.
- Las pruebas del backend validan IDs, categorías y músculos, pero no medios.
- No existen capturas de referencia, comprobación de equipo, postura, lateralidad, trayectoria, duplicados o decodificación.

Rendimiento adicional: la biblioteca puede crear hasta 195 SVG y 195 `IntersectionObserver`. El pausado fuera de pantalla y `prefers-reduced-motion` son aspectos positivos, pero la animación visible no ofrece pausa manual.

## Corrección recomendada

No conviene ampliar este sistema con más condiciones y keyframes genéricos. Debe sustituirse por un registro explícito por `exercise.id`.

### Formato recomendado

Por cada ejercicio:

- `exerciseId` y `mediaKey`;
- archivo animado y póster estático;
- posición corporal, equipo, vista y unilateralidad;
- trayectoria y puntos inicial/final;
- pasos específicos, errores frecuentes y respiración;
- versión, checksum, fuente, licencia y estado de revisión;
- lista explícita de variantes autorizadas para compartir medio.

Para privacidad, rendimiento y soporte offline, usar archivos locales WebM/MP4 cortos o WebP animado con póster. Un GIF tradicional pesa más y ofrece peor compresión. Los SVG deben reservarse para ejercicios cuya biomecánica puedan representar fielmente.

### Controles obligatorios

1. Los 195 IDs del catálogo deben existir exactamente una vez en el manifiesto.
2. Todos los archivos deben existir, decodificarse y cumplir límites de tamaño y duración.
3. Dos ejercicios no pueden compartir hash o `mediaKey` salvo equivalencia aprobada.
4. Equipo, postura, lateralidad y trayectoria deben coincidir con la ficha.
5. Generar una hoja de contacto con inicio, mitad y final de los 195 recursos para revisión humana.
6. La revisión biomecánica final debe realizarla un entrenador cualificado.
7. Un ejercicio personalizado sin medio debe mostrar “Demostración no verificada”, nunca una animación inventada.
8. Probar los recursos offline y mostrar un estado honesto si aún no se descargaron.

## Mitigación inmediata

Mientras se sustituyen los recursos:

- dejar de presentar estas animaciones como “ejecución correcta”;
- marcar explícitamente “patrón genérico no verificado”;
- ocultar demostraciones con contradicción grave;
- conservar instrucciones solo cuando hayan sido revisadas para ese ejercicio;
- priorizar primero movimientos de mayor riesgo: olímpicos, peso muerto, sentadilla, press, dominadas, fondos y ejercicios de máquina.

## Criterio de aceptación final

- Cobertura: 195/195 ejercicios revisados.
- Faltantes: 0.
- Medios engañosos: 0.
- Duplicados no autorizados: 0.
- Archivos no decodificables: 0.
- Revisión humana documentada: 195/195.
- Apertura offline comprobada por categoría.
