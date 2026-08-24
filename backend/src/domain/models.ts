import type {
  AuthenticatorTransportFuture,
  CredentialDeviceType,
} from '@simplewebauthn/server';

export interface StoredPasskey {
  id: string;
  publicKey: string;
  counter: number;
  transports: AuthenticatorTransportFuture[];
  deviceType: CredentialDeviceType;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface StoredPasswordCredential {
  algorithm: 'scrypt';
  salt: string;
  hash: string;
  keyLength: number;
  cost: number;
  blockSize: number;
  parallelization: number;
  createdAt: string;
}

export interface User {
  id: string;
  webauthnUserId: string;
  username: string;
  displayName: string;
  stateFileKey: string;
  createdAt: string;
  updatedAt: string;
  passkeys: StoredPasskey[];
  passwordCredential: StoredPasswordCredential | null;
}

export interface Database {
  schemaVersion: 1;
  users: User[];
}

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
  macros: {
    proteinGrams: number;
    fatGrams: number;
    carbohydrateGrams: number;
    proteinPercent: number;
    fatPercent: number;
    carbohydratePercent: number;
  };
  note: string | null;
}

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

export type ProgressionStrategy =
  | 'greyskull-lp'
  | 'linear-progression'
  | 'double-progression';

export interface ProgressionConfig {
  incrementKg: number;
  deloadAfterFailures: number;
  deloadPercent: number;
  sets?: number;
  targetReps?: number;
  amrapSetNumber?: number;
  repRange?: {
    min: number;
    max: number;
  };
}

export interface ProgressionState {
  nextLoadKg: number;
  consecutiveFailures: number;
  deloadCount: number;
  lastEvaluatedSessionId: string | null;
}

export interface ExerciseProgressionRule {
  exerciseId: string;
  strategy: ProgressionStrategy;
  config: ProgressionConfig;
  state: ProgressionState;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
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

export interface UserState {
  schemaVersion: 1;
  revision: number;
  owner: {
    userId: string;
    stateFileKey: string;
    createdAt: string;
    updatedAt: string;
  };
  preferences: Record<string, unknown>;
  bodyWeight: {
    goal: {
      targetKg: number;
      targetDate: string | null;
    } | null;
    entries: BodyWeightEntry[];
  };
  bodyMetrics: {
    profile: {
      sex: BiologicalSex | null;
      ageYears: number | null;
      heightCm: number | null;
      activityLevel: ActivityLevel;
      goal: BodyGoal;
    };
    entries: BodyMetricEntry[];
  };
  bodyMeasurementReminder: BodyMeasurementReminder;
  onboarding: OnboardingProfile;
  exerciseLibrary: Exercise[];
  weeklyPlan: Record<string, unknown>;
  scheduleOverrides: Record<string, unknown>[];
  workoutSessions: WorkoutSession[];
  progression: {
    exerciseRules: ExerciseProgressionRule[];
  };
  pushSubscriptions: PushSubscriptionRecord[];
  restTimers: RestTimerRecord[];
  [key: string]: unknown;
}

export interface SessionClaims {
  kind: 'session';
  sub: string;
  iat: number;
  exp: number;
}

export interface RegistrationFlowClaims {
  kind: 'registration';
  challenge: string;
  userId: string;
  webauthnUserId: string;
  username: string;
  displayName: string;
  existingUserId: string | null;
  iat: number;
  exp: number;
}

export interface AuthenticationFlowClaims {
  kind: 'authentication';
  challenge: string;
  allowedUserId: string | null;
  iat: number;
  exp: number;
}

export type AuthFlowClaims =
  | RegistrationFlowClaims
  | AuthenticationFlowClaims;
