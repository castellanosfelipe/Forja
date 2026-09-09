import type { ExerciseGuidance } from './types';

export const FORJA_GENERATED_GUIDANCE: Readonly<Record<string, ExerciseGuidance>> = {
  'bar-dip': {
    description: 'Fondo en barras paralelas con torso erguido para dar prioridad al tríceps.',
    instructions: [
      'Súbete a las paralelas y estabiliza los hombros lejos de las orejas con los brazos extendidos.',
      'Mantén el torso casi vertical y lleva los codos hacia atrás, próximos a las costillas.',
      'Desciende con control hasta aproximadamente 90 grados de flexión de codo o hasta tu rango cómodo.',
      'Empuja las barras y regresa arriba sin encoger los hombros ni bloquear los codos con violencia.',
    ],
    tips: ['Torso erguido', 'Codos cerca del cuerpo', 'Hombros abajo'],
  },
  'chest-dip': {
    description: 'Fondo en barras paralelas con inclinación hacia delante para enfatizar el pecho.',
    instructions: [
      'Súbete a las paralelas, estabiliza los hombros y cruza o flexiona suavemente las piernas detrás.',
      'Inclina el torso hacia delante y dirige el pecho entre las barras.',
      'Flexiona los codos con control hasta que el hombro alcance un rango cómodo, sin hundirse hacia las orejas.',
      'Empuja las barras manteniendo la inclinación hasta volver a la posición alta.',
    ],
    tips: ['Pecho hacia delante', 'Escápulas estables', 'Descenso sin dolor'],
  },
  'bayesian-cable-curl': {
    description: 'Curl unilateral con el brazo detrás del torso para cargar el bíceps en posición alargada.',
    instructions: [
      'Coloca la polea abajo, toma el asa y avanza de espaldas hasta que el cable quede tenso.',
      'Deja el brazo de trabajo ligeramente detrás del torso con el codo casi extendido.',
      'Flexiona el codo sin adelantar el hombro y acerca el asa al costado.',
      'Extiende de nuevo con control hasta recuperar el estiramiento inicial.',
    ],
    tips: ['Húmero detrás del torso', 'Hombro inmóvil', 'Extensión controlada'],
  },
  'sissy-squat': {
    description: 'Sentadilla de peso corporal que carga los cuádriceps manteniendo alineados torso y muslos.',
    instructions: [
      'Sujeta un apoyo estable solo para equilibrarte y coloca los pies juntos o a una anchura cómoda.',
      'Aprieta abdomen y glúteos, eleva los talones y deja que las rodillas avancen.',
      'Inclina el cuerpo hacia atrás como una sola línea desde las rodillas hasta los hombros.',
      'Extiende las rodillas para volver arriba sin convertir el movimiento en una sentadilla convencional.',
    ],
    tips: ['Apoyo solo para equilibrio', 'Cadera extendida', 'Rango sin dolor de rodilla'],
  },
  'slider-leg-curl': {
    description: 'Curl femoral en el suelo con talones sobre discos deslizantes.',
    instructions: [
      'Acuéstate boca arriba, apoya los talones sobre los deslizadores y eleva la cadera en puente.',
      'Desliza lentamente los talones hacia delante sin dejar que la pelvis caiga.',
      'Clava los talones y flexiona las rodillas para acercarlos de nuevo a los glúteos.',
      'Termina cada repetición con cadera extendida y costillas controladas.',
    ],
    tips: ['Cadera elevada', 'Talones activos', 'Extensión lenta'],
  },
  'machine-glute-kickback': {
    description: 'Extensión unilateral de cadera en máquina para trabajar principalmente el glúteo.',
    instructions: [
      'Ajusta el apoyo y la plataforma para que la cadera quede alineada con el eje de la máquina.',
      'Apoya el torso, sujeta las asas y estabiliza la pelvis antes de empujar.',
      'Lleva la pierna hacia atrás extendiendo la cadera, sin arquear la zona lumbar.',
      'Regresa con control hasta mantener tensión y repite antes de cambiar de lado.',
    ],
    tips: ['Pelvis de frente', 'Impulso desde la cadera', 'Lumbar neutra'],
  },
  'frog-pump': {
    description: 'Extensión de cadera en el suelo con plantas juntas y rodillas abiertas.',
    instructions: [
      'Acuéstate boca arriba, junta las plantas de los pies y deja caer las rodillas hacia los lados.',
      'Acerca los talones a la cadera y lleva ligeramente la pelvis hacia atrás.',
      'Empuja los bordes externos de los pies y eleva la cadera contrayendo los glúteos.',
      'Baja de forma controlada sin cerrar las rodillas y repite.',
    ],
    tips: ['Plantas juntas', 'Rodillas abiertas', 'Sin hiperextender la espalda'],
  },
  'cable-hip-abduction': {
    description: 'Separación lateral de la pierna con polea baja y pelvis estable.',
    instructions: [
      'Coloca una tobillera en la pierna alejada de la polea y apóyate suavemente con la mano.',
      'Estabiliza abdomen y pelvis con la pierna de apoyo ligeramente flexionada.',
      'Separa la pierna de trabajo hacia el lado sin girar los dedos ni inclinar el tronco.',
      'Regresa lentamente hasta que el cable conserve tensión y completa el otro lado.',
    ],
    tips: ['Pelvis quieta', 'Recorrido lateral', 'Sin balanceo'],
  },
  'copenhagen-plank': {
    description: 'Plancha lateral con la pierna superior apoyada para fortalecer aductores y tronco.',
    instructions: [
      'Colócate de lado con el codo bajo el hombro y apoya el pie o la rodilla superior en un banco.',
      'Activa el abdomen y eleva la cadera hasta formar una línea recta con el cuerpo.',
      'Acerca la pierna inferior a la superior o mantenla suspendida sin perder la alineación.',
      'Sostén respirando con control y baja la cadera antes de cambiar de lado.',
    ],
    tips: ['Codo bajo el hombro', 'Cadera alta', 'Empieza apoyando la rodilla'],
  },
  'tibialis-raise': {
    description: 'Dorsiflexión de tobillo contra la gravedad para fortalecer el tibial anterior.',
    instructions: [
      'Apoya la espalda en una pared y adelanta los pies manteniendo ambos talones en el suelo.',
      'Eleva los dedos y la parte delantera de los pies tanto como puedas sin mover las rodillas.',
      'Haz una pausa breve arriba sintiendo la parte frontal de las espinillas.',
      'Baja el antepié con control sin despegar los talones.',
    ],
    tips: ['Talones pegados', 'Dedos hacia arriba', 'Sin rebotes'],
  },
  'weighted-sit-up': {
    description: 'Incorporación completa con una carga sostenida de forma segura contra el pecho.',
    instructions: [
      'Acuéstate con rodillas flexionadas, pies apoyados y el disco sujeto contra el pecho.',
      'Activa el abdomen y comienza a despegar la espalda del suelo sin tirar del cuello.',
      'Eleva el torso hacia los muslos manteniendo la carga pegada al cuerpo.',
      'Desciende vértebra a vértebra con control hasta apoyar de nuevo la espalda.',
    ],
    tips: ['Disco contra el pecho', 'Pies estables', 'Descenso lento'],
  },
  'dumbbell-thruster': {
    description: 'Sentadilla frontal enlazada con un press sobre la cabeza usando dos mancuernas.',
    instructions: [
      'Sostén las mancuernas a la altura de los hombros y coloca los pies en tu base de sentadilla.',
      'Desciende flexionando cadera y rodillas con el tronco firme y los pies completos en el suelo.',
      'Impulsa el suelo y usa la extensión de piernas y cadera para iniciar el press.',
      'Termina con las mancuernas estables sobre la cabeza y vuelve a los hombros antes de repetir.',
    ],
    tips: ['Mancuernas en hombros', 'Impulso de piernas', 'Final estable'],
  },
  'devils-press': {
    description: 'Movimiento de cuerpo completo que combina burpee con elevación de dos mancuernas.',
    instructions: [
      'Coloca dos mancuernas estables en el suelo, apoya las manos y lleva los pies atrás.',
      'Completa una flexión o baja el pecho con control y vuelve a acercar los pies.',
      'Desde una bisagra de cadera, impulsa las mancuernas entre las piernas y luego hacia arriba.',
      'Extiende cadera, rodillas y brazos hasta estabilizarlas sobre la cabeza antes de bajar.',
    ],
    tips: ['Mancuernas firmes', 'Espalda neutra en la bisagra', 'Control sobre la cabeza'],
  },
  'sandbag-carry': {
    description: 'Transporte de un saco abrazado al torso con postura y marcha controladas.',
    instructions: [
      'Acércate al saco, baja con una bisagra estable y abrázalo antes de levantarlo.',
      'Extiende piernas y cadera para llevarlo al regazo o directamente contra el torso.',
      'Ponte erguido, activa el abdomen y camina con pasos cortos y mirada al frente.',
      'Detente por completo y deposita el saco invirtiendo el levantamiento.',
    ],
    tips: ['Carga cerca del cuerpo', 'Pasos cortos', 'Gira con los pies'],
  },
  'high-pull': {
    description: 'Tirón explosivo de barra hasta la parte alta del torso sin recibirla sobre los hombros.',
    instructions: [
      'Sujeta la barra a la anchura adecuada y colócala cerca de los muslos con una ligera bisagra.',
      'Extiende con potencia tobillos, rodillas y cadera manteniendo la barra próxima al cuerpo.',
      'Guía la barra hacia arriba con los codos altos y hacia fuera, por encima de las manos.',
      'Detén el ascenso cerca del pecho y baja con control; no recibas ni presiones la barra.',
    ],
    tips: ['Potencia desde la cadera', 'Barra cerca', 'Sin recepción'],
  },
  'ski-erg': {
    description: 'Trabajo cardiovascular en SkiErg mediante un tirón coordinado de brazos, tronco y cadera.',
    instructions: [
      'Toma ambas asas con los brazos altos, postura erguida y una ligera flexión de rodillas.',
      'Inicia el tirón bajando los brazos y llevando la cadera hacia atrás en una bisagra.',
      'Termina con las asas junto a los muslos, abdomen activo y espalda neutra.',
      'Regresa de forma fluida a la posición alta y enlaza la siguiente repetición.',
    ],
    tips: ['Cuerdas tensas', 'Bisagra de cadera', 'Ritmo sostenible'],
  },
  'heavy-bag': {
    description: 'Trabajo de boxeo en saco pesado con guardia, alineación de muñeca y rotación corporal.',
    instructions: [
      'Adopta una base equilibrada, protege el rostro con ambas manos y recoge el mentón.',
      'Lanza el golpe desde el suelo, girando suavemente el pie trasero y la cadera.',
      'Contacta con la muñeca recta y el antebrazo alineado, sin bloquear el codo.',
      'Devuelve la mano inmediatamente a la guardia y recupera la base antes del siguiente golpe.',
    ],
    tips: ['Muñeca alineada', 'Mano libre en guardia', 'Precisión antes que potencia'],
  },
  'thoracic-extension-foam-roller': {
    description: 'Movilidad de extensión torácica con el rodillo situado bajo la espalda alta.',
    instructions: [
      'Acuéstate con rodillas flexionadas y coloca el rodillo perpendicular bajo los omóplatos.',
      'Sostén la cabeza con las manos, mantén la cadera apoyada y controla las costillas.',
      'Extiende suavemente la parte alta de la espalda sobre el rodillo sin arquear la zona lumbar.',
      'Vuelve a neutro y cambia ligeramente la posición del rodillo si deseas trabajar otro segmento.',
    ],
    tips: ['Rodillo en espalda alta', 'Cadera apoyada', 'Cuello relajado'],
  },
  'shoulder-dislocate-band': {
    description: 'Paso de banda con agarre ancho para explorar la movilidad del hombro sin dolor.',
    instructions: [
      'Sujeta una banda muy ancha delante de los muslos con los codos completamente extendidos.',
      'Eleva ambos brazos en arco hasta pasar sobre la cabeza sin encoger los hombros.',
      'Continúa hacia atrás solo hasta el rango cómodo, manteniendo la tensión y los codos rectos.',
      'Invierte el recorrido para volver delante; amplía el agarre si necesitas doblar los codos.',
    ],
    tips: ['Agarre amplio', 'Codos rectos', 'Nunca atravieses dolor'],
  },
  'ankle-dorsiflexion-mobility': {
    description: 'Movilidad de tobillo llevando la rodilla a la pared sin despegar el talón.',
    instructions: [
      'Coloca el pie de trabajo plano, con los dedos a pocos centímetros de una pared.',
      'Dirige la rodilla hacia delante sobre el segundo dedo hasta tocar suavemente la pared.',
      'Mantén toda la planta y especialmente el talón pegados al suelo durante el recorrido.',
      'Regresa y repite; aumenta la distancia solo si puedes seguir tocando sin elevar el talón.',
    ],
    tips: ['Talón siempre apoyado', 'Rodilla sobre los dedos', 'Pie sin colapsar'],
  },
};
