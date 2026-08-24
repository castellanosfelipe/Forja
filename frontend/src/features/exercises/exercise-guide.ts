import type { Exercise } from '../../types/state';

export type MovementPattern =
  | 'horizontal-press' | 'fly' | 'vertical-press' | 'raise' | 'row' | 'vertical-pull'
  | 'hinge' | 'curl' | 'triceps' | 'squat' | 'lunge' | 'leg-extension' | 'leg-curl'
  | 'hip-thrust' | 'hip-isolation' | 'calf' | 'plank' | 'core-flexion' | 'core-rotation'
  | 'carry' | 'cardio' | 'olympic' | 'mobility' | 'full-body';

export interface ExerciseGuide {
  pattern: MovementPattern;
  steps: Array<{ title: string; description: string }>;
  cues: string[];
  warning: string;
  breathing: string;
}

const COPY: Record<MovementPattern, Omit<ExerciseGuide, 'pattern'>> = {
  'horizontal-press': guide(
    ['Posición', 'Apoya los pies y estabiliza escápulas y tronco antes de tomar la carga.'],
    ['Descenso', 'Lleva la carga hacia el pecho con los antebrazos estables y sin perder tensión.'],
    ['Empuje', 'Extiende los brazos siguiendo una trayectoria controlada, sin rebotar ni bloquear con violencia.'],
    ['Muñecas neutras', 'Hombros alejados de las orejas', 'Pies firmes'],
    'Evita que los codos se abran en exceso o que el hombro se desplace hacia delante.',
    'Inhala durante el descenso y exhala al superar la parte más difícil del empuje.',
  ),
  fly: guide(
    ['Ajuste', 'Mantén una ligera flexión de codos y las escápulas estables.'],
    ['Apertura', 'Abre los brazos hasta sentir tensión cómoda en el pecho, sin forzar el hombro.'],
    ['Cierre', 'Acerca los brazos dibujando un arco y contrae el pecho sin golpear las cargas.'],
    ['Codo semiflexionado', 'Movimiento en arco', 'Carga moderada'],
    'No busques un estiramiento profundo si pierdes la posición del hombro.',
    'Inhala al abrir y exhala al cerrar.',
  ),
  'vertical-press': guide(
    ['Base', 'Aprieta abdomen y glúteos; coloca la carga a la altura del hombro.'],
    ['Empuje', 'Lleva la carga sobre la cabeza manteniéndola cerca de la línea media.'],
    ['Regreso', 'Baja con control hasta la posición inicial sin arquear la zona lumbar.'],
    ['Costillas contenidas', 'Cuello largo', 'Trayectoria vertical'],
    'Detén el movimiento si aparece pinzamiento en el hombro; nunca presiones tras la nuca.',
    'Toma aire antes del empuje, estabiliza y exhala arriba.',
  ),
  raise: guide(
    ['Inicio', 'Coloca los brazos relajados, hombros bajos y torso inmóvil.'],
    ['Elevación', 'Eleva la carga con los codos guiando el movimiento hasta una altura cómoda.'],
    ['Descenso', 'Regresa lentamente sin dejar caer el peso ni balancear el tronco.'],
    ['Carga ligera', 'Sin impulso', 'Hombros lejos de las orejas'],
    'No eleves más allá del rango que puedas controlar sin dolor.',
    'Exhala al elevar e inhala al descender.',
  ),
  row: guide(
    ['Base', 'Estabiliza el tronco y deja los hombros en una posición larga y controlada.'],
    ['Tirón', 'Lleva los codos hacia atrás sin encoger los hombros ni girar el torso.'],
    ['Retorno', 'Extiende los brazos lentamente y permite que las escápulas se deslicen sin perder postura.'],
    ['Pecho estable', 'Codos hacia atrás', 'Sin tirones'],
    'Evita redondear o hiperextender la espalda para completar la repetición.',
    'Exhala al tirar e inhala al extender los brazos.',
  ),
  'vertical-pull': guide(
    ['Agarre', 'Sujeta la barra o polea y estabiliza el tronco con el pecho alto.'],
    ['Descenso', 'Lleva los codos hacia las costillas y la barra hacia la parte alta del pecho.'],
    ['Extensión', 'Regresa con control hasta estirar los dorsales sin perder la posición del hombro.'],
    ['Codos hacia abajo', 'Sin balanceo', 'Pecho abierto'],
    'No lleves la barra detrás de la cabeza ni uses impulso para completar repeticiones.',
    'Exhala al tirar e inhala al regresar.',
  ),
  hinge: guide(
    ['Preparación', 'Coloca los pies firmes, columna neutra y carga cerca del cuerpo.'],
    ['Bisagra', 'Lleva la cadera atrás manteniendo las tibias relativamente verticales.'],
    ['Extensión', 'Empuja el suelo y extiende la cadera sin inclinarte hacia atrás al terminar.'],
    ['Carga cerca', 'Espalda neutra', 'Cadera atrás'],
    'Detén la bajada cuando mantener la columna neutra deje de ser posible.',
    'Inhala y crea presión abdominal antes de bajar; exhala al completar la extensión.',
  ),
  curl: guide(
    ['Inicio', 'Alinea muñeca y antebrazo, con los codos estables junto al cuerpo o al apoyo.'],
    ['Flexión', 'Acerca la carga al hombro sin adelantar el codo ni balancear el tronco.'],
    ['Descenso', 'Extiende el codo de forma lenta hasta conservar una ligera tensión.'],
    ['Codos quietos', 'Muñeca neutra', 'Sin balanceo'],
    'Reduce la carga si necesitas mover la espalda para completar la repetición.',
    'Exhala al flexionar e inhala al bajar.',
  ),
  triceps: guide(
    ['Ajuste', 'Estabiliza hombros y tronco; fija la posición de los codos.'],
    ['Extensión', 'Extiende el codo hasta contraer el tríceps sin mover el hombro.'],
    ['Regreso', 'Vuelve con control hasta el rango que mantenga el codo cómodo.'],
    ['Codos estables', 'Muñecas alineadas', 'Movimiento controlado'],
    'No fuerces el bloqueo ni dejes que la carga lleve el hombro a una posición dolorosa.',
    'Exhala al extender e inhala al regresar.',
  ),
  squat: guide(
    ['Base', 'Apoya todo el pie, coloca las rodillas en la dirección de los dedos y estabiliza el tronco.'],
    ['Descenso', 'Flexiona cadera y rodillas manteniendo el equilibrio sobre el mediopié.'],
    ['Ascenso', 'Empuja el suelo y extiende cadera y rodillas sin colapsar las rodillas hacia dentro.'],
    ['Pie completo', 'Rodillas alineadas', 'Tronco firme'],
    'Usa solo la profundidad que puedas controlar sin dolor ni pérdida de postura.',
    'Inhala y crea presión antes de bajar; exhala al superar el punto difícil.',
  ),
  lunge: guide(
    ['Paso', 'Separa los pies lo suficiente para mantener una base estable.'],
    ['Descenso', 'Baja la cadera de forma vertical con la rodilla alineada sobre el pie.'],
    ['Regreso', 'Empuja con el pie de apoyo y vuelve sin perder el equilibrio.'],
    ['Base amplia', 'Rodilla estable', 'Cadera nivelada'],
    'Acorta el rango o cambia de variante si aparece dolor en la rodilla.',
    'Inhala al bajar y exhala al subir.',
  ),
  'leg-extension': guide(
    ['Ajuste', 'Alinea el eje de la máquina con la rodilla y apoya completamente la espalda.'],
    ['Extensión', 'Eleva el rodillo extendiendo las rodillas sin despegar la cadera.'],
    ['Descenso', 'Baja lentamente hasta un rango cómodo y repite sin rebotes.'],
    ['Eje alineado', 'Cadera apoyada', 'Sin impulso'],
    'No uses un rango que provoque dolor anterior de rodilla.',
    'Exhala al extender e inhala al bajar.',
  ),
  'leg-curl': guide(
    ['Ajuste', 'Alinea la rodilla con el eje y coloca el rodillo sobre la parte baja de la pierna.'],
    ['Flexión', 'Acerca el talón hacia el glúteo manteniendo la cadera estable.'],
    ['Retorno', 'Extiende la rodilla con control sin dejar caer la carga.'],
    ['Cadera estable', 'Talón hacia atrás', 'Control excéntrico'],
    'Evita arquear la espalda o levantar la cadera para mover más peso.',
    'Exhala al flexionar e inhala al extender.',
  ),
  'hip-thrust': guide(
    ['Apoyo', 'Coloca la espalda o los pies según la variante y alinea las rodillas con los pies.'],
    ['Extensión', 'Eleva la cadera contrayendo glúteos y manteniendo las costillas contenidas.'],
    ['Descenso', 'Baja de forma controlada sin perder la posición de pelvis y rodillas.'],
    ['Mentón recogido', 'Pelvis neutra', 'Rodillas alineadas'],
    'No hiperextiendas la zona lumbar para ganar altura.',
    'Exhala al elevar la cadera e inhala al bajar.',
  ),
  'hip-isolation': guide(
    ['Ajuste', 'Estabiliza pelvis y tronco antes de mover la pierna.'],
    ['Movimiento', 'Desplaza la pierna desde la cadera dentro de un rango controlado.'],
    ['Regreso', 'Vuelve lentamente sin girar la pelvis ni usar impulso.'],
    ['Pelvis quieta', 'Rango cómodo', 'Tensión continua'],
    'Reduce el rango si la pelvis comienza a girar o aparece molestia inguinal.',
    'Exhala al separar o acercar la pierna; inhala al regresar.',
  ),
  calf: guide(
    ['Apoyo', 'Distribuye el peso sobre la base de los dedos y mantén el tobillo alineado.'],
    ['Elevación', 'Sube el talón hasta contraer la pantorrilla sin girar el pie.'],
    ['Descenso', 'Baja lentamente hasta un estiramiento cómodo y conserva el control.'],
    ['Tobillo alineado', 'Pausa arriba', 'Descenso lento'],
    'No rebotes en la parte baja ni dejes que el tobillo colapse hacia dentro.',
    'Exhala al elevar e inhala al bajar.',
  ),
  plank: guide(
    ['Base', 'Apoya manos, antebrazos o pies según la variante y alarga el cuerpo.'],
    ['Tensión', 'Contrae abdomen y glúteos para mantener costillas, pelvis y cabeza alineadas.'],
    ['Duración', 'Respira sin perder la postura y termina antes de que la zona lumbar se hunda.'],
    ['Cuerpo en bloque', 'Glúteos activos', 'Cuello neutro'],
    'Finaliza la serie si la postura se pierde aunque el tiempo objetivo no haya terminado.',
    'Respira corto y controlado sin contener el aire durante toda la serie.',
  ),
  'core-flexion': guide(
    ['Inicio', 'Estabiliza la pelvis y coloca el abdomen bajo tensión antes de moverte.'],
    ['Contracción', 'Acerca costillas y pelvis o eleva las piernas sin usar impulso.'],
    ['Regreso', 'Vuelve lentamente manteniendo la zona lumbar controlada.'],
    ['Movimiento desde el core', 'Sin tirón de cuello', 'Pelvis estable'],
    'Reduce el rango si la zona lumbar se arquea o el cuello recibe tensión.',
    'Exhala durante la contracción e inhala al regresar.',
  ),
  'core-rotation': guide(
    ['Base', 'Estabiliza pies, pelvis y caja torácica antes de iniciar.'],
    ['Acción', 'Rota o resiste la rotación desde el tronco sin perder la alineación.'],
    ['Retorno', 'Regresa lentamente manteniendo tensión y control de la pelvis.'],
    ['Pelvis estable', 'Costillas contenidas', 'Rango controlado'],
    'No fuerces el giro lumbar ni uses una carga que te arrastre fuera de posición.',
    'Exhala durante el esfuerzo e inhala al volver.',
  ),
  carry: guide(
    ['Carga', 'Levanta el implemento con una bisagra estable y colócate erguido.'],
    ['Marcha', 'Camina con pasos cortos manteniendo hombros nivelados y abdomen activo.'],
    ['Final', 'Detente y deposita la carga con control, usando nuevamente la bisagra.'],
    ['Postura alta', 'Pasos controlados', 'Agarre firme'],
    'No inclines el tronco para compensar ni corras con una carga difícil de controlar.',
    'Respira de forma rítmica manteniendo presión abdominal.',
  ),
  cardio: guide(
    ['Ajuste', 'Configura la máquina o el espacio para adoptar una postura cómoda y estable.'],
    ['Ritmo', 'Comienza suave y aumenta la intensidad gradualmente sin perder la técnica.'],
    ['Salida', 'Reduce el ritmo durante uno o dos minutos antes de detenerte.'],
    ['Ritmo sostenible', 'Postura relajada', 'Progresión gradual'],
    'Detente ante mareo, dolor torácico o falta de aire fuera de lo habitual.',
    'Mantén una respiración rítmica acorde con la intensidad.',
  ),
  olympic: guide(
    ['Preparación', 'Coloca la barra cerca, estabiliza el tronco y define el agarre antes de despegar.'],
    ['Aceleración', 'Extiende piernas y cadera manteniendo la barra próxima al cuerpo.'],
    ['Recepción', 'Recibe la barra con pies firmes y articulaciones alineadas antes de incorporarte.'],
    ['Barra cerca', 'Potencia desde piernas', 'Recepción estable'],
    'Practica primero con técnica supervisada y carga ligera; no persigas velocidad con posiciones inestables.',
    'Toma aire y estabiliza antes del tirón; exhala tras asegurar la recepción.',
  ),
  mobility: guide(
    ['Posición', 'Adopta una base estable y coloca la articulación en un rango cómodo.'],
    ['Movimiento', 'Avanza lentamente hasta sentir tensión moderada, nunca dolor agudo.'],
    ['Regreso', 'Vuelve con control y repite sin rebotes ni compensaciones.'],
    ['Sin dolor', 'Respiración lenta', 'Rango progresivo'],
    'La movilidad no debe producir hormigueo, dolor punzante ni pérdida de fuerza.',
    'Respira lento y usa la exhalación para relajar tensión innecesaria.',
  ),
  'full-body': guide(
    ['Preparación', 'Organiza el espacio, estabiliza el tronco y ensaya el recorrido sin carga.'],
    ['Ejecución', 'Coordina piernas, cadera y brazos manteniendo el implemento bajo control.'],
    ['Reinicio', 'Completa cada repetición en una posición estable antes de comenzar la siguiente.'],
    ['Ritmo técnico', 'Tronco estable', 'Espacio despejado'],
    'Reduce velocidad o carga cuando la fatiga altere la coordinación.',
    'Exhala durante el esfuerzo y recupera una respiración estable entre repeticiones.',
  ),
};

export function getExerciseGuide(exercise: Exercise): ExerciseGuide {
  const pattern = movementPattern(exercise);
  return { pattern, ...COPY[pattern] };
}

export function movementPattern(exercise: Exercise): MovementPattern {
  const value = `${exercise.id} ${exercise.name}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (exercise.category === 'mobility' || value.includes('stretch') || value.includes('movilidad') || value.includes('foam')) return 'mobility';
  if (exercise.category === 'cardio') return 'cardio';
  if (exercise.category === 'olympic') return 'olympic';
  if (exercise.category === 'full-body') return value.includes('carry') || value.includes('transporte') ? 'carry' : 'full-body';
  if (exercise.category === 'chest') return value.includes('fly') || value.includes('apertura') || value.includes('cruce') || value.includes('pec-deck') ? 'fly' : 'horizontal-press';
  if (exercise.category === 'back') {
    if (value.includes('deadlift') || value.includes('peso muerto') || value.includes('rack-pull') || value.includes('extension lumbar')) return 'hinge';
    if (value.includes('row') || value.includes('remo')) return 'row';
    return 'vertical-pull';
  }
  if (exercise.category === 'shoulders') return value.includes('press') ? 'vertical-press' : value.includes('shrug') || value.includes('encogimiento') ? 'carry' : 'raise';
  if (exercise.category === 'biceps') return 'curl';
  if (exercise.category === 'triceps') return value.includes('press de banca') || value.includes('fondo') ? 'horizontal-press' : 'triceps';
  if (exercise.category === 'forearms') return value.includes('carry') || value.includes('paseo') ? 'carry' : 'curl';
  if (exercise.category === 'quadriceps') {
    if (value.includes('lunge') || value.includes('zancada') || value.includes('step-up') || value.includes('subida')) return 'lunge';
    if (value.includes('extension')) return 'leg-extension';
    return 'squat';
  }
  if (exercise.category === 'hamstrings') return value.includes('curl') || value.includes('glute-ham') ? 'leg-curl' : 'hinge';
  if (exercise.category === 'glutes') return value.includes('thrust') || value.includes('bridge') || value.includes('puente') || value.includes('frog') ? 'hip-thrust' : value.includes('kickback') || value.includes('patada') ? 'hip-isolation' : 'hinge';
  if (exercise.category === 'adductors-abductors') return value.includes('lunge') || value.includes('zancada') ? 'lunge' : 'hip-isolation';
  if (exercise.category === 'calves') return 'calf';
  if (exercise.category === 'core') {
    if (value.includes('plank') || value.includes('plancha') || value.includes('dead-bug') || value.includes('bird-dog') || value.includes('hollow')) return 'plank';
    if (value.includes('pallof') || value.includes('woodchop') || value.includes('giro') || value.includes('twist')) return 'core-rotation';
    return 'core-flexion';
  }
  if (exercise.measurement === 'duration') return 'cardio';
  if (exercise.isBodyweight) return 'full-body';
  return value.includes('press') ? 'horizontal-press' : value.includes('curl') ? 'curl' : value.includes('remo') || value.includes('row') ? 'row' : 'full-body';
}

function guide(
  first: [string, string],
  second: [string, string],
  third: [string, string],
  cues: string[],
  warning: string,
  breathing: string,
): Omit<ExerciseGuide, 'pattern'> {
  return { steps: [step(first), step(second), step(third)], cues, warning, breathing };
}

function step([title, description]: [string, string]) { return { title, description }; }
