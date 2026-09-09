import type { ExerciseGuidance } from './types';

/**
 * Reviewed Spanish guidance for the exact Free Exercise DB mappings.
 * Keeping it keyed by FORJA ID prevents a visually similar exercise from
 * inheriting instructions for another variation.
 */
export const FREE_EXERCISE_DB_GUIDANCE: Readonly<Record<string, ExerciseGuidance>> = {
  'machine-row': {
    description: 'Remo sentado en máquina de palancas, llevando los agarres al torso mientras se retraen las escápulas.',
    instructions: [
      'Carga un peso adecuado y ajusta el asiento para que los agarres queden a la altura del pecho.',
      'Sujeta los agarres con presa neutra o pronada y estabiliza el torso.',
      'Lleva los agarres hacia el torso mientras retraes las escápulas y flexionas los codos.',
      'Haz una pausa en la contracción y vuelve lentamente sin apoyar por completo la carga en los topes.',
    ],
    tips: ['Agarres frente al pecho', 'Inicia con las escápulas', 'Retorno controlado'],
  },
  'reverse-pec-deck': {
    description: 'Apertura inversa sentado en máquina para trabajar el deltoide posterior.',
    instructions: [
      'Ajusta el asiento para que los agarres queden a la altura de los hombros y selecciona una carga controlable.',
      'Sujeta los agarres con las palmas hacia dentro y mantén una ligera flexión de codos.',
      'Abre los brazos en semicírculo hacia los lados y atrás, moviendo desde los hombros.',
      'Pausa en la posición abierta y regresa lentamente.',
    ],
    tips: ['Codos ligeramente flexionados', 'Hombros lejos de las orejas', 'Sin impulso'],
  },
  'rope-triceps-pushdown': {
    description: 'Jalón de tríceps de pie con cuerda en polea alta, separando sus extremos al extender los codos.',
    instructions: [
      'Coloca una cuerda en la polea alta y sujétala con agarre neutro.',
      'Mantén el torso erguido, con una inclinación mínima, y los brazos pegados al cuerpo.',
      'Extiende los codos para llevar la cuerda hacia abajo y separa sus extremos junto a los muslos.',
      'Pausa con los brazos extendidos y devuelve lentamente la cuerda al inicio.',
    ],
    tips: ['Brazos inmóviles', 'Muñecas alineadas', 'Controla la subida'],
  },
  'cable-overhead-triceps-extension': {
    description: 'Extensión bilateral de tríceps de pie con cuerda conectada a una polea baja.',
    instructions: [
      'Conecta una cuerda a la polea baja y colócate de espaldas a la máquina.',
      'Lleva las manos sobre la cabeza con agarre neutro y los codos próximos a ella.',
      'Flexiona los codos para bajar lentamente la cuerda detrás de la cabeza.',
      'Extiende los codos contrayendo los tríceps y vuelve a la posición alta.',
    ],
    tips: ['Brazos superiores quietos', 'Costillas controladas', 'Codos orientados al frente'],
  },
  'reverse-wrist-curl': {
    description: 'Extensión de muñecas con barra y agarre pronado, con los antebrazos apoyados sobre un banco.',
    instructions: [
      'Arrodíllate frente a un banco y toma la barra con las palmas hacia abajo.',
      'Apoya completamente los antebrazos y deja las muñecas fuera del borde.',
      'Eleva la barra extendiendo las muñecas sin mover los antebrazos.',
      'Baja lentamente hasta recuperar el rango inicial.',
    ],
    tips: ['Antebrazos inmóviles', 'Carga ligera', 'Movimiento solo de muñecas'],
  },
  'step-up': {
    description: 'Subida unilateral a una superficie elevada sosteniendo una mancuerna en cada mano.',
    instructions: [
      'Ponte erguido con una mancuerna en cada mano y una superficie estable delante.',
      'Apoya por completo un pie sobre la superficie elevada.',
      'Impúlsate principalmente desde el talón y extiende la cadera y la rodilla hasta quedar arriba.',
      'Baja primero con la pierna contraria bajo control y completa la serie antes de cambiar de lado.',
    ],
    tips: ['Pie completo apoyado', 'Rodilla alineada', 'No te impulses con la pierna trasera'],
  },
  'standing-leg-curl': {
    description: 'Curl femoral unilateral en máquina de pie, con el torso ligeramente inclinado hacia delante.',
    instructions: [
      'Ajusta la máquina a tu altura y coloca el rodillo detrás de la parte baja de la pierna.',
      'Apoya la parte anterior del muslo, inclina el torso unos 30–45 grados y sujeta los agarres.',
      'Flexiona la rodilla sin separar el muslo del apoyo y acerca el talón hacia el glúteo.',
      'Pausa en la contracción, regresa lentamente y cambia de pierna al completar la serie.',
    ],
    tips: ['Muslo apoyado', 'Cadera estable', 'Retorno lento'],
  },
  'glute-ham-raise': {
    description: 'Elevación del tronco mediante flexión de rodillas en una máquina GHD.',
    instructions: [
      'Ajusta la máquina, fija los pies entre los rodillos y deja las rodillas justo detrás de la almohadilla.',
      'Desde la posición baja, forma una línea estable entre rodillas, cadera y hombros.',
      'Flexiona las rodillas mientras presionas los pies contra la plataforma hasta elevar el cuerpo.',
      'Desciende lentamente sin perder la alineación del tronco.',
    ],
    tips: ['Rodillas detrás del apoyo', 'Cuerpo alineado', 'Controla el descenso'],
  },
  'cable-pull-through': {
    description: 'Bisagra de cadera de pie y de espaldas a una polea baja, con la cuerda pasando entre las piernas.',
    instructions: [
      'Colócate unos pasos delante de la polea baja, de espaldas a ella, con el cable entre las piernas.',
      'Adopta una base amplia, mantén los brazos largos y flexiona ligeramente las rodillas.',
      'Lleva la cadera hacia atrás y deja que las manos pasen entre las piernas.',
      'Extiende la cadera hasta quedar erguido sin tirar de la cuerda con los hombros.',
    ],
    tips: ['Movimiento desde la cadera', 'Brazos largos', 'Espalda neutra'],
  },
  'reverse-hyperextension': {
    description: 'Extensión de cadera en máquina con el torso apoyado y las piernas suspendidas.',
    instructions: [
      'Ajusta una carga adecuada, coloca los pies entre los rodillos y apoya el torso sobre la almohadilla.',
      'Sujeta las asas y deja las caderas justo fuera del borde del apoyo.',
      'Extiende las caderas para llevar las piernas hacia atrás hasta alinearlas con el cuerpo.',
      'Detente antes de hiperextender la zona lumbar y regresa de forma controlada.',
    ],
    tips: ['Torso bien apoyado', 'Extensión desde la cadera', 'Sin elevar de más las piernas'],
  },
  'cable-hip-adduction': {
    description: 'Aducción unilateral de cadera de pie con polea baja y tobillera.',
    instructions: [
      'Colócate con la pierna de trabajo junto a la polea baja y fija la tobillera.',
      'Aléjate hasta tensar el cable, adopta una base amplia y sujétate si lo necesitas.',
      'Carga el peso sobre la pierna de apoyo y lleva la pierna con tobillera por delante de ella.',
      'Regresa lentamente, completa la serie y cambia de lado.',
    ],
    tips: ['Pelvis estable', 'Movimiento desde la cara interna del muslo', 'Sin balancear el torso'],
  },
  'leg-press-calf-raise': {
    description: 'Elevación de talones en prensa mediante flexión plantar, con las rodillas inmóviles.',
    instructions: [
      'Siéntate en la prensa y extiende las piernas sin bloquear las rodillas.',
      'Apoya los metatarsos en la parte inferior de la plataforma y deja los talones libres.',
      'Eleva los talones extendiendo los tobillos y pausa al contraer las pantorrillas.',
      'Baja lentamente hasta un estiramiento cómodo.',
    ],
    tips: ['Rodillas inmóviles', 'Pausa arriba', 'Descenso completo y lento'],
  },
  'cable-woodchop': {
    description: 'Leñador de pie en polea alta, llevando el agarre en diagonal hacia la rodilla contraria.',
    instructions: [
      'Coloca el agarre en la polea alta y sitúate de lado, aproximadamente a un brazo de distancia.',
      'Toma el agarre con ambas manos, separa los pies y mantén los brazos extendidos.',
      'Lleva el agarre hacia abajo y a través del cuerpo mientras rotas el torso y pivota el pie posterior.',
      'Regresa lentamente, completa la serie y repite hacia el otro lado.',
    ],
    tips: ['Cable tenso desde el inicio', 'Rota con el cuerpo', 'Regreso controlado'],
  },
  'sled-push': {
    description: 'Empuje dinámico de un trineo cargado mediante pasos cortos y extensión de caderas y rodillas.',
    instructions: [
      'Carga el trineo con un peso que permita mantener una marcha estable.',
      'Toma las asas con los brazos extendidos e inclina el cuerpo hacia delante.',
      'Mantén el tronco firme y avanza impulsando cada paso desde caderas y rodillas.',
      'Conserva una presión continua sobre el trineo durante todo el recorrido.',
    ],
    tips: ['Brazos extendidos', 'Pasos firmes', 'Carga que permita controlar la velocidad'],
  },
  'sled-pull': {
    description: 'Arrastre del trineo con cuerda, combinando pasos hacia atrás con tirones alternos hacia las costillas.',
    instructions: [
      'Conecta una cuerda resistente al trineo, aléjate hasta tensarla y adopta una base atlética de frente a la carga.',
      'Extiende un brazo hacia la cuerda mientras el otro termina el tirón junto a las costillas.',
      'Camina hacia atrás con pasos cortos y alterna las manos sin permitir que la cuerda pierda tensión.',
      'Mantén el tronco firme hasta que el trineo complete la distancia programada.',
    ],
    tips: ['Cuerda siempre tensa', 'Codos hacia las costillas', 'Pasos cortos y firmes'],
  },
  'power-clean': {
    description: 'Cargada de potencia desde el suelo con recepción de la barra sobre los hombros en sentadilla parcial.',
    instructions: [
      'Coloca la barra junto a las espinillas y toma un agarre justo por fuera de las piernas, con pecho alto y espalda neutra.',
      'Empuja el suelo y extiende las rodillas manteniendo el torso estable hasta superar las rodillas.',
      'Extiende rápidamente caderas, rodillas y tobillos manteniendo la barra cerca del cuerpo.',
      'Entra debajo de la barra, gira los codos y recíbela sobre hombros y clavículas en un cuarto de sentadilla.',
      'Ponte de pie y devuelve la barra al suelo bajo control.',
    ],
    tips: ['Barra cerca del cuerpo', 'Brazos largos hasta extenderte', 'Recepción firme'],
  },
  'power-snatch': {
    description: 'Arrancada de potencia desde el suelo con recepción de la barra sobre la cabeza en sentadilla parcial.',
    instructions: [
      'Coloca la barra junto a las espinillas, usa un agarre amplio y sitúa los hombros ligeramente delante de ella.',
      'Despega la barra manteniendo el ángulo del torso hasta superar las rodillas.',
      'Extiende explosivamente caderas, rodillas y tobillos con la barra próxima al cuerpo.',
      'Entra debajo de la barra y recíbela con los brazos bloqueados sobre la cabeza, por encima de paralelo.',
      'Termina de pie con la barra estable sobre la cabeza.',
    ],
    tips: ['Agarre amplio', 'Extensión completa', 'Recepción por encima de paralelo'],
  },
  'hang-power-snatch': {
    description: 'Arrancada de potencia iniciada desde hang y recibida sobre la cabeza por encima de paralelo.',
    instructions: [
      'Toma la barra con agarre amplio y colócala en el pliegue de la cadera o el muslo alto.',
      'Flexiona ligeramente rodillas y caderas con la espalda neutra y la barra pegada al cuerpo.',
      'Extiende con rapidez caderas, rodillas y tobillos; eleva los hombros después de completar la extensión.',
      'Entra debajo de la barra y recíbela con los brazos bloqueados y las caderas por encima de las rodillas.',
      'Ponte completamente de pie y baja la barra bajo control.',
    ],
    tips: ['Barra cerca del cuerpo', 'Extensión antes de entrar debajo', 'Recepción de potencia'],
  },
  'clean-pull': {
    description: 'Tirón olímpico desde el suelo con agarre de cargada, sin recibir la barra.',
    instructions: [
      'Coloca la barra junto a las espinillas y toma un agarre justo por fuera de las piernas.',
      'Empuja el suelo y extiende las rodillas manteniendo el ángulo del torso y los brazos largos.',
      'Al llegar al muslo medio, lleva la cadera hacia la barra y extiende con rapidez caderas, rodillas y tobillos.',
      'Termina alto dejando que el impulso eleve la barra, sin flexionar activamente los brazos ni recibirla.',
    ],
    tips: ['Barra rozando el cuerpo', 'Brazos como correas', 'Reinicia cada repetición'],
  },
  'snatch-pull': {
    description: 'Tirón de arrancada desde el suelo con agarre amplio, sin recepción sobre la cabeza.',
    instructions: [
      'Coloca la barra junto a las espinillas, usa agarre amplio y mantén la espalda neutra.',
      'Empuja el suelo y extiende las rodillas conservando el torso estable y los brazos rectos.',
      'Al llegar al muslo medio, extiende explosivamente caderas, rodillas y tobillos.',
      'Acaba erguido con una elevación natural de hombros, sin tirar con los brazos ni recibir la barra.',
    ],
    tips: ['Agarre amplio', 'Barra cerca', 'Prioriza velocidad y posición'],
  },
  'treadmill-walk': {
    description: 'Caminata cardiovascular en cinta con velocidad e inclinación regulables.',
    instructions: [
      'Sube con la cinta detenida y selecciona una velocidad inicial cómoda.',
      'Comienza despacio y aumenta hasta un paso moderado o rápido que puedas sostener.',
      'Camina erguido, con la mirada al frente y un movimiento natural de brazos.',
      'Reduce la velocidad antes de detener la cinta y bajar.',
    ],
    tips: ['No te cuelgues de las barandas', 'Zancada natural', 'Aumenta la inclinación gradualmente'],
  },
  stepmill: {
    description: 'Trabajo cardiovascular continuo en máquina de escalones mediante pasos alternos.',
    instructions: [
      'Sube con cuidado, adopta una postura alta y selecciona un nivel suave.',
      'Alterna los apoyos con un ritmo uniforme y pasos completos.',
      'Mantén el tronco estable y usa las barandas con ligereza para equilibrarte.',
      'Reduce el ritmo antes de detener la máquina y bajar.',
    ],
    tips: ['Las manos no sostienen tu peso', 'Cadencia controlable', 'Torso erguido'],
  },
  'worlds-greatest-stretch': {
    description: 'Secuencia de movilidad en zancada que combina apertura de cadera y rotación torácica.',
    instructions: [
      'Da una zancada larga y apoya ambas manos dentro del pie adelantado.',
      'Mantén la cadera baja y acerca el codo del lado de la pierna adelantada hacia el empeine.',
      'Gira el torso, junta las manos frente al pecho y lleva el codo contrario hacia la cara externa de la rodilla adelantada.',
      'Regresa con control, completa el tiempo previsto y repite al otro lado.',
    ],
    tips: ['Pie delantero completo', 'Pelvis estable', 'Rotación desde la espalda alta'],
  },
  'hamstring-stretch': {
    description: 'Estiramiento supino unilateral de isquiotibiales asistido con banda, cinturón o cuerda.',
    instructions: [
      'Túmbate boca arriba con una pierna extendida en el suelo.',
      'Pasa una banda por el pie de la otra pierna y eleva su cadera aproximadamente a 90 grados.',
      'Extiende progresivamente la rodilla y tira suavemente hasta notar tensión en pantorrilla e isquiotibiales.',
      'Mantén entre 10 y 30 segundos y cambia de lado.',
    ],
    tips: ['Pelvis apoyada', 'Sin rebotes', 'Cuello y hombros relajados'],
  },
  'band-external-rotation': {
    description: 'Rotación externa unilateral del hombro con banda anclada a la altura del codo.',
    instructions: [
      'Ancla la banda a la altura del codo y colócate de lado con el brazo de trabajo alejado del anclaje.',
      'Flexiona el codo a 90 grados, pégalo al costado y comienza con el antebrazo cruzando el abdomen.',
      'Gira el antebrazo hacia fuera sin separar el codo ni rotar el torso.',
      'Pausa en el rango controlado y vuelve lentamente.',
    ],
    tips: ['Codo pegado al cuerpo', 'Tensión ligera', 'Torso inmóvil'],
  },
  'foam-roll-quadriceps': {
    description: 'Automasaje unilateral del cuádriceps con rodillo de espuma.',
    instructions: [
      'Colócate boca abajo con el rodillo bajo un muslo y apoya manos o antebrazos.',
      'Usa la otra pierna para regular la presión y relaja el muslo tratado.',
      'Deslízate lentamente desde encima de la rodilla hasta debajo de la cadera.',
      'Detente de 10 a 30 segundos en puntos de tensión tolerable y cambia de lado.',
    ],
    tips: ['No ruedes sobre articulaciones', 'Presión tolerable', 'Movimiento lento'],
  },
  'foam-roll-upper-back': {
    description: 'Automasaje de espalda media y alta con rodillo, orientado a romboides y trapecio.',
    instructions: [
      'Túmbate boca arriba con el rodillo transversal bajo la espalda alta y los pies apoyados.',
      'Cruza los brazos para separar las escápulas y eleva ligeramente la cadera.',
      'Desplázate lentamente sobre la zona media y alta, inclinando el peso hacia un lado y luego al otro.',
      'Pausa de 10 a 30 segundos en puntos de tensión tolerable.',
    ],
    tips: ['Evita cuello y zona lumbar', 'Abdomen activo', 'Detente ante dolor punzante'],
  },
};
