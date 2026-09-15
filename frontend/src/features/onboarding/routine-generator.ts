import type {
  Exercise,
  ExercisePrescription,
  ExerciseProgressionRule,
  OnboardingProfile,
  PlanBlock,
  PlanDay,
  WeeklyPlan,
} from '../../types/state';

interface GeneratedRoutine {
  plan: WeeklyPlan;
  progressionRules: ExerciseProgressionRule[];
  exerciseCount: number;
}

interface RoutineContext {
  ageYears?: number;
}

type SessionKind = 'full-a' | 'full-b' | 'full-c' | 'upper-a' | 'upper-b' | 'lower-a' | 'lower-b' | 'push-a' | 'push-b' | 'pull-a' | 'pull-b' | 'legs-a' | 'legs-b';

interface SessionTemplate {
  name: string;
  exercises: Record<OnboardingProfile['equipment'], string[]>;
}

const TEMPLATES: Record<SessionKind, SessionTemplate> = {
  'full-a': template('Cuerpo completo A', ['leg-press', 'chest-press-machine', 'seated-cable-row', 'lying-leg-curl', 'dumbbell-lateral-raise', 'front-plank'], ['back-squat', 'dumbbell-bench-press', 'chest-supported-dumbbell-row', 'dumbbell-romanian-deadlift', 'dumbbell-lateral-raise', 'front-plank'], ['wall-sit', 'push-up', 'pull-up', 'glute-bridge', 'side-plank', 'front-plank']),
  'full-b': template('Cuerpo completo B', ['machine-hip-thrust', 'lat-pulldown', 'incline-dumbbell-press', 'leg-extension', 'face-pull', 'dead-bug'], ['romanian-deadlift', 'single-arm-dumbbell-row', 'incline-dumbbell-press', 'goblet-squat', 'rear-delt-fly', 'dead-bug'], ['single-leg-glute-bridge', 'chin-up', 'incline-push-up', 'sissy-squat', 'bird-dog', 'dead-bug']),
  'full-c': template('Cuerpo completo C', ['hack-squat', 'machine-row', 'machine-shoulder-press', 'seated-leg-curl', 'cable-fly', 'pallof-press'], ['front-squat', 'barbell-row', 'dumbbell-shoulder-press', 'single-leg-romanian-deadlift', 'dumbbell-fly', 'suitcase-carry'], ['wall-sit', 'neutral-grip-pull-up', 'decline-push-up', 'slider-leg-curl', 'side-plank', 'bird-dog']),
  'upper-a': template('Torso A', ['chest-press-machine', 'lat-pulldown', 'machine-shoulder-press', 'seated-cable-row', 'cable-curl', 'rope-triceps-pushdown', 'face-pull'], ['bench-press', 'chest-supported-dumbbell-row', 'dumbbell-shoulder-press', 'pull-up', 'dumbbell-curl', 'dumbbell-overhead-triceps-extension', 'rear-delt-fly'], ['push-up', 'pull-up', 'decline-push-up', 'chin-up', 'incline-push-up', 'side-plank', 'bird-dog']),
  'upper-b': template('Torso B', ['machine-row', 'incline-dumbbell-press', 'neutral-grip-lat-pulldown', 'dumbbell-lateral-raise', 'pec-deck', 'machine-biceps-curl', 'cable-triceps-pushdown'], ['barbell-row', 'incline-dumbbell-press', 'chin-up', 'dumbbell-lateral-raise', 'dumbbell-fly', 'hammer-curl', 'skull-crusher'], ['neutral-grip-pull-up', 'decline-push-up', 'chin-up', 'incline-push-up', 'push-up', 'side-plank', 'dead-hang']),
  'lower-a': template('Pierna A', ['leg-press', 'seated-leg-curl', 'machine-hip-thrust', 'leg-extension', 'standing-calf-raise', 'front-plank'], ['back-squat', 'romanian-deadlift', 'barbell-hip-thrust', 'reverse-lunge', 'single-leg-calf-raise', 'front-plank'], ['wall-sit', 'nordic-curl', 'glute-bridge', 'single-leg-glute-bridge', 'single-leg-calf-raise', 'front-plank']),
  'lower-b': template('Pierna B', ['hack-squat', 'lying-leg-curl', 'machine-hip-thrust', 'hip-abduction-machine', 'seated-calf-raise', 'dead-bug'], ['front-squat', 'dumbbell-romanian-deadlift', 'single-leg-glute-bridge', 'lateral-lunge', 'single-leg-calf-raise', 'dead-bug'], ['sissy-squat', 'nordic-curl', 'single-leg-glute-bridge', 'glute-bridge', 'single-leg-calf-raise', 'dead-bug']),
  'push-a': template('Empuje A', ['chest-press-machine', 'machine-shoulder-press', 'incline-dumbbell-press', 'dumbbell-lateral-raise', 'rope-triceps-pushdown'], ['bench-press', 'dumbbell-shoulder-press', 'incline-dumbbell-press', 'dumbbell-lateral-raise', 'dumbbell-overhead-triceps-extension'], ['push-up', 'decline-push-up', 'incline-push-up', 'side-plank', 'front-plank']),
  'push-b': template('Empuje B', ['incline-dumbbell-press', 'landmine-press', 'pec-deck', 'machine-lateral-raise', 'cable-triceps-pushdown'], ['incline-dumbbell-press', 'landmine-press', 'dumbbell-fly', 'dumbbell-lateral-raise', 'skull-crusher'], ['decline-push-up', 'incline-push-up', 'push-up', 'side-plank', 'dead-bug']),
  'pull-a': template('Tirón A', ['lat-pulldown', 'machine-row', 'straight-arm-pulldown', 'face-pull', 'cable-curl'], ['pull-up', 'chest-supported-dumbbell-row', 'dumbbell-pullover', 'rear-delt-fly', 'dumbbell-curl'], ['pull-up', 'chin-up', 'dead-hang', 'bird-dog', 'neutral-grip-pull-up']),
  'pull-b': template('Tirón B', ['neutral-grip-lat-pulldown', 'seated-cable-row', 'reverse-pec-deck', 'machine-biceps-curl', 'farmer-carry'], ['chin-up', 'barbell-row', 'rear-delt-fly', 'hammer-curl', 'farmer-carry'], ['chin-up', 'neutral-grip-pull-up', 'bird-dog', 'pull-up', 'dead-hang']),
  'legs-a': template('Pierna A', ['leg-press', 'seated-leg-curl', 'machine-hip-thrust', 'standing-calf-raise', 'front-plank'], ['back-squat', 'romanian-deadlift', 'barbell-hip-thrust', 'single-leg-calf-raise', 'front-plank'], ['wall-sit', 'nordic-curl', 'glute-bridge', 'single-leg-calf-raise', 'front-plank']),
  'legs-b': template('Pierna B', ['hack-squat', 'lying-leg-curl', 'hip-abduction-machine', 'seated-calf-raise', 'dead-bug'], ['front-squat', 'dumbbell-romanian-deadlift', 'lateral-lunge', 'single-leg-calf-raise', 'dead-bug'], ['sissy-squat', 'nordic-curl', 'single-leg-glute-bridge', 'single-leg-calf-raise', 'dead-bug']),
};

const SCHEDULES: Record<OnboardingProfile['trainingDaysPerWeek'], { weekdays: number[]; sessions: SessionKind[] }> = {
  2: { weekdays: [1, 4], sessions: ['full-a', 'full-b'] },
  3: { weekdays: [1, 3, 5], sessions: ['full-a', 'full-b', 'full-c'] },
  4: { weekdays: [1, 2, 4, 5], sessions: ['upper-a', 'lower-a', 'upper-b', 'lower-b'] },
  5: { weekdays: [1, 2, 3, 4, 5], sessions: ['push-a', 'pull-a', 'legs-a', 'upper-b', 'lower-b'] },
  6: { weekdays: [1, 2, 3, 4, 5, 6], sessions: ['push-a', 'pull-a', 'legs-a', 'push-b', 'pull-b', 'legs-b'] },
};

const PRIORITY_ACCESSORIES: Record<NonNullable<OnboardingProfile['priorityMuscles'][number]>, Record<OnboardingProfile['equipment'], string>> = {
  chest: { 'full-gym': 'pec-deck', 'free-weights': 'dumbbell-fly', bodyweight: 'push-up' },
  back: { 'full-gym': 'straight-arm-pulldown', 'free-weights': 'chest-supported-dumbbell-row', bodyweight: 'pull-up' },
  shoulders: { 'full-gym': 'machine-lateral-raise', 'free-weights': 'dumbbell-lateral-raise', bodyweight: 'decline-push-up' },
  arms: { 'full-gym': 'rope-triceps-pushdown', 'free-weights': 'hammer-curl', bodyweight: 'chin-up' },
  quadriceps: { 'full-gym': 'leg-extension', 'free-weights': 'goblet-squat', bodyweight: 'wall-sit' },
  'hamstrings-glutes': { 'full-gym': 'lying-leg-curl', 'free-weights': 'dumbbell-romanian-deadlift', bodyweight: 'glute-bridge' },
  core: { 'full-gym': 'pallof-press', 'free-weights': 'suitcase-carry', bodyweight: 'dead-bug' },
};

const LIMITATION_SUBSTITUTIONS: Record<NonNullable<OnboardingProfile['limitations'][number]>, Record<string, string>> = {
  shoulder: {
    'overhead-press': 'landmine-press', 'dumbbell-shoulder-press': 'landmine-press', 'machine-shoulder-press': 'landmine-press',
    'decline-push-up': 'incline-push-up',
  },
  'lower-back': {
    'conventional-deadlift': 'glute-bridge', 'romanian-deadlift': 'glute-bridge', 'dumbbell-romanian-deadlift': 'single-leg-glute-bridge',
    'barbell-row': 'chest-supported-dumbbell-row', 'back-squat': 'goblet-squat', 'front-squat': 'goblet-squat',
  },
  knee: {
    'back-squat': 'barbell-hip-thrust', 'front-squat': 'barbell-hip-thrust', 'goblet-squat': 'glute-bridge', 'hack-squat': 'machine-hip-thrust',
    'leg-press': 'machine-hip-thrust', 'leg-extension': 'lying-leg-curl', 'reverse-lunge': 'glute-bridge', 'lateral-lunge': 'glute-bridge', 'wall-sit': 'glute-bridge', 'sissy-squat': 'glute-bridge',
  },
  'elbow-wrist': {
    'bench-press': 'dumbbell-floor-press', 'barbell-row': 'chest-supported-dumbbell-row', 'barbell-curl': 'hammer-curl', 'skull-crusher': 'dumbbell-kickback',
  },
};

export function generateRoutine(profile: OnboardingProfile, exercises: Exercise[], effectiveFrom: string, context: RoutineContext = {}): GeneratedRoutine {
  const library = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const schedule = SCHEDULES[profile.trainingDaysPerWeek];
  const maximumExercises = profile.sessionMinutes <= 30 ? 4 : profile.sessionMinutes <= 45 ? 5 : profile.sessionMinutes <= 60 ? 6 : profile.sessionMinutes <= 75 ? 7 : 8;
  const days = schedule.sessions.map((session, index) => createDay(session, schedule.weekdays[index] ?? 1, profile, library, maximumExercises, context));
  const firstPrescriptions = new Map<string, ExercisePrescription>();
  for (const item of days.flatMap((day) => day.blocks.flatMap((block) => block.exercises))) {
    if (!firstPrescriptions.has(item.exerciseId)) firstPrescriptions.set(item.exerciseId, item);
  }
  return {
    plan: {
      id: `forja-${profile.trainingGoal}-${effectiveFrom}`,
      name: planName(profile),
      effectiveFrom,
      days,
    },
    progressionRules: [...firstPrescriptions.values()]
      .filter((item) => !item.durationSeconds)
      .map((item) => progressionRule(item, profile, library.get(item.exerciseId))),
    exerciseCount: firstPrescriptions.size,
  };
}

function createDay(session: SessionKind, weekday: number, profile: OnboardingProfile, library: Map<string, Exercise>, maximumExercises: number, context: RoutineContext): PlanDay {
  const source = TEMPLATES[session];
  let ids = source.exercises[profile.equipment].map((id) => substitute(id, profile, library));
  ids = ids.filter((id, index) => library.has(id) && ids.indexOf(id) === index);
  const priorities = [...new Set(profile.priorityMuscles
    .map((priority) => substitute(PRIORITY_ACCESSORIES[priority][profile.equipment], profile, library))
    .filter((id) => library.has(id)))];
  ids = [...new Set([...ids.slice(0, 1), ...priorities, ...ids.slice(1)])].slice(0, maximumExercises);
  const prescriptions = ids.map((id, index) => prescription(library.get(id)!, index, profile, context));
  const budgetSeconds = profile.sessionMinutes * 60;
  while (estimateRoutineSeconds(blocksFor(prescriptions, profile), library) > budgetSeconds) {
    const reducible = [...prescriptions].reverse().find((item) => item.sets > 2);
    if (reducible) { reducible.sets -= 1; continue; }
    if (prescriptions.length <= 2) break;
    const removable = prescriptions.findLastIndex((item, index) => index > 0 && !priorities.includes(item.exerciseId));
    prescriptions.splice(removable >= 0 ? removable : prescriptions.length - 1, 1);
  }
  return {
    id: `generated-${weekday}-${session}`,
    weekday,
    name: source.name,
    blocks: blocksFor(prescriptions, profile),
  };
}

/** Conservative working-time estimate: upper rep range, both sides, rests, warm-up and setup. */
export function estimateRoutineSeconds(blocks: PlanBlock[], library: Map<string, Exercise>): number {
  return 300 + blocks.reduce((total, block) => {
    const work = block.exercises.reduce((sum, item) => {
      const tempo = item.tempo;
      const secondsPerRep = tempo ? tempo.eccentricSeconds + tempo.pauseSeconds + tempo.concentricSeconds : 3;
      const movementSeconds = item.durationSeconds ?? (item.repetitions?.max ?? 1) * secondsPerRep;
      const sides = library.get(item.exerciseId)?.isPerSide ? 2 : 1;
      return sum + movementSeconds * sides * item.sets + (block.type === 'standard' ? Math.max(0, item.sets - 1) * item.restSeconds : 0);
    }, 0);
    const roundRest = block.type === 'superset' ? Math.max(0, (block.rounds ?? 1) - 1) * (block.restAfterRoundSeconds ?? 0) : 0;
    return total + work + roundRest + block.exercises.length * 45;
  }, 0);
}

function blocksFor(prescriptions: ExercisePrescription[], profile: OnboardingProfile): PlanBlock[] {
  const canSuperset = profile.experience !== 'beginner' && profile.trainingGoal !== 'strength' && prescriptions.length >= 5;
  if (!canSuperset) return prescriptions.map((item, index) => ({ id: `block-${index + 1}`, type: 'standard', exercises: [item] }));
  const standard = prescriptions.slice(0, -2).map((item, index) => ({ id: `block-${index + 1}`, type: 'standard' as const, exercises: [item] }));
  const rounds = Math.min(...prescriptions.slice(-2).map((item) => item.sets));
  const accessories = prescriptions.slice(-2).map((item) => ({ ...item, sets: rounds, restSeconds: 0 }));
  return [...standard, { id: 'accessory-superset', type: 'superset', rounds, restAfterRoundSeconds: 90, exercises: accessories }];
}

function prescription(exercise: Exercise, index: number, profile: OnboardingProfile, context: RoutineContext): ExercisePrescription {
  const compound = index < 3 && !['biceps', 'triceps', 'forearms', 'calves', 'core', 'mobility'].includes(exercise.category);
  const experienceVolumeAdjustment = profile.experience === 'beginner' ? -1 : 0;
  const recoveryAdjustment = (context.ageYears ?? 0) >= 55 ? -1 : 0;
  const baseSets = 3;
  const sets = Math.max(2, baseSets + experienceVolumeAdjustment + recoveryAdjustment);
  const repetitions = profile.trainingGoal === 'strength' && compound
    ? { min: 5, max: 5 }
    : profile.trainingGoal === 'general-fitness'
      ? { min: 8, max: 12 }
      : compound ? { min: 6, max: 10 } : { min: 10, max: 15 };
  const targetRpe = profile.experience === 'beginner' ? 7 : profile.experience === 'intermediate' ? 8 : 8.5;
  const restSeconds = profile.trainingGoal === 'strength' && compound ? 180 : compound ? 120 : 75;
  const tempo = profile.trainingGoal === 'strength'
    ? { eccentricSeconds: 2, pauseSeconds: 0, concentricSeconds: 1 }
    : { eccentricSeconds: 3, pauseSeconds: 1, concentricSeconds: 1 };
  if (exercise.measurement === 'duration') {
    return { exerciseId: exercise.id, sets, durationSeconds: 30, restSeconds, targetRpe, tempo, coachingNote: coachingNote(profile) };
  }
  return { exerciseId: exercise.id, sets, repetitions, restSeconds, targetRpe, tempo, coachingNote: coachingNote(profile) };
}

function progressionRule(item: ExercisePrescription, profile: OnboardingProfile, exercise?: Exercise): ExerciseProgressionRule {
  const exerciseId = item.exerciseId;
  const strategy = profile.experience === 'beginner'
    ? 'linear-progression'
    : profile.trainingGoal === 'strength' && item.repetitions?.min === 5 ? 'greyskull-lp' : 'double-progression';
  const incrementKg = exercise?.isBodyweight ? 1 : ['quadriceps', 'hamstrings', 'glutes', 'back'].includes(exercise?.category ?? '') ? 2.5 : 1;
  const config = strategy === 'double-progression'
    ? { incrementKg, deloadAfterFailures: 3, deloadPercent: 10, sets: item.sets, repRange: { ...item.repetitions! } }
    : { incrementKg, deloadAfterFailures: 3, deloadPercent: 10, sets: item.sets, targetReps: item.repetitions?.min ?? 5, ...(strategy === 'greyskull-lp' ? { amrapSetNumber: item.sets } : {}) };
  return { exerciseId, strategy, config, state: { nextLoadKg: 0, consecutiveFailures: 0, deloadCount: 0, lastEvaluatedSessionId: null } };
}

function substitute(id: string, profile: OnboardingProfile, library: Map<string, Exercise>): string {
  let current = id;
  for (const limitation of profile.limitations) {
    const candidate = LIMITATION_SUBSTITUTIONS[limitation][current];
    if (candidate && library.has(candidate)) current = candidate;
  }
  return current;
}

function planName(profile: OnboardingProfile): string {
  const goals: Record<OnboardingProfile['trainingGoal'], string> = {
    hypertrophy: 'Forja de masa muscular', strength: 'Forja de fuerza', recomposition: 'Forja de recomposición', 'general-fitness': 'Forja de condición física',
  };
  return `${goals[profile.trainingGoal]} · ${profile.trainingDaysPerWeek} días`;
}

function coachingNote(profile: OnboardingProfile): string {
  const reserve = profile.experience === 'beginner' ? '3 repeticiones en reserva' : '1–2 repeticiones en reserva';
  return `Técnica estable, sin inercia y ${reserve}. Detén la serie si aparece dolor.`;
}

function template(name: string, fullGym: string[], freeWeights: string[], bodyweight: string[]): SessionTemplate {
  return { name, exercises: { 'full-gym': fullGym, 'free-weights': freeWeights, bodyweight } };
}
