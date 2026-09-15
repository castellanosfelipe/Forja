import React from '../../../frontend/node_modules/react/index.js';
import { act, cleanup, fireEvent, render, renderHook, screen } from '../../../frontend/node_modules/@testing-library/react/dist/index.js';
import { afterAll, afterEach, describe, expect, it, vi } from '../../../frontend/node_modules/vitest/dist/index.js';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateRoutine, estimateRoutineSeconds } from '../../../frontend/src/features/onboarding/routine-generator';
import { calculateBodyMetrics } from '../../../frontend/src/features/metrics/calculations';
import { addOneMonth, isMeasurementDue } from '../../../frontend/src/features/metrics/measurement-reminder';
import { evaluateProgression, ProgressionService, estimateOneRepMax } from '../../../backend/src/services/progression.service';
import { GYM_EXERCISE_CATALOG } from '../../../backend/src/domain/exercise-catalog';
import { createWorkoutExercise, WorkoutPage } from '../../../frontend/src/features/guided-workout/WorkoutPage';
import { effectivePlanDaysForDate } from '../../../frontend/src/utils/schedule';
import { buildTrainingHeatmap } from '../../../frontend/src/components/charts/TrainingHeatmap';
import { calculateRecentMuscleScores } from '../../../frontend/src/components/muscle-map/MuscleMap';
import { SetRow } from '../../../frontend/src/components/workout/SetRow';
import { MetricsPage } from '../../../frontend/src/features/metrics/MetricsPage';
import { WeightChart } from '../../../frontend/src/components/charts/WeightChart';
import { useRestTimer } from '../../../frontend/src/hooks/useRestTimer';
import { useStateStore } from '../../../frontend/src/stores/state.store';
import { pushApi } from '../../../frontend/src/pwa/push';
import { MemoryRouter } from '../../../frontend/node_modules/react-router-dom/dist/index.js';
import type { OnboardingProfile, UserState, WorkoutExercise, WorkoutSet } from '../../../frontend/src/types/state';

const now = '2026-09-09T15:00:00.000Z';
const profile: OnboardingProfile = { completedAt: now, trainingGoal: 'hypertrophy', experience: 'beginner', trainingDaysPerWeek: 3, sessionMinutes: 60, equipment: 'full-gym', priorityMuscles: [], limitations: [], generatedAt: now, methodologyVersion: 'forja-safe-v1' };
const cases: Array<Record<string, unknown>> = [];
function record(id: string, name: string, expected: unknown, observed: unknown, pass: boolean, evidence: string) {
  cases.push({ id, name, status: pass ? 'PASS' : 'FAIL', expected, observed, evidence });
}
function workout(id: string, reps: Array<number | null>, load = 50): WorkoutExercise {
  return { exerciseId: id, notes: null, estimatedOneRepMaxKg: null, sets: reps.map((repetitions, index) => ({ setNumber: index + 1, loadKg: load, repetitions, durationSeconds: repetitions === null ? 30 : null, side: null, rpe: 8, rir: 2, completedAt: now })) };
}
function stateFixture(): UserState {
  return { schemaVersion: 1, revision: 1, owner: { userId: 'qa-business', stateFileKey: 'qa-business', createdAt: now, updatedAt: now }, preferences: { guidedWorkout: { requestWakeLock: false }, restTimer: { webPushWhenHidden: false } }, bodyWeight: { goal: null, entries: [] }, bodyMetrics: { profile: { sex: 'male', ageYears: 30, heightCm: 180, activityLevel: 'moderate', goal: 'maintain' }, entries: [] }, exerciseLibrary: structuredClone(GYM_EXERCISE_CATALOG), weeklyPlan: { id: 'qa-plan', name: 'QA plan', effectiveFrom: '2026-09-09', days: [] }, scheduleOverrides: [], workoutSessions: [], progression: { exerciseRules: [] }, pushSubscriptions: [], restTimers: [], onboarding: profile };
}
function prepare(state: UserState) {
  useStateStore.setState({ state, status: 'idle', error: null, hasPendingChanges: false, update: async (mutator) => {
    const next = structuredClone(useStateStore.getState().state!); mutator(next); useStateStore.setState({ state: next });
  } });
}
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); useStateStore.setState({ state: null }); });
afterAll(() => {
  const outputDir = process.env.QA_OUTPUT_DIR ?? 'work/remediation/business';
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'business-cases.json'), JSON.stringify({ auditedAt: new Date().toISOString(), fixtureDate: now, scope: 'Business/data remediation verification, synthetic fixtures only; baseline 2026-09-09 preserved', counts: { total: cases.length, pass: cases.filter(c => c.status === 'PASS').length, fail: cases.filter(c => c.status === 'FAIL').length }, cases }, null, 2) + '\n');
  console.log(JSON.stringify(cases.map(({ id, status, observed }) => ({ id, status, observed })), null, 2));
  expect(cases.filter((item) => item.status === 'FAIL').map((item) => item.id)).toEqual([]);
});

describe('FORJA independent business/data QA (records defects without changing product)', () => {
  it('checks working-time budgets and prescription snapshots across the full catalog', () => {
    const library = new Map(GYM_EXERCISE_CATALOG.map((exercise) => [exercise.id, exercise]));
    const violations: unknown[] = [];
    let combinations = 0;
    for (const days of [2, 3, 4, 5, 6] as const) for (const equipment of ['full-gym', 'free-weights', 'bodyweight'] as const) for (const goal of ['hypertrophy', 'strength', 'recomposition', 'general-fitness'] as const) for (const experience of ['beginner', 'intermediate', 'advanced'] as const) for (const sessionMinutes of [30, 45, 60, 75, 90] as const) {
      const generated = generateRoutine({ ...profile, trainingDaysPerWeek: days, equipment, trainingGoal: goal, experience, sessionMinutes }, GYM_EXERCISE_CATALOG, '2026-09-09');
      combinations++;
      for (const day of generated.plan.days) {
        const seconds = estimateRoutineSeconds(day.blocks, library);
        if (seconds > sessionMinutes * 60) violations.push({ days, equipment, goal, experience, sessionMinutes, day: day.id, seconds });
        for (const prescribed of day.blocks.flatMap((block) => block.exercises)) {
          const rule = generated.progressionRules.find((candidate) => candidate.exerciseId === prescribed.exerciseId);
          if (!rule) continue;
          const performed = createWorkoutExercise(prescribed, library.get(prescribed.exerciseId)?.isPerSide ?? false);
          performed.sets.forEach((set) => { set.repetitions = prescribed.repetitions?.max ?? null; set.completedAt = now; });
          if (!evaluateProgression(rule, performed, 'matrix').succeeded) violations.push({ days, equipment, goal, experience, sessionMinutes, exercise: prescribed.exerciseId, reason: 'prescriptionMismatch' });
        }
      }
    }
    record('BUS-028', 'All generated plans fit their conservative time budget and evaluate their session prescription', { combinations: 900, violations: [] }, { combinations, violations }, combinations === 900 && violations.length === 0, 'Full catalog: 5 schedules x 3 equipment modes x 4 goals x 3 experiences x 5 time budgets; maximum reps, both sides, warm-up, setup and rests included');
  });

  it('inventories routine coverage and checks generated progression consistency', () => {
    let combinations = 0; const invalid: unknown[] = [];
    for (const days of [2, 3, 4, 5, 6] as const) for (const equipment of ['full-gym', 'free-weights', 'bodyweight'] as const) for (const goal of ['hypertrophy', 'strength', 'recomposition', 'general-fitness'] as const) for (const experience of ['beginner', 'intermediate', 'advanced'] as const) {
      const generated = generateRoutine({ ...profile, trainingDaysPerWeek: days, equipment, trainingGoal: goal, experience }, GYM_EXERCISE_CATALOG, '2026-09-09');
      combinations++;
      if (generated.plan.days.length !== days || generated.plan.days.some(d => !d.blocks.length || d.blocks.flatMap(b => b.exercises).some(p => !GYM_EXERCISE_CATALOG.some(e => e.id === p.exerciseId)))) invalid.push({ days, equipment, goal, experience });
    }
    record('BUS-001', 'Routine matrix: all days/equipment/goals/experience resolve catalog exercises', { combinations: 180, invalid: [] }, { combinations, invalid }, combinations === 180 && !invalid.length, 'generateRoutine: 180 real-catalog combinations executed');

    const beginner = generateRoutine(profile, GYM_EXERCISE_CATALOG, '2026-09-09');
    const prescribed = beginner.plan.days[0].blocks[0].exercises[0];
    const rule = beginner.progressionRules.find(r => r.exerciseId === prescribed.exerciseId)!;
    const result = evaluateProgression(rule, workout(prescribed.exerciseId, Array(prescribed.sets).fill(prescribed.repetitions!.max)), 'qa-1');
    record('BUS-002', 'Perfect beginner session must not count as failure', { succeeded: true, failures: 0 }, { prescription: prescribed, rule: rule.config, result }, result.succeeded && result.nextState.consecutiveFailures === 0, 'routine-generator.ts prescription/progressionRule -> progression.service.ts evaluateProgression');

    const inter = generateRoutine({ ...profile, experience: 'intermediate' }, GYM_EXERCISE_CATALOG, '2026-09-09');
    const interPrescription = inter.plan.days[0].blocks[0].exercises[0];
    const interRule = inter.progressionRules.find(r => r.exerciseId === interPrescription.exerciseId)!;
    const interResult = evaluateProgression(interRule, workout(interPrescription.exerciseId, Array(interPrescription.sets).fill(interPrescription.repetitions!.max)), 'qa-2');
    record('BUS-003', 'Double progression advances at the prescribed upper range', { prescriptionMax: 10, succeeded: true }, { prescription: interPrescription, rule: interRule.config, result: interResult }, interResult.succeeded, 'Real generated intermediate leg-press: 3 x 10 vs rule max 12');

    const duration = beginner.plan.days.flatMap(d => d.blocks.flatMap(b => b.exercises)).find(p => p.durationSeconds)!;
    const durationRule = beginner.progressionRules.find(r => r.exerciseId === duration.exerciseId);
    const durationResult = evaluateProgression({ ...rule, exerciseId: duration.exerciseId }, workout(duration.exerciseId, Array(duration.sets).fill(null), 0), 'qa-duration');
    record('BUS-004', 'Timed exercises have no generated repetition rule and legacy rules do not penalize them', { failures: 0, generatedRule: false }, { exerciseId: duration.exerciseId, secondsPerSet: duration.durationSeconds, generatedRule: Boolean(durationRule), result: durationResult }, !durationRule && durationResult.nextState.consecutiveFailures === 0, 'Generated timed prescription and legacy repetition-rule evaluation are both checked');

    const priority = generateRoutine({ ...profile, priorityMuscles: ['chest', 'arms'] }, GYM_EXERCISE_CATALOG, '2026-09-09');
    const same = JSON.stringify(beginner.plan.days) === JSON.stringify(priority.plan.days);
    record('BUS-005', 'Selected priority muscles influence the generated routine', { samePlan: false }, { priorities: ['chest', 'arms'], sessionMinutes: 60, samePlan: same }, !same, 'createDay appends priority IDs after 6 template exercises then slices to 6');

    const shortStrength = generateRoutine({ ...profile, trainingGoal: 'strength', experience: 'intermediate', equipment: 'free-weights', sessionMinutes: 30 }, GYM_EXERCISE_CATALOG, '2026-09-09');
    const durationSeconds = shortStrength.plan.days.map(day => day.blocks.flatMap(b => b.exercises).reduce((total, p) => total + p.sets * (p.durationSeconds ?? p.repetitions!.min * (p.tempo!.eccentricSeconds + p.tempo!.pauseSeconds + p.tempo!.concentricSeconds)) + Math.max(0, p.sets - 1) * p.restSeconds, 0));
    record('BUS-006', 'Thirty-minute routine fits even minimum tempo/repetitions/rest time', { eachDayMaxSeconds: 1800 }, { minimumSecondsByDay: durationSeconds, includesWarmupOrTransitions: false }, durationSeconds.every(s => s <= 1800), 'Generated strength/intermediate/free-weights/30 min: explicit tempo and rests summed independently');
  });

  it('checks previous loads, repetitions, progression thresholds and idempotency', () => {
    const previous = workout('bench-press', [10, 9, 8]); previous.sets.forEach((s, i) => s.loadKg = [40, 50, 60][i]);
    const next = createWorkoutExercise({ exerciseId: 'bench-press', sets: 3, repetitions: { min: 8, max: 12 }, restSeconds: 90 }, false, previous);
    const loads = next.sets.map(s => s.loadKg);
    record('BUS-007', 'Prefill preserves corresponding loads of previous working sets', [40, 50, 60], loads, JSON.stringify(loads) === '[40,50,60]', 'createWorkoutExercise with previous working set loads 40/50/60');
    const off = createWorkoutExercise({ exerciseId: 'bench-press', sets: 3, repetitions: { min: 8, max: 12 }, restSeconds: 90 }, false, previous, false);
    record('BUS-008', 'Turning previous-load prefill off resets loads', [0, 0, 0], off.sets.map(s => s.loadKg), off.sets.every(s => s.loadKg === 0), 'createWorkoutExercise(..., prefillPreviousLoad=false)');
    const sides = createWorkoutExercise({ exerciseId: 'single-arm-dumbbell-row', sets: 2, repetitions: { min: 8, max: 12 }, restSeconds: 90 }, true);
    record('BUS-009', 'Per-side sets have distinct left/right identities', ['1:left','1:right','2:left','2:right'], sides.sets.map(s => `${s.setNumber}:${s.side}`), JSON.stringify(sides.sets.map(s => `${s.setNumber}:${s.side}`)) === '["1:left","1:right","2:left","2:right"]', 'createWorkoutExercise(..., perSide=true)');
    const rule = { exerciseId: 'bench-press', strategy: 'linear-progression' as const, config: { incrementKg: 2.5, deloadAfterFailures: 3, deloadPercent: 10, sets: 3, targetReps: 5 }, state: { nextLoadKg: 100, consecutiveFailures: 0, deloadCount: 0, lastEvaluatedSessionId: null } };
    const failures = [1,2,3].map(n => { const r = evaluateProgression(rule, workout('bench-press', [4,4,4], 100), `f-${n}`); rule.state = r.nextState; return r; });
    record('BUS-010', 'Exact configured failure threshold triggers one 10% deload', { failures: [1,2,0], loads: [100,100,90], deloadCount: 1 }, { failures: failures.map(r => r.nextState.consecutiveFailures), loads: failures.map(r => r.nextState.nextLoadKg), deloadCount: rule.state.deloadCount }, rule.state.nextLoadKg === 90 && rule.state.deloadCount === 1 && failures[1].nextState.consecutiveFailures === 2, 'evaluateProgression repeated failure sequence with explicit expected load');
    const state = stateFixture(); state.progression.exerciseRules = [rule]; state.workoutSessions = [{ id: 'finished', planDayId: null, scheduledDate: '2026-09-09', startedAt: now, completedAt: null, status: 'active', exercises: [workout('bench-press', [5,5,5], 90)], notes: null }];
    const service = new ProgressionService(); service.completeSession(state, 'finished', now); const first = JSON.stringify(state); service.completeSession(state, 'finished', now);
    record('BUS-011', 'Completing the same workout is progression-idempotent', { unchanged: true }, { unchanged: first === JSON.stringify(state), nextLoadKg: rule.state.nextLoadKg }, first === JSON.stringify(state), 'ProgressionService.completeSession invoked twice on same synthetic session');
    let rejected = false; try { estimateOneRepMax(100, 1.5); } catch { rejected = true; }
    record('BUS-012', '1RM handles single rep and rejects fractional reps', { singleRep: 100, fractionalRejected: true }, { singleRep: estimateOneRepMax(100, 1), fractionalRejected: rejected }, estimateOneRepMax(100, 1) === 100 && rejected, 'estimateOneRepMax boundary independent of UI');
  });

  it('executes superseries and local/remote timer interaction', async () => {
    const state = stateFixture();
    state.weeklyPlan.days = [{ id: 'superset', weekday: 3, name: 'Superserie QA', blocks: [{ id: 'block', type: 'superset', rounds: 2, restAfterRoundSeconds: 90, exercises: [{ exerciseId: 'dumbbell-curl', sets: 2, repetitions: { min: 10, max: 10 }, restSeconds: 0 }, { exerciseId: 'rope-triceps-pushdown', sets: 2, repetitions: { min: 10, max: 10 }, restSeconds: 0 }] }] }];
    state.workoutSessions = [{ id: 'active', planDayId: 'superset', scheduledDate: '2026-09-09', startedAt: now, completedAt: null, status: 'active', notes: null, exercises: state.weeklyPlan.days[0].blocks[0].exercises.map(p => createWorkoutExercise(p, false)) }];
    prepare(state); render(<MemoryRouter><WorkoutPage /></MemoryRouter>);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Completar serie 1' })); });
    const afterFirstHeading = screen.getByRole('heading', { level: 1 }).textContent;
    if (afterFirstHeading !== 'Extensión de tríceps con cuerda') {
      const nextButton = screen.queryByRole('button', { name: /Siguiente/ });
      if (nextButton) fireEvent.click(nextButton);
    }
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Completar serie 1' })); });
    const body = document.body.textContent ?? '';
    const hasNinetySecondRest = body.includes('01:30') || body.includes('1:30');
    record('BUS-013', 'Superset rests after the complete round', { restAfterB1Seconds: 90 }, { afterA1Heading: afterFirstHeading, rest90Visible: hasNinetySecondRest, activeSetStatuses: useStateStore.getState().state!.workoutSessions[0].exercises.map(e => ({ exerciseId:e.exerciseId, completed:e.sets.filter(s=>s.completedAt).length })) }, hasNinetySecondRest, 'Rendered WorkoutPage on synthetic 2-exercise superset; click A1 complete, Next, B1 complete');
    cleanup();
    vi.useFakeTimers(); vi.setSystemTime(new Date(now));
    vi.stubGlobal('Notification', { permission: 'granted' });
    const scheduled = vi.spyOn(pushApi, 'scheduleTimer').mockResolvedValue({ id: 'qa-timer' } as any);
    const cancelled = vi.spyOn(pushApi, 'cancelTimer').mockResolvedValue(undefined);
    const hook = renderHook(() => useRestTimer(true));
    await act(async () => { await hook.result.current.start(60); });
    await act(async () => { hook.result.current.add(30); await Promise.resolve(); await Promise.resolve(); });
    const calls = scheduled.mock.calls.map(args => args[0]);
    record('BUS-014', 'Extending rest updates the remote push deadline as well as local time', { localRemaining: 90, remoteDueAfterSeconds: 90 }, { localRemaining: hook.result.current.remaining, remoteSchedules: calls, remoteCancellations: cancelled.mock.calls.length }, hook.result.current.remaining === 90 && calls.at(-1) === 90, 'useRestTimer(true): start(60), add(30), push API mocked to inspect deadline requests');
    vi.unstubAllGlobals();
  });

  it('validates exercise inputs before completion and persistence callbacks', () => {
    const exercise = GYM_EXERCISE_CATALOG.find(e => e.id === 'bench-press')!;
    const base = workout('bench-press', [5]).sets[0]; base.completedAt = null;
    const save = vi.fn(); render(<SetRow set={base} exercise={exercise} showRpe showRir onSave={save} />);
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Carga en kilogramos, serie 1' }), { target: { value: '-10' } });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Repeticiones, serie 1' }), { target: { value: '1.5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Completar serie 1' }));
    const completed = save.mock.calls.filter(c => c[1] === true).map(c => c[0]);
    record('BUS-015', 'Negative load/fractional repetition cannot be marked complete', { completionCallbacks: 0 }, { completionCallbacks: completed.length, saved: completed }, completed.length === 0, 'Rendered SetRow: change load=-10, repetitions=1.5, Complete');
    cleanup();
    const rpeSave = vi.fn(); render(<SetRow set={base} exercise={exercise} showRpe showRir onSave={rpeSave} />);
    const rpeInput = screen.getByRole('spinbutton', { name: 'Esfuerzo percibido RPE, serie 1' });
    fireEvent.change(rpeInput, { target: { value: '12' } }); fireEvent.blur(rpeInput);
    const badRpeSaved = rpeSave.mock.calls.some(c => c[0].rpe === 12);
    fireEvent.click(screen.getByRole('button', { name: 'Completar serie 1' }));
    record('BUS-016', 'RPE outside 1..10 is rejected before autosave', { invalidSaved: false, completionRejected: true }, { invalidSaved: badRpeSaved, completionRejected: rpeSave.mock.calls.every(c => c[1] !== true) }, !badRpeSaved, 'SetRow rpe=12 blur and complete; completion validates but blur calls save with 12');
  });

  it('cross-checks body calculations and newest weight initialization', () => {
    const input = { sex: 'female' as const, ageYears: 40, heightCm: 165, weightKg: 65, activityLevel: 'light' as const, goal: 'maintain' as const, neckCm: null, waistCm: null, hipCm: null };
    const result = calculateBodyMetrics(input);
    record('BUS-017', 'Female energy/BMI independent arithmetic reference', { bmi: 23.9, bmr: 1320, tdee: 1815 }, { bmi: result.bmi, bmr: result.basalMetabolicRateKcal, tdee: result.totalDailyEnergyExpenditureKcal }, result.bmi === 23.9 && result.basalMetabolicRateKcal === 1320 && result.totalDailyEnergyExpenditureKcal === 1815, '(10*65)+(6.25*165)-(5*40)-161=1320.25; factor 1.375');
    let unsupportedRejected = false;
    try { calculateBodyMetrics({ ...input, ageYears: 100, heightCm: 100, weightKg: 20, activityLevel: 'sedentary', goal: 'lose' }); }
    catch (error) { unsupportedRejected = error instanceof Error && error.message.includes('energía calculada'); }
    const macroCalories = result.macros.proteinGrams * 4 + result.macros.fatGrams * 9 + result.macros.carbohydrateGrams * 4;
    record('BUS-018', 'Unsupported energy budgets are rejected and accepted inputs have coherent macros', { unsupportedRejected: true, macroCaloriesWithinRounding: true }, { unsupportedRejected, targetCalories: result.targetCaloriesKcal, macroCalories }, unsupportedRejected && Math.abs(macroCalories - result.targetCaloriesKcal) <= 10, 'Unrepresentable fixture is rejected with explanation; supported female input remains arithmetically coherent');
    let rejectsPartial = false; try { calculateBodyMetrics({ ...input, neckCm: 35 }); } catch { rejectsPartial = true; }
    record('BUS-019', 'Optional perimeters are all-or-valid, not partial estimates', { partialRejected: true, noPerimetersFat: null }, { partialRejected: rejectsPartial, noPerimetersFat: result.bodyFatPercent }, rejectsPartial && result.bodyFatPercent === null, 'calculateBodyMetrics null perimeters and only-neck cases');
    const state = stateFixture();
    state.bodyWeight.entries = [{ id: 'old', measuredAt: '2026-08-01T12:00:00Z', weightKg: 80, note: null }, { id: 'new', measuredAt: '2026-09-09T12:00:00Z', weightKg: 75, note: null }];
    state.bodyMetrics.entries = [{ id: 'metric-old', measuredAt: '2026-08-01T12:00:00Z', weightKg: 80, neckCm: null, waistCm: null, hipCm: null, ...calculateBodyMetrics({ ...input, sex: 'male', ageYears: 30, heightCm: 180, weightKg: 80 }), note: null }];
    prepare(state); render(<MetricsPage />);
    const weightInput = screen.getByRole('spinbutton', { name: 'Peso kg' }) as HTMLInputElement;
    record('BUS-020', 'Metrics form prefills latest chronological body weight', { weightKg: 75 }, { weightKg: Number(weightInput.value) }, Number(weightInput.value) === 75, 'MetricsPage render: latest metric Aug1=80kg; newer dashboard weight Sep9=75kg');
  });

  it('checks in-progress input against late acknowledgement of another field', () => {
    const exercise = GYM_EXERCISE_CATALOG.find(e => e.id === 'bench-press')!;
    const base = workout('bench-press', [5]).sets[0];
    base.completedAt = null; base.rpe = null; base.rir = null;
    let acknowledgeSave: (() => void) | undefined;
    function ControlledParent() {
      const [stored, setStored] = React.useState(base);
      return <SetRow set={stored} exercise={exercise} showRpe showRir onSave={(next) => { acknowledgeSave = () => setStored(next); }} />;
    }
    render(<ControlledParent />);
    const rpeInput = screen.getByRole('spinbutton', { name: 'Esfuerzo percibido RPE, serie 1' });
    const rirInput = screen.getByRole('spinbutton', { name: 'Repeticiones en reserva RIR, serie 1' }) as HTMLInputElement;
    fireEvent.change(rpeInput, { target: { value: '8' } });
    fireEvent.blur(rpeInput);
    fireEvent.change(rirInput, { target: { value: '2' } });
    const beforeAcknowledgement = rirInput.value;
    act(() => { acknowledgeSave!(); });
    record('BUS-027', 'Acknowledgement of RPE save preserves a newer RIR edit in progress', { rirBefore: '2', rirAfter: '2' }, { rirBefore: beforeAcknowledgement, rirAfter: rirInput.value }, rirInput.value === '2', 'ControlledParent delays onBlur RPE=8 prop acknowledgement; user types RIR=2; then prior save acknowledgement updates set prop; supports root UI-002');
  });

  it('checks local calendar overrides, heatmap boundaries and reminder end-of-month', () => {
    const plan = { days: [{ id: 'monday', weekday: 1, name: 'Monday', blocks: [] }, { id: 'wednesday', weekday: 3, name: 'Wednesday', blocks: [] }] };
    const override = { id: 'move', baseDayId: 'monday', originalDate: '2026-09-07', scheduledDate: '2026-09-09', reason: 'QA', createdAt: now };
    const before = JSON.stringify(plan);
    const original = effectivePlanDaysForDate(plan, [override], '2026-09-07').map(d=>d.id);
    const moved = effectivePlanDaysForDate(plan, [override], '2026-09-09').map(d=>d.id);
    const nextMonday = effectivePlanDaysForDate(plan, [override], '2026-09-14').map(d=>d.id);
    record('BUS-021', 'One-day reschedule removes only original occurrence and keeps base plan', { original: [], moved: ['wednesday','monday'], nextMonday: ['monday'], unchanged: true }, { original, moved, nextMonday, unchanged: before===JSON.stringify(plan) }, !original.length && moved.length===2 && nextMonday[0]==='monday' && before===JSON.stringify(plan), 'effectivePlanDaysForDate original/moved/following-week dates');
    const snapshot = stateFixture(); snapshot.workoutSessions = ['2025-09-09','2025-09-10','2026-09-09','2026-09-10'].map((date, i) => ({ id: `h${i}`, status: 'completed', scheduledDate: date, startedAt: now, completedAt: now, planDayId: null, exercises: [], notes: null }));
    const heatmap = buildTrainingHeatmap(snapshot.workoutSessions, new Date('2026-09-09T12:00:00'));
    record('BUS-022', 'Constancy window is exactly 365 unique local days excluding future/old days', { length:365,first:'2025-09-10',last:'2026-09-09',total:2 }, { length:heatmap.days.length,first:heatmap.days[0].key,last:heatmap.days.at(-1)!.key,total:heatmap.total }, heatmap.days.length===365 && heatmap.days[0].key==='2025-09-10' && heatmap.days.at(-1)!.key==='2026-09-09' && heatmap.total===2 && new Set(heatmap.days.map(d=>d.key)).size===365, 'buildTrainingHeatmap controlled date, synthetic boundary sessions');
    const months = [addOneMonth('2024-01-31T12:00:00Z'),addOneMonth('2025-01-31T12:00:00Z'),addOneMonth('2026-12-31T12:00:00Z')];
    const due = isMeasurementDue({ enabled:true,intervalMonths:1,nextDueAt:now,lastNotifiedAt:null }, new Date(now));
    record('BUS-023', 'Monthly reminder clamps month end and is due at exact deadline', { months:['2024-02-29T12:00:00.000Z','2025-02-28T12:00:00.000Z','2027-01-31T12:00:00.000Z'],due:true }, { months,due }, months[0]==='2024-02-29T12:00:00.000Z' && months[1]==='2025-02-28T12:00:00.000Z' && months[2]==='2027-01-31T12:00:00.000Z' && due, 'addOneMonth leap/non-leap/year rollover and isMeasurementDue exact boundary');
    const scores = calculateRecentMuscleScores([{ id:'m',status:'completed',scheduledDate:'2026-09-09',startedAt:now,completedAt:now,planDayId:null,notes:null,exercises:[workout('bench-press',[5,5,5])] }],GYM_EXERCISE_CATALOG);
    record('BUS-024', 'Muscle stimulus uses 2:1 primary/secondary weighting', { chest:6,triceps:3,sessionCount:1 }, { chest:scores.scores.get('pectoralis-major'),triceps:scores.scores.get('triceps'),sessionCount:scores.sessionCount }, scores.scores.get('pectoralis-major')===6 && scores.scores.get('triceps')===3 && scores.sessionCount===1, 'calculateRecentMuscleScores synthetic 3 completed bench-press sets');
  });

  it('inspects weight chart temporal scale and generated defaults', () => {
    const entries = [{id:'d1',measuredAt:'2026-01-01T12:00:00Z',weightKg:80,note:null},{id:'d2',measuredAt:'2026-01-02T12:00:00Z',weightKg:79,note:null},{id:'d3',measuredAt:'2026-09-09T12:00:00Z',weightKg:78,note:null}];
    const view = render(<WeightChart entries={entries} targetKg={75} />);
    const xs = [...view.container.querySelectorAll('.weight-point')].map(n=>Number(n.getAttribute('cx')));
    const gaps = [xs[1]-xs[0],xs[2]-xs[1]];
    record('BUS-025', 'Weight trend horizontal distance preserves elapsed calendar time', { firstGapMuchSmallerThanSecond:true }, { dates:entries.map(e=>e.measuredAt),xs,gaps }, gaps[0] < gaps[1]/10, 'Rendered WeightChart Jan1/Jan2/Sep9; measured svg point cx attributes');
    const bodyweightRoutine = generateRoutine({ ...profile,equipment:'bodyweight' }, GYM_EXERCISE_CATALOG, '2026-09-09');
    const requiredBar = bodyweightRoutine.plan.days.flatMap(d=>d.blocks.flatMap(b=>b.exercises)).filter(p=>GYM_EXERCISE_CATALOG.find(e=>e.id===p.exerciseId)?.equipment.some(x=>x.includes('dominadas'))).map(p=>p.exerciseId);
    const equipmentForm = readFileSync('frontend/src/features/onboarding/OnboardingWizard.tsx', 'utf8');
    const declaredRequired = equipmentForm.includes('Peso corporal con barra') && equipmentForm.includes('Necesitas barra de dominadas') && !equipmentForm.includes('barra de dominadas opcional');
    record('BUS-026', 'Bodyweight equipment disclosure matches the generated requirement', { barExplicitlyRequired: true }, { requiredBarExercises: requiredBar, barExplicitlyRequired: declaredRequired }, requiredBar.length > 0 && declaredRequired, 'Contract correction: the mode explicitly requires a pull-up bar and auxiliary equipment; this does not claim a new no-equipment mode');
    expect(cases.length).toBeGreaterThanOrEqual(26);
  });
});
