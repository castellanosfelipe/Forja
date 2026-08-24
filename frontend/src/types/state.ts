export interface BodyWeightEntry {
  id: string;
  measuredAt: string;
  weightKg: number;
  note: string | null;
}

export type BiologicalSex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
export type BodyGoal = 'lose' | 'maintain' | 'gain';

export type TrainingGoal = 'hypertrophy' | 'strength' | 'recomposition' | 'general-fitness';
export type TrainingExperience = 'beginner' | 'intermediate' | 'advanced';
export type TrainingEquipment = 'full-gym' | 'free-weights' | 'bodyweight';
export type MovementLimitation = 'shoulder' | 'lower-back' | 'knee' | 'elbow-wrist';
export type PriorityMuscleGroup = 'chest' | 'back' | 'shoulders' | 'arms' | 'quadriceps' | 'hamstrings-glutes' | 'core';

export interface OnboardingProfile {
  completedAt: string | null;
  trainingGoal: TrainingGoal;
  experience: TrainingExperience;
  trainingDaysPerWeek: 2 | 3 | 4 | 5 | 6;
  sessionMinutes: 30 | 45 | 60 | 75 | 90;
  equipment: TrainingEquipment;
  priorityMuscles: PriorityMuscleGroup[];
  limitations: MovementLimitation[];
  generatedAt: string | null;
  methodologyVersion: 'forja-safe-v1';
}

export interface BodyMetricsProfile {
  sex: BiologicalSex | null;
  ageYears: number | null;
  heightCm: number | null;
  activityLevel: ActivityLevel;
  goal: BodyGoal;
}

export interface MacroTargets {
  proteinGrams: number;
  fatGrams: number;
  carbohydrateGrams: number;
  proteinPercent: number;
  fatPercent: number;
  carbohydratePercent: number;
}

export interface BodyMetricEntry {
  id: string;
  measuredAt: string;
  weightKg: number;
  neckCm: number | null;
  waistCm: number | null;
  hipCm: number | null;
  bmi: number;
  bodyFatPercent: number | null;
  leanMassKg: number | null;
  ffmi: number | null;
  basalMetabolicRateKcal: number;
  totalDailyEnergyExpenditureKcal: number;
  targetCaloriesKcal: number;
  macros: MacroTargets;
  note: string | null;
}

export type MuscleGroup =
  | 'pectoralis-major'
  | 'anterior-deltoid'
  | 'posterior-deltoid'
  | 'biceps'
  | 'triceps'
  | 'latissimus-dorsi'
  | 'rhomboids'
  | 'abdominals'
  | 'obliques'
  | 'erector-spinae'
  | 'quadriceps'
  | 'hamstrings'
  | 'gluteus-maximus'
  | 'adductors'
  | 'calves';

export interface Exercise {
  id: string;
  name: string;
  category: string;
  equipment: string[];
  measurement: 'repetitions' | 'duration';
  isBodyweight: boolean;
  isPerSide: boolean;
  muscles: {
    primary: string[];
    secondary: string[];
  };
}

export interface ExercisePrescription {
  exerciseId: string;
  sets: number;
  repetitions?: { min: number; max: number };
  durationSeconds?: number;
  restSeconds: number;
  targetRpe?: number;
  tempo?: {
    eccentricSeconds: number;
    pauseSeconds: number;
    concentricSeconds: number;
  };
  coachingNote?: string;
}

export interface PlanBlock {
  id: string;
  type: 'standard' | 'superset';
  rounds?: number;
  restAfterRoundSeconds?: number;
  exercises: ExercisePrescription[];
}

export interface PlanDay {
  id: string;
  weekday: number;
  name: string;
  blocks: PlanBlock[];
}

export interface WeeklyPlan {
  id: string;
  name: string;
  effectiveFrom: string;
  days: PlanDay[];
}

export interface ScheduleOverride {
  id: string;
  baseDayId: string;
  originalDate: string;
  scheduledDate: string;
  reason: string;
  createdAt: string;
}

export interface WorkoutSet {
  setNumber: number;
  loadKg: number | null;
  repetitions: number | null;
  durationSeconds: number | null;
  side: 'left' | 'right' | null;
  rpe: number | null;
  rir: number | null;
  completedAt: string | null;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
  estimatedOneRepMaxKg: number | null;
  notes: string | null;
}

export interface WorkoutSession {
  id: string;
  planDayId: string | null;
  scheduledDate: string;
  startedAt: string;
  completedAt: string | null;
  status: 'active' | 'completed' | 'cancelled';
  exercises: WorkoutExercise[];
  notes: string | null;
}

export type ProgressionStrategy = 'greyskull-lp' | 'linear-progression' | 'double-progression';

export interface ExerciseProgressionRule {
  exerciseId: string;
  strategy: ProgressionStrategy;
  config: {
    incrementKg: number;
    deloadAfterFailures: number;
    deloadPercent: number;
    sets?: number;
    targetReps?: number;
    amrapSetNumber?: number;
    repRange?: { min: number; max: number };
  };
  state: {
    nextLoadKg: number;
    consecutiveFailures: number;
    deloadCount: number;
    lastEvaluatedSessionId: string | null;
  };
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
  createdAt: string;
  updatedAt: string;
}

export interface RestTimerRecord {
  id: string;
  dueAt: string;
  title: string;
  body: string;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  createdAt: string;
  completedAt: string | null;
}

export interface BodyMeasurementReminder {
  enabled: boolean;
  intervalMonths: 1;
  nextDueAt: string;
  lastNotifiedAt: string | null;
}

export interface UserPreferences {
  locale?: string;
  timeZone?: string;
  units?: 'metric' | 'imperial';
  weekStartsOn?: number;
  restTimer?: {
    defaultSeconds?: number;
    sound?: boolean;
    vibration?: boolean;
    webPushWhenHidden?: boolean;
  };
  guidedWorkout?: {
    requestWakeLock?: boolean;
    showRpe?: boolean;
    showRir?: boolean;
    prefillPreviousLoad?: boolean;
  };
  [key: string]: unknown;
}

export interface UserState {
  schemaVersion: 1;
  revision: number;
  owner: {
    userId: string;
    stateFileKey: string;
    createdAt: string;
    updatedAt: string;
  };
  preferences: UserPreferences;
  bodyWeight: {
    goal: { targetKg: number; targetDate: string | null } | null;
    entries: BodyWeightEntry[];
  };
  bodyMetrics: {
    profile: BodyMetricsProfile;
    entries: BodyMetricEntry[];
  };
  bodyMeasurementReminder?: BodyMeasurementReminder;
  onboarding?: OnboardingProfile;
  exerciseLibrary: Exercise[];
  weeklyPlan: WeeklyPlan;
  scheduleOverrides: ScheduleOverride[];
  workoutSessions: WorkoutSession[];
  progression: { exerciseRules: ExerciseProgressionRule[] };
  pushSubscriptions: PushSubscriptionRecord[];
  restTimers: RestTimerRecord[];
  [key: string]: unknown;
}

export type SyncStatus = 'idle' | 'loading' | 'syncing' | 'offline' | 'conflict' | 'error';
