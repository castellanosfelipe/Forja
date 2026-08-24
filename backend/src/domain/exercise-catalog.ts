import type { Exercise } from './models.js';

interface ExerciseOptions {
  secondary?: string[];
  bodyweight?: boolean;
  perSide?: boolean;
  duration?: boolean;
}

function exercise(
  id: string,
  name: string,
  category: string,
  equipment: string[],
  primary: string[],
  options: ExerciseOptions = {},
): Exercise {
  return {
    id,
    name,
    category,
    equipment,
    measurement: options.duration ? 'duration' : 'repetitions',
    isBodyweight: options.bodyweight ?? false,
    isPerSide: options.perSide ?? false,
    muscles: { primary, secondary: options.secondary ?? [] },
  };
}

const e = exercise;

/**
 * Catálogo base de movimientos habituales en gimnasios comerciales, boxes y salas de peso libre.
 * Los IDs son estables porque también se usan en planes, sesiones y reglas de progresión.
 */
export const GYM_EXERCISE_CATALOG: Exercise[] = [
  // Pecho
  e('bench-press', 'Press de banca con barra', 'chest', ['barra', 'banco'], ['pectoralis-major'], { secondary: ['triceps', 'anterior-deltoid'] }),
  e('incline-bench-press', 'Press inclinado con barra', 'chest', ['barra', 'banco inclinado'], ['pectoralis-major'], { secondary: ['anterior-deltoid', 'triceps'] }),
  e('decline-bench-press', 'Press declinado con barra', 'chest', ['barra', 'banco declinado'], ['pectoralis-major'], { secondary: ['triceps'] }),
  e('dumbbell-bench-press', 'Press de banca con mancuernas', 'chest', ['mancuernas', 'banco'], ['pectoralis-major'], { secondary: ['triceps', 'anterior-deltoid'] }),
  e('incline-dumbbell-press', 'Press inclinado con mancuernas', 'chest', ['mancuernas', 'banco inclinado'], ['pectoralis-major'], { secondary: ['anterior-deltoid', 'triceps'] }),
  e('dumbbell-floor-press', 'Press en el suelo con mancuernas', 'chest', ['mancuernas'], ['pectoralis-major'], { secondary: ['triceps'] }),
  e('chest-press-machine', 'Press de pecho en máquina', 'chest', ['máquina'], ['pectoralis-major'], { secondary: ['triceps', 'anterior-deltoid'] }),
  e('cable-chest-press', 'Press de pecho en polea', 'chest', ['polea'], ['pectoralis-major'], { secondary: ['triceps', 'serratus-anterior'] }),
  e('dumbbell-fly', 'Aperturas con mancuernas', 'chest', ['mancuernas', 'banco'], ['pectoralis-major'], { secondary: ['anterior-deltoid'] }),
  e('incline-dumbbell-fly', 'Aperturas inclinadas con mancuernas', 'chest', ['mancuernas', 'banco inclinado'], ['pectoralis-major'], { secondary: ['anterior-deltoid'] }),
  e('cable-fly', 'Cruce de poleas', 'chest', ['polea'], ['pectoralis-major'], { secondary: ['anterior-deltoid'] }),
  e('pec-deck', 'Aperturas en contractor de pecho', 'chest', ['máquina'], ['pectoralis-major'], { secondary: ['anterior-deltoid'] }),
  e('push-up', 'Flexiones', 'chest', [], ['pectoralis-major'], { bodyweight: true, secondary: ['triceps', 'anterior-deltoid', 'abdominals'] }),
  e('incline-push-up', 'Flexiones inclinadas', 'chest', ['banco'], ['pectoralis-major'], { bodyweight: true, secondary: ['triceps'] }),
  e('decline-push-up', 'Flexiones declinadas', 'chest', ['banco'], ['pectoralis-major'], { bodyweight: true, secondary: ['triceps', 'anterior-deltoid'] }),
  e('chest-dip', 'Fondos para pecho', 'chest', ['paralelas'], ['pectoralis-major'], { bodyweight: true, secondary: ['triceps', 'anterior-deltoid'] }),

  // Espalda
  e('conventional-deadlift', 'Peso muerto convencional', 'back', ['barra', 'discos'], ['erector-spinae', 'gluteus-maximus'], { secondary: ['hamstrings', 'latissimus-dorsi', 'trapezius', 'forearms'] }),
  e('rack-pull', 'Rack pull', 'back', ['barra', 'rack'], ['erector-spinae', 'trapezius'], { secondary: ['gluteus-maximus', 'latissimus-dorsi', 'forearms'] }),
  e('barbell-row', 'Remo con barra', 'back', ['barra'], ['latissimus-dorsi', 'rhomboids'], { secondary: ['posterior-deltoid', 'biceps', 'erector-spinae'] }),
  e('pendlay-row', 'Remo Pendlay', 'back', ['barra'], ['latissimus-dorsi', 'rhomboids'], { secondary: ['posterior-deltoid', 'biceps', 'erector-spinae'] }),
  e('t-bar-row', 'Remo en barra T', 'back', ['barra T'], ['latissimus-dorsi', 'rhomboids'], { secondary: ['posterior-deltoid', 'biceps'] }),
  e('single-arm-dumbbell-row', 'Remo unilateral con mancuerna', 'back', ['mancuerna', 'banco'], ['latissimus-dorsi'], { perSide: true, secondary: ['rhomboids', 'posterior-deltoid', 'biceps'] }),
  e('chest-supported-dumbbell-row', 'Remo con pecho apoyado', 'back', ['mancuernas', 'banco inclinado'], ['rhomboids', 'latissimus-dorsi'], { secondary: ['posterior-deltoid', 'biceps'] }),
  e('seated-cable-row', 'Remo sentado en polea', 'back', ['polea'], ['latissimus-dorsi', 'rhomboids'], { secondary: ['biceps', 'posterior-deltoid'] }),
  e('wide-grip-cable-row', 'Remo abierto en polea', 'back', ['polea'], ['rhomboids', 'posterior-deltoid'], { secondary: ['latissimus-dorsi', 'biceps'] }),
  e('machine-row', 'Remo en máquina', 'back', ['máquina'], ['latissimus-dorsi', 'rhomboids'], { secondary: ['biceps', 'posterior-deltoid'] }),
  e('pull-up', 'Dominada pronada', 'back', ['barra de dominadas'], ['latissimus-dorsi'], { bodyweight: true, secondary: ['biceps', 'rhomboids', 'posterior-deltoid'] }),
  e('chin-up', 'Dominada supina', 'back', ['barra de dominadas'], ['latissimus-dorsi', 'biceps'], { bodyweight: true, secondary: ['rhomboids'] }),
  e('neutral-grip-pull-up', 'Dominada con agarre neutro', 'back', ['barra de dominadas'], ['latissimus-dorsi'], { bodyweight: true, secondary: ['biceps', 'rhomboids'] }),
  e('assisted-pull-up', 'Dominada asistida', 'back', ['máquina asistida'], ['latissimus-dorsi'], { secondary: ['biceps', 'rhomboids'] }),
  e('lat-pulldown', 'Jalón al pecho', 'back', ['polea'], ['latissimus-dorsi'], { secondary: ['biceps', 'rhomboids'] }),
  e('neutral-grip-lat-pulldown', 'Jalón neutro al pecho', 'back', ['polea'], ['latissimus-dorsi'], { secondary: ['biceps'] }),
  e('single-arm-lat-pulldown', 'Jalón unilateral', 'back', ['polea'], ['latissimus-dorsi'], { perSide: true, secondary: ['biceps'] }),
  e('straight-arm-pulldown', 'Jalón con brazos rectos', 'back', ['polea'], ['latissimus-dorsi'], { secondary: ['triceps', 'abdominals'] }),
  e('dumbbell-pullover', 'Pullover con mancuerna', 'back', ['mancuerna', 'banco'], ['latissimus-dorsi'], { secondary: ['pectoralis-major', 'triceps'] }),
  e('back-extension', 'Extensión lumbar', 'back', ['banco romano'], ['erector-spinae'], { bodyweight: true, secondary: ['gluteus-maximus', 'hamstrings'] }),

  // Hombros
  e('overhead-press', 'Press militar con barra', 'shoulders', ['barra', 'rack'], ['anterior-deltoid'], { secondary: ['lateral-deltoid', 'triceps', 'trapezius'] }),
  e('seated-barbell-press', 'Press militar sentado con barra', 'shoulders', ['barra', 'banco'], ['anterior-deltoid'], { secondary: ['lateral-deltoid', 'triceps'] }),
  e('dumbbell-shoulder-press', 'Press de hombros con mancuernas', 'shoulders', ['mancuernas', 'banco'], ['anterior-deltoid'], { secondary: ['lateral-deltoid', 'triceps'] }),
  e('arnold-press', 'Press Arnold', 'shoulders', ['mancuernas', 'banco'], ['anterior-deltoid', 'lateral-deltoid'], { secondary: ['triceps'] }),
  e('machine-shoulder-press', 'Press de hombros en máquina', 'shoulders', ['máquina'], ['anterior-deltoid'], { secondary: ['lateral-deltoid', 'triceps'] }),
  e('landmine-press', 'Press landmine unilateral', 'shoulders', ['barra', 'landmine'], ['anterior-deltoid'], { perSide: true, secondary: ['pectoralis-major', 'triceps', 'serratus-anterior'] }),
  e('dumbbell-lateral-raise', 'Elevaciones laterales con mancuernas', 'shoulders', ['mancuernas'], ['lateral-deltoid'], { secondary: ['trapezius'] }),
  e('cable-lateral-raise', 'Elevación lateral en polea', 'shoulders', ['polea'], ['lateral-deltoid'], { perSide: true, secondary: ['trapezius'] }),
  e('machine-lateral-raise', 'Elevación lateral en máquina', 'shoulders', ['máquina'], ['lateral-deltoid'], { secondary: ['trapezius'] }),
  e('dumbbell-front-raise', 'Elevación frontal con mancuernas', 'shoulders', ['mancuernas'], ['anterior-deltoid'], { secondary: ['pectoralis-major'] }),
  e('rear-delt-fly', 'Pájaros con mancuernas', 'shoulders', ['mancuernas'], ['posterior-deltoid'], { secondary: ['rhomboids', 'trapezius'] }),
  e('reverse-pec-deck', 'Pájaros en máquina', 'shoulders', ['máquina'], ['posterior-deltoid'], { secondary: ['rhomboids', 'trapezius'] }),
  e('face-pull', 'Face pull', 'shoulders', ['polea', 'cuerda'], ['posterior-deltoid'], { secondary: ['rhomboids', 'trapezius', 'rotator-cuff'] }),
  e('barbell-upright-row', 'Remo al mentón con barra', 'shoulders', ['barra'], ['lateral-deltoid', 'trapezius'], { secondary: ['biceps'] }),
  e('dumbbell-shrug', 'Encogimientos con mancuernas', 'shoulders', ['mancuernas'], ['trapezius'], { secondary: ['forearms'] }),
  e('barbell-shrug', 'Encogimientos con barra', 'shoulders', ['barra'], ['trapezius'], { secondary: ['forearms'] }),

  // Bíceps
  e('barbell-curl', 'Curl de bíceps con barra', 'biceps', ['barra'], ['biceps'], { secondary: ['forearms'] }),
  e('ez-bar-curl', 'Curl con barra Z', 'biceps', ['barra Z'], ['biceps'], { secondary: ['forearms'] }),
  e('dumbbell-curl', 'Curl alterno con mancuernas', 'biceps', ['mancuernas'], ['biceps'], { perSide: true, secondary: ['forearms'] }),
  e('hammer-curl', 'Curl martillo', 'biceps', ['mancuernas'], ['biceps', 'brachialis'], { perSide: true, secondary: ['forearms'] }),
  e('incline-dumbbell-curl', 'Curl inclinado con mancuernas', 'biceps', ['mancuernas', 'banco inclinado'], ['biceps'], { perSide: true, secondary: ['forearms'] }),
  e('preacher-curl', 'Curl predicador', 'biceps', ['barra Z', 'banco predicador'], ['biceps'], { secondary: ['forearms'] }),
  e('cable-curl', 'Curl de bíceps en polea', 'biceps', ['polea'], ['biceps'], { secondary: ['forearms'] }),
  e('bayesian-cable-curl', 'Curl bayesiano en polea', 'biceps', ['polea'], ['biceps'], { perSide: true, secondary: ['forearms'] }),
  e('concentration-curl', 'Curl concentrado', 'biceps', ['mancuerna', 'banco'], ['biceps'], { perSide: true, secondary: ['forearms'] }),
  e('machine-biceps-curl', 'Curl de bíceps en máquina', 'biceps', ['máquina'], ['biceps'], { secondary: ['forearms'] }),

  // Tríceps
  e('close-grip-bench-press', 'Press de banca con agarre cerrado', 'triceps', ['barra', 'banco'], ['triceps'], { secondary: ['pectoralis-major', 'anterior-deltoid'] }),
  e('bar-dip', 'Fondos en paralelas', 'triceps', ['paralelas'], ['triceps'], { bodyweight: true, secondary: ['pectoralis-major', 'anterior-deltoid'] }),
  e('assisted-dip', 'Fondos asistidos', 'triceps', ['máquina asistida'], ['triceps'], { secondary: ['pectoralis-major'] }),
  e('skull-crusher', 'Press francés tumbado', 'triceps', ['barra Z', 'banco'], ['triceps']),
  e('dumbbell-overhead-triceps-extension', 'Extensión de tríceps sobre la cabeza', 'triceps', ['mancuerna'], ['triceps']),
  e('cable-triceps-pushdown', 'Jalón de tríceps con barra', 'triceps', ['polea'], ['triceps']),
  e('rope-triceps-pushdown', 'Jalón de tríceps con cuerda', 'triceps', ['polea', 'cuerda'], ['triceps']),
  e('single-arm-triceps-pushdown', 'Jalón unilateral de tríceps', 'triceps', ['polea'], ['triceps'], { perSide: true }),
  e('cable-overhead-triceps-extension', 'Extensión de tríceps sobre cabeza en polea', 'triceps', ['polea', 'cuerda'], ['triceps']),
  e('dumbbell-kickback', 'Patada de tríceps', 'triceps', ['mancuerna', 'banco'], ['triceps'], { perSide: true }),

  // Antebrazos y agarre
  e('barbell-wrist-curl', 'Curl de muñeca con barra', 'forearms', ['barra', 'banco'], ['forearms']),
  e('reverse-wrist-curl', 'Curl inverso de muñeca', 'forearms', ['barra', 'banco'], ['forearms']),
  e('reverse-barbell-curl', 'Curl inverso con barra', 'forearms', ['barra'], ['forearms', 'brachialis'], { secondary: ['biceps'] }),
  e('farmer-carry', 'Paseo del granjero', 'forearms', ['mancuernas'], ['forearms', 'trapezius'], { duration: true, secondary: ['abdominals', 'gluteus-maximus'] }),
  e('suitcase-carry', 'Paseo unilateral tipo maleta', 'forearms', ['mancuerna'], ['forearms', 'obliques'], { perSide: true, duration: true, secondary: ['trapezius'] }),
  e('plate-pinch', 'Pinza con discos', 'forearms', ['discos'], ['forearms'], { duration: true }),
  e('dead-hang', 'Suspensión pasiva en barra', 'forearms', ['barra de dominadas'], ['forearms'], { bodyweight: true, duration: true, secondary: ['latissimus-dorsi'] }),

  // Cuádriceps
  e('back-squat', 'Sentadilla trasera', 'quadriceps', ['barra', 'rack'], ['quadriceps', 'gluteus-maximus'], { secondary: ['hamstrings', 'adductors', 'erector-spinae', 'abdominals'] }),
  e('front-squat', 'Sentadilla frontal', 'quadriceps', ['barra', 'rack'], ['quadriceps'], { secondary: ['gluteus-maximus', 'erector-spinae', 'abdominals'] }),
  e('goblet-squat', 'Sentadilla goblet', 'quadriceps', ['mancuerna'], ['quadriceps', 'gluteus-maximus'], { secondary: ['adductors', 'abdominals'] }),
  e('hack-squat', 'Sentadilla hack', 'quadriceps', ['máquina'], ['quadriceps'], { secondary: ['gluteus-maximus', 'adductors'] }),
  e('smith-machine-squat', 'Sentadilla en multipower', 'quadriceps', ['multipower'], ['quadriceps', 'gluteus-maximus'], { secondary: ['adductors'] }),
  e('leg-press', 'Prensa de piernas', 'quadriceps', ['máquina'], ['quadriceps', 'gluteus-maximus'], { secondary: ['hamstrings', 'adductors'] }),
  e('leg-extension', 'Extensión de cuádriceps', 'quadriceps', ['máquina'], ['quadriceps']),
  e('bulgarian-split-squat', 'Sentadilla búlgara', 'quadriceps', ['mancuernas', 'banco'], ['quadriceps', 'gluteus-maximus'], { perSide: true, secondary: ['hamstrings', 'adductors'] }),
  e('forward-lunge', 'Zancada hacia delante', 'quadriceps', ['mancuernas'], ['quadriceps', 'gluteus-maximus'], { perSide: true, secondary: ['hamstrings', 'adductors'] }),
  e('reverse-lunge', 'Zancada inversa', 'quadriceps', ['mancuernas'], ['quadriceps', 'gluteus-maximus'], { perSide: true, secondary: ['hamstrings'] }),
  e('walking-lunge', 'Zancadas caminando', 'quadriceps', ['mancuernas'], ['quadriceps', 'gluteus-maximus'], { perSide: true, secondary: ['hamstrings', 'adductors'] }),
  e('step-up', 'Subida al banco', 'quadriceps', ['mancuernas', 'cajón'], ['quadriceps', 'gluteus-maximus'], { perSide: true, secondary: ['hamstrings'] }),
  e('sissy-squat', 'Sentadilla sissy', 'quadriceps', [], ['quadriceps'], { bodyweight: true }),
  e('wall-sit', 'Sentadilla isométrica en pared', 'quadriceps', [], ['quadriceps'], { bodyweight: true, duration: true, secondary: ['gluteus-maximus'] }),

  // Isquiotibiales
  e('romanian-deadlift', 'Peso muerto rumano con barra', 'hamstrings', ['barra'], ['hamstrings', 'gluteus-maximus'], { secondary: ['erector-spinae', 'forearms'] }),
  e('dumbbell-romanian-deadlift', 'Peso muerto rumano con mancuernas', 'hamstrings', ['mancuernas'], ['hamstrings', 'gluteus-maximus'], { secondary: ['erector-spinae'] }),
  e('single-leg-romanian-deadlift', 'Peso muerto rumano unilateral', 'hamstrings', ['mancuerna'], ['hamstrings', 'gluteus-maximus'], { perSide: true, secondary: ['erector-spinae', 'abdominals'] }),
  e('stiff-leg-deadlift', 'Peso muerto con piernas rígidas', 'hamstrings', ['barra'], ['hamstrings'], { secondary: ['gluteus-maximus', 'erector-spinae'] }),
  e('good-morning', 'Buenos días con barra', 'hamstrings', ['barra', 'rack'], ['hamstrings', 'erector-spinae'], { secondary: ['gluteus-maximus'] }),
  e('lying-leg-curl', 'Curl femoral tumbado', 'hamstrings', ['máquina'], ['hamstrings']),
  e('seated-leg-curl', 'Curl femoral sentado', 'hamstrings', ['máquina'], ['hamstrings']),
  e('standing-leg-curl', 'Curl femoral de pie', 'hamstrings', ['máquina'], ['hamstrings'], { perSide: true }),
  e('nordic-curl', 'Curl nórdico', 'hamstrings', ['anclaje'], ['hamstrings'], { bodyweight: true, secondary: ['gluteus-maximus'] }),
  e('glute-ham-raise', 'Glute ham raise', 'hamstrings', ['máquina GHD'], ['hamstrings'], { bodyweight: true, secondary: ['gluteus-maximus', 'erector-spinae'] }),
  e('slider-leg-curl', 'Curl femoral deslizante', 'hamstrings', ['discos deslizantes'], ['hamstrings'], { bodyweight: true, secondary: ['gluteus-maximus'] }),

  // Glúteos
  e('barbell-hip-thrust', 'Hip thrust con barra', 'glutes', ['barra', 'banco'], ['gluteus-maximus'], { secondary: ['hamstrings', 'quadriceps'] }),
  e('machine-hip-thrust', 'Hip thrust en máquina', 'glutes', ['máquina'], ['gluteus-maximus'], { secondary: ['hamstrings'] }),
  e('glute-bridge', 'Puente de glúteos', 'glutes', [], ['gluteus-maximus'], { bodyweight: true, secondary: ['hamstrings'] }),
  e('barbell-glute-bridge', 'Puente de glúteos con barra', 'glutes', ['barra'], ['gluteus-maximus'], { secondary: ['hamstrings'] }),
  e('single-leg-glute-bridge', 'Puente de glúteos unilateral', 'glutes', [], ['gluteus-maximus'], { bodyweight: true, perSide: true, secondary: ['hamstrings'] }),
  e('cable-pull-through', 'Pull through en polea', 'glutes', ['polea', 'cuerda'], ['gluteus-maximus'], { secondary: ['hamstrings', 'erector-spinae'] }),
  e('cable-kickback', 'Patada de glúteo en polea', 'glutes', ['polea', 'tobillera'], ['gluteus-maximus'], { perSide: true, secondary: ['hamstrings'] }),
  e('machine-glute-kickback', 'Patada de glúteo en máquina', 'glutes', ['máquina'], ['gluteus-maximus'], { perSide: true, secondary: ['hamstrings'] }),
  e('frog-pump', 'Frog pump', 'glutes', [], ['gluteus-maximus'], { bodyweight: true }),
  e('reverse-hyperextension', 'Hiperextensión inversa', 'glutes', ['máquina'], ['gluteus-maximus'], { secondary: ['hamstrings', 'erector-spinae'] }),
  e('kettlebell-swing', 'Swing con kettlebell', 'glutes', ['kettlebell'], ['gluteus-maximus', 'hamstrings'], { secondary: ['erector-spinae', 'abdominals', 'forearms'] }),

  // Aductores y abductores
  e('hip-abduction-machine', 'Abducción de cadera en máquina', 'adductors-abductors', ['máquina'], ['abductors', 'gluteus-medius']),
  e('hip-adduction-machine', 'Aducción de cadera en máquina', 'adductors-abductors', ['máquina'], ['adductors']),
  e('cable-hip-abduction', 'Abducción de cadera en polea', 'adductors-abductors', ['polea', 'tobillera'], ['abductors', 'gluteus-medius'], { perSide: true }),
  e('cable-hip-adduction', 'Aducción de cadera en polea', 'adductors-abductors', ['polea', 'tobillera'], ['adductors'], { perSide: true }),
  e('band-lateral-walk', 'Caminata lateral con banda', 'adductors-abductors', ['banda'], ['abductors', 'gluteus-medius'], { perSide: true }),
  e('copenhagen-plank', 'Plancha Copenhagen', 'adductors-abductors', ['banco'], ['adductors', 'obliques'], { bodyweight: true, perSide: true, duration: true }),
  e('lateral-lunge', 'Zancada lateral', 'adductors-abductors', ['mancuernas'], ['adductors', 'quadriceps'], { perSide: true, secondary: ['gluteus-maximus'] }),

  // Pantorrillas
  e('standing-calf-raise', 'Elevación de talones de pie', 'calves', ['máquina'], ['calves']),
  e('seated-calf-raise', 'Elevación de talones sentado', 'calves', ['máquina'], ['calves']),
  e('leg-press-calf-raise', 'Elevación de talones en prensa', 'calves', ['prensa'], ['calves']),
  e('smith-calf-raise', 'Elevación de talones en multipower', 'calves', ['multipower'], ['calves']),
  e('single-leg-calf-raise', 'Elevación de talón unilateral', 'calves', ['mancuerna'], ['calves'], { perSide: true }),
  e('donkey-calf-raise', 'Elevación de talones tipo donkey', 'calves', ['máquina'], ['calves']),
  e('tibialis-raise', 'Elevación de tibial', 'calves', ['pared'], ['tibialis-anterior'], { bodyweight: true }),

  // Core
  e('front-plank', 'Plancha frontal', 'core', [], ['abdominals'], { bodyweight: true, duration: true, secondary: ['obliques', 'gluteus-maximus'] }),
  e('side-plank', 'Plancha lateral', 'core', [], ['obliques'], { bodyweight: true, perSide: true, duration: true, secondary: ['gluteus-medius'] }),
  e('dead-bug', 'Dead bug', 'core', [], ['abdominals'], { bodyweight: true, perSide: true, secondary: ['hip-flexors'] }),
  e('bird-dog', 'Bird dog', 'core', [], ['abdominals', 'erector-spinae'], { bodyweight: true, perSide: true, secondary: ['gluteus-maximus'] }),
  e('hollow-body-hold', 'Hollow hold', 'core', [], ['abdominals'], { bodyweight: true, duration: true, secondary: ['hip-flexors'] }),
  e('crunch', 'Crunch abdominal', 'core', [], ['abdominals'], { bodyweight: true }),
  e('decline-crunch', 'Crunch declinado', 'core', ['banco declinado'], ['abdominals'], { bodyweight: true }),
  e('cable-crunch', 'Crunch en polea', 'core', ['polea', 'cuerda'], ['abdominals']),
  e('reverse-crunch', 'Crunch inverso', 'core', [], ['abdominals'], { bodyweight: true, secondary: ['hip-flexors'] }),
  e('hanging-knee-raise', 'Elevación de rodillas colgado', 'core', ['barra de dominadas'], ['abdominals', 'hip-flexors'], { bodyweight: true, secondary: ['forearms'] }),
  e('hanging-leg-raise', 'Elevación de piernas colgado', 'core', ['barra de dominadas'], ['abdominals', 'hip-flexors'], { bodyweight: true, secondary: ['forearms'] }),
  e('captains-chair-knee-raise', 'Elevación de rodillas en silla romana', 'core', ['silla romana'], ['abdominals', 'hip-flexors'], { bodyweight: true }),
  e('ab-wheel-rollout', 'Rueda abdominal', 'core', ['rueda abdominal'], ['abdominals'], { bodyweight: true, secondary: ['latissimus-dorsi'] }),
  e('pallof-press', 'Press Pallof', 'core', ['polea'], ['obliques', 'abdominals'], { perSide: true }),
  e('cable-woodchop', 'Leñador en polea', 'core', ['polea'], ['obliques'], { perSide: true, secondary: ['abdominals'] }),
  e('russian-twist', 'Giro ruso', 'core', ['disco'], ['obliques'], { bodyweight: true, perSide: true, secondary: ['abdominals'] }),
  e('weighted-sit-up', 'Abdominal con carga', 'core', ['disco'], ['abdominals'], { secondary: ['hip-flexors'] }),
  e('dragon-flag', 'Dragon flag', 'core', ['banco'], ['abdominals'], { bodyweight: true, secondary: ['latissimus-dorsi', 'hip-flexors'] }),

  // Cuerpo completo y potencia
  e('barbell-thruster', 'Thruster con barra', 'full-body', ['barra'], ['quadriceps', 'anterior-deltoid'], { secondary: ['gluteus-maximus', 'triceps', 'abdominals'] }),
  e('dumbbell-thruster', 'Thruster con mancuernas', 'full-body', ['mancuernas'], ['quadriceps', 'anterior-deltoid'], { secondary: ['gluteus-maximus', 'triceps', 'abdominals'] }),
  e('burpee', 'Burpee', 'full-body', [], ['quadriceps', 'pectoralis-major'], { bodyweight: true, secondary: ['gluteus-maximus', 'triceps', 'abdominals'] }),
  e('devils-press', 'Devil press', 'full-body', ['mancuernas'], ['gluteus-maximus', 'anterior-deltoid'], { secondary: ['quadriceps', 'pectoralis-major', 'triceps'] }),
  e('sled-push', 'Empuje de trineo', 'full-body', ['trineo'], ['quadriceps', 'gluteus-maximus'], { duration: true, secondary: ['calves', 'pectoralis-major', 'triceps'] }),
  e('sled-pull', 'Arrastre de trineo', 'full-body', ['trineo'], ['quadriceps', 'latissimus-dorsi'], { duration: true, secondary: ['gluteus-maximus', 'forearms'] }),
  e('battle-ropes', 'Ondas con cuerdas de batalla', 'full-body', ['cuerdas de batalla'], ['anterior-deltoid', 'abdominals'], { duration: true, secondary: ['biceps', 'forearms'] }),
  e('medicine-ball-slam', 'Golpe con balón medicinal', 'full-body', ['balón medicinal'], ['latissimus-dorsi', 'abdominals'], { secondary: ['anterior-deltoid', 'triceps', 'gluteus-maximus'] }),
  e('sandbag-carry', 'Transporte de saco', 'full-body', ['saco de arena'], ['abdominals', 'forearms'], { duration: true, secondary: ['quadriceps', 'gluteus-maximus', 'trapezius'] }),

  // Halterofilia
  e('power-clean', 'Cargada de potencia', 'olympic', ['barra', 'discos'], ['gluteus-maximus', 'quadriceps', 'trapezius'], { secondary: ['hamstrings', 'forearms', 'anterior-deltoid'] }),
  e('hang-power-clean', 'Cargada de potencia desde hang', 'olympic', ['barra', 'discos'], ['gluteus-maximus', 'trapezius'], { secondary: ['quadriceps', 'hamstrings', 'forearms'] }),
  e('clean-and-jerk', 'Dos tiempos: cargada y envión', 'olympic', ['barra', 'discos'], ['quadriceps', 'gluteus-maximus', 'anterior-deltoid'], { secondary: ['hamstrings', 'trapezius', 'triceps', 'abdominals'] }),
  e('power-snatch', 'Arrancada de potencia', 'olympic', ['barra', 'discos'], ['gluteus-maximus', 'trapezius', 'anterior-deltoid'], { secondary: ['quadriceps', 'hamstrings', 'abdominals'] }),
  e('hang-power-snatch', 'Arrancada de potencia desde hang', 'olympic', ['barra', 'discos'], ['gluteus-maximus', 'trapezius'], { secondary: ['quadriceps', 'anterior-deltoid', 'abdominals'] }),
  e('push-press', 'Push press', 'olympic', ['barra', 'rack'], ['anterior-deltoid', 'quadriceps'], { secondary: ['triceps', 'gluteus-maximus'] }),
  e('push-jerk', 'Push jerk', 'olympic', ['barra', 'rack'], ['anterior-deltoid', 'quadriceps'], { secondary: ['triceps', 'gluteus-maximus', 'abdominals'] }),
  e('clean-pull', 'Tirón de cargada', 'olympic', ['barra', 'discos'], ['gluteus-maximus', 'trapezius'], { secondary: ['quadriceps', 'hamstrings', 'forearms'] }),
  e('snatch-pull', 'Tirón de arrancada', 'olympic', ['barra', 'discos'], ['gluteus-maximus', 'trapezius'], { secondary: ['quadriceps', 'hamstrings', 'forearms'] }),
  e('high-pull', 'Tirón alto con barra', 'olympic', ['barra'], ['trapezius', 'posterior-deltoid'], { secondary: ['gluteus-maximus', 'hamstrings', 'biceps'] }),

  // Cardio
  e('treadmill-run', 'Carrera en cinta', 'cardio', ['cinta'], ['quadriceps', 'calves'], { duration: true, secondary: ['hamstrings', 'gluteus-maximus'] }),
  e('treadmill-walk', 'Caminata en cinta', 'cardio', ['cinta'], ['quadriceps', 'calves'], { duration: true, secondary: ['hamstrings', 'gluteus-maximus'] }),
  e('incline-treadmill-walk', 'Caminata inclinada en cinta', 'cardio', ['cinta'], ['gluteus-maximus', 'calves'], { duration: true, secondary: ['quadriceps', 'hamstrings'] }),
  e('stationary-bike', 'Bicicleta estática', 'cardio', ['bicicleta'], ['quadriceps'], { duration: true, secondary: ['gluteus-maximus', 'calves'] }),
  e('air-bike', 'Bicicleta de aire', 'cardio', ['air bike'], ['quadriceps', 'anterior-deltoid'], { duration: true, secondary: ['gluteus-maximus', 'triceps', 'latissimus-dorsi'] }),
  e('elliptical', 'Elíptica', 'cardio', ['elíptica'], ['quadriceps', 'gluteus-maximus'], { duration: true, secondary: ['hamstrings', 'calves'] }),
  e('rowing-ergometer', 'Remo en ergómetro', 'cardio', ['remo ergómetro'], ['quadriceps', 'latissimus-dorsi'], { duration: true, secondary: ['gluteus-maximus', 'hamstrings', 'biceps'] }),
  e('stair-climber', 'Escaladora', 'cardio', ['escaladora'], ['quadriceps', 'gluteus-maximus'], { duration: true, secondary: ['calves', 'hamstrings'] }),
  e('ski-erg', 'SkiErg', 'cardio', ['SkiErg'], ['latissimus-dorsi', 'triceps'], { duration: true, secondary: ['abdominals', 'quadriceps'] }),
  e('jump-rope', 'Saltar cuerda', 'cardio', ['cuerda'], ['calves'], { bodyweight: true, duration: true, secondary: ['quadriceps', 'forearms'] }),
  e('box-jump', 'Salto al cajón', 'cardio', ['cajón'], ['quadriceps', 'gluteus-maximus'], { bodyweight: true, secondary: ['calves', 'hamstrings'] }),
  e('stepmill', 'Subida continua de escalones', 'cardio', ['stepmill'], ['quadriceps', 'gluteus-maximus'], { duration: true, secondary: ['calves', 'hamstrings'] }),
  e('heavy-bag', 'Golpes al saco', 'cardio', ['saco de boxeo', 'guantes'], ['anterior-deltoid', 'abdominals'], { duration: true, secondary: ['pectoralis-major', 'triceps', 'calves'] }),

  // Movilidad y recuperación
  e('worlds-greatest-stretch', 'Estiramiento del corredor con rotación', 'mobility', ['colchoneta'], ['hip-flexors', 'thoracic-spine'], { bodyweight: true, perSide: true, duration: true }),
  e('hip-flexor-stretch', 'Estiramiento de flexores de cadera', 'mobility', ['colchoneta'], ['hip-flexors'], { bodyweight: true, perSide: true, duration: true }),
  e('hamstring-stretch', 'Estiramiento de isquiotibiales', 'mobility', ['colchoneta'], ['hamstrings'], { bodyweight: true, perSide: true, duration: true }),
  e('quadriceps-stretch', 'Estiramiento de cuádriceps', 'mobility', [], ['quadriceps'], { bodyweight: true, perSide: true, duration: true }),
  e('calf-stretch', 'Estiramiento de pantorrilla', 'mobility', ['pared'], ['calves'], { bodyweight: true, perSide: true, duration: true }),
  e('pec-doorway-stretch', 'Estiramiento de pecho en marco', 'mobility', ['marco o rack'], ['pectoralis-major'], { bodyweight: true, perSide: true, duration: true }),
  e('lat-stretch-bench', 'Estiramiento de dorsales en banco', 'mobility', ['banco'], ['latissimus-dorsi'], { bodyweight: true, duration: true }),
  e('thoracic-extension-foam-roller', 'Extensión torácica con foam roller', 'mobility', ['foam roller'], ['thoracic-spine'], { bodyweight: true, duration: true }),
  e('thoracic-rotation', 'Rotación torácica en cuadrupedia', 'mobility', ['colchoneta'], ['thoracic-spine'], { bodyweight: true, perSide: true }),
  e('shoulder-dislocate-band', 'Movilidad de hombro con banda', 'mobility', ['banda'], ['rotator-cuff', 'pectoralis-major'], { bodyweight: true }),
  e('band-external-rotation', 'Rotación externa con banda', 'mobility', ['banda'], ['rotator-cuff'], { perSide: true, secondary: ['posterior-deltoid'] }),
  e('ankle-dorsiflexion-mobility', 'Movilidad de tobillo en pared', 'mobility', ['pared'], ['calves', 'tibialis-anterior'], { bodyweight: true, perSide: true }),
  e('deep-squat-hold', 'Sentadilla profunda sostenida', 'mobility', [], ['adductors', 'quadriceps'], { bodyweight: true, duration: true, secondary: ['gluteus-maximus'] }),
  e('cat-cow', 'Gato-vaca', 'mobility', ['colchoneta'], ['erector-spinae', 'abdominals'], { bodyweight: true }),
  e('foam-roll-quadriceps', 'Foam roller en cuádriceps', 'mobility', ['foam roller'], ['quadriceps'], { perSide: true, duration: true }),
  e('foam-roll-upper-back', 'Foam roller en espalda alta', 'mobility', ['foam roller'], ['trapezius', 'rhomboids'], { duration: true }),
];

export const GYM_EXERCISE_IDS = new Set(GYM_EXERCISE_CATALOG.map((item) => item.id));
