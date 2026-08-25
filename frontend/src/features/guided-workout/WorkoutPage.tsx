import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Dumbbell, MoonStar, Smartphone, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RestTimer } from '../../components/workout/RestTimer';
import { SetRow } from '../../components/workout/SetRow';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { stateApi } from '../../api/state.api';
import { useRestTimer } from '../../hooks/useRestTimer';
import { useWakeLock } from '../../hooks/useWakeLock';
import { useStateStore } from '../../stores/state.store';
import type { ExercisePrescription, PlanDay, WorkoutExercise, WorkoutSession, WorkoutSet } from '../../types/state';
import { localDateKey, weekdayName } from '../../utils/dates';
import { effectivePlanDaysForDate } from '../../utils/schedule';
import { userFacingError } from '../../utils/user-facing-error';
import { ExerciseAnimation } from '../exercises/ExerciseAnimation';
import { ExerciseGuideDialog } from '../exercises/ExerciseGuideDialog';
import { Abbreviation } from '../../components/feedback/Abbreviation';

export function WorkoutPage() {
  const state = useStateStore((store) => store.state);
  const update = useStateStore((store) => store.update);
  const refresh = useStateStore((store) => store.refresh);
  const flush = useStateStore((store) => store.flush);
  const active = state?.workoutSessions.find((session) => session.status === 'active') ?? null;
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [confirmExit, setConfirmExit] = useState(false);
  const [showTechnique, setShowTechnique] = useState(false);
  const timer = useRestTimer(state?.preferences.restTimer?.webPushWhenHidden !== false);
  const wakeLockEnabled = Boolean(active && state?.preferences.guidedWorkout?.requestWakeLock !== false);
  const wakeLock = useWakeLock(wakeLockEnabled);

  const prescriptions = useMemo(() => {
    if (!state || !active?.planDayId) return new Map<string, ExercisePrescription>();
    const day = state.weeklyPlan.days.find((candidate) => candidate.id === active.planDayId);
    return new Map(day?.blocks.flatMap((block) => block.exercises.map((item) => [item.exerciseId, item] as const)) ?? []);
  }, [active?.planDayId, state]);

  if (!state) return null;
  const loadedState = state;

  async function start(day: PlanDay) {
    setStarting(true); setMessage(null);
    try {
      const prescriptions = day.blocks.flatMap((block) => block.exercises);
      const previous = await Promise.all(prescriptions.map((item) => stateApi.previousExercise(item.exerciseId).catch(() => ({ exercise: null }))));
      const exercises = prescriptions.map((prescription, index) => createWorkoutExercise(
        prescription,
        loadedState.exerciseLibrary.find((item) => item.id === prescription.exerciseId)?.isPerSide ?? false,
        previous[index]?.exercise,
        loadedState.preferences.guidedWorkout?.prefillPreviousLoad !== false,
      ));
      const session: WorkoutSession = {
        id: crypto.randomUUID(), planDayId: day.id, scheduledDate: localDateKey(), startedAt: new Date().toISOString(), completedAt: null, status: 'active', exercises, notes: null,
      };
      await update((draft) => { draft.workoutSessions.push(session); });
      setExerciseIndex(0);
    } catch (cause) {
      setMessage(userFacingError(cause, 'No pudimos iniciar la sesión. Inténtalo de nuevo.'));
    } finally { setStarting(false); }
  }

  async function saveSet(exerciseId: string, setNumber: number, side: WorkoutSet['side'], next: WorkoutSet, justCompleted: boolean) {
    await update((draft) => {
      const session = draft.workoutSessions.find((item) => item.id === active?.id);
      const exercise = session?.exercises.find((item) => item.exerciseId === exerciseId);
      const index = exercise?.sets.findIndex((item) => item.setNumber === setNumber && item.side === side) ?? -1;
      if (exercise && index >= 0) exercise.sets[index] = next;
    });
    if (justCompleted) {
      const latest = useStateStore.getState().state;
      const latestSession = latest?.workoutSessions.find((item) => item.id === active?.id);
      const latestExercise = latestSession?.exercises.find((item) => item.exerciseId === exerciseId);
      const libraryExercise = latest?.exerciseLibrary.find((item) => item.id === exerciseId);
      const completedPair = !libraryExercise?.isPerSide || latestExercise?.sets
        .filter((item) => item.setNumber === setNumber)
        .every((item) => Boolean(item.completedAt));
      if (!completedPair) return;
      const seconds = prescriptions.get(exerciseId)?.restSeconds ?? loadedState.preferences.restTimer?.defaultSeconds ?? 120;
      void timer.start(seconds);
    }
  }

  async function completeWorkout() {
    if (!active || !navigator.onLine) { setMessage('Conéctate para cerrar la sesión y calcular la progresión. Tus series ya están guardadas.'); return; }
    const incompleteSets = active.exercises.reduce((sum, item) => sum + item.sets.filter((set) => !set.completedAt).length, 0);
    if (incompleteSets > 0) {
      setMessage(`Completa ${incompleteSets === 1 ? 'la serie pendiente' : `las ${incompleteSets} series pendientes`} antes de calcular la progresión.`);
      return;
    }
    setStarting(true); setMessage(null);
    try {
      await flush();
      if (useStateStore.getState().hasPendingChanges) throw new Error('Tu sesión está a salvo en este dispositivo, pero todavía no se guardó en tu cuenta. Vuelve a intentarlo antes de calcular el siguiente paso.');
      await stateApi.completeWorkout(active.id);
      await refresh();
      await timer.cancel();
    } catch (cause) { setMessage(userFacingError(cause, 'No pudimos completar la sesión. Inténtalo de nuevo.')); }
    finally { setStarting(false); }
  }

  async function cancelWorkout() {
    if (!active) return;
    await update((draft) => {
      const session = draft.workoutSessions.find((item) => item.id === active.id);
      if (session) { session.status = 'cancelled'; session.completedAt = new Date().toISOString(); }
    });
    await timer.cancel();
  }

  if (!active) {
    const todayKey = localDateKey();
    const effectiveToday = effectivePlanDaysForDate(loadedState.weeklyPlan, loadedState.scheduleOverrides, todayKey);
    const effectiveTodayIds = new Set(effectiveToday.map((day) => day.id));
    const movedAwayTodayIds = new Set(
      loadedState.scheduleOverrides
        .filter((override) => override.originalDate === todayKey)
        .map((override) => override.baseDayId),
    );
    const sessionOptions = [
      ...effectiveToday,
      ...[...loadedState.weeklyPlan.days]
        .sort((a, b) => a.weekday - b.weekday)
        .filter((day) => !effectiveTodayIds.has(day.id) && !movedAwayTodayIds.has(day.id)),
    ];
    return (
      <main className="page workout-start-page">
        <header className="page-header"><div><p className="eyebrow">Entrenamiento guiado</p><h1>¿Qué toca hoy?</h1><p>Las cargas anteriores aparecerán en cada serie.</p></div></header>
        {message && <div className="error-banner" role="alert">{message}</div>}
        <section className="session-picker">
          {sessionOptions.map((day) => (
            <button type="button" className={effectiveTodayIds.has(day.id) ? 'session-option recommended' : 'session-option'} key={day.id} disabled={starting} onClick={() => void start(day)}>
              <span>{effectiveTodayIds.has(day.id) ? 'Hoy' : weekdayName(day.weekday)}</span><h2>{day.name}</h2><p>{day.blocks.reduce((sum, block) => sum + block.exercises.length, 0)} ejercicios · {day.blocks.some((block) => block.type === 'superset') ? 'incluye superserie' : 'series estándar'}</p><div><Dumbbell size={20} /> Comenzar <ArrowRight size={18} /></div>
            </button>
          ))}
          {sessionOptions.length === 0 && <div className="empty-state session-empty"><Dumbbell size={32} /><h2>No hay sesiones en tu plan</h2><p>Crea una rutina para iniciar el entrenamiento guiado.</p><Link className="primary-button" to="/plan">Ir al plan</Link></div>}
          <div className="recovery-option"><MoonStar size={30} /><h2>Recuperación</h2><p>Si el cuerpo pide pausa, escuchar también es progresar.</p></div>
        </section>
      </main>
    );
  }

  const current = active.exercises[Math.min(exerciseIndex, active.exercises.length - 1)];
  const exercise = state.exerciseLibrary.find((item) => item.id === current?.exerciseId);
  const rule = state.progression.exerciseRules.find((item) => item.exerciseId === current?.exerciseId);
  const completedSets = active.exercises.reduce((sum, item) => sum + item.sets.filter((set) => set.completedAt).length, 0);
  const totalSets = active.exercises.reduce((sum, item) => sum + item.sets.length, 0);
  const showRpe = state.preferences.guidedWorkout?.showRpe !== false;
  const showRir = state.preferences.guidedWorkout?.showRir !== false;
  const metricColumns = showRpe && showRir ? 'metrics-both' : showRpe || showRir ? 'metrics-one' : 'metrics-none';
  if (!current || !exercise) return <main className="page"><div className="empty-state"><Dumbbell size={32} /><h1>No podemos continuar esta sesión</h1><p>Uno de sus ejercicios ya no está disponible. Cierra esta sesión para volver a elegir una rutina.</p><button className="danger-button" type="button" onClick={() => void cancelWorkout()}>Cerrar esta sesión</button></div></main>;

  return (
    <main className="guided-workout">
      <header className="workout-topbar"><button type="button" className="text-link" onClick={() => setConfirmExit(true)}><ArrowLeft size={18} /> Salir</button><div><span>{completedSets} de {totalSets} series</span><div className="progress-track" role="progressbar" aria-label="Progreso de la sesión" aria-valuemin={0} aria-valuemax={totalSets} aria-valuenow={completedSets}><i style={{ width: `${totalSets ? completedSets / totalSets * 100 : 0}%` }} /></div></div><span className={wakeLock.active ? 'wake-status active' : 'wake-status'} role="status"><Smartphone size={15} /> {wakeLock.active ? 'La pantalla permanecerá encendida' : wakeLock.supported ? 'La pantalla puede apagarse' : 'Este dispositivo no puede mantener la pantalla encendida'}</span></header>

      {timer.running && <RestTimer seconds={timer.remaining} onAdd={timer.add} onSkip={() => void timer.cancel()} />}
      {message && <div className="error-banner workout-message" role="alert">{message}</div>}

      <section className="workout-stage">
        <aside className="exercise-rail" aria-label="Ejercicios de la sesión">{active.exercises.map((item, index) => { const library = state.exerciseLibrary.find((candidate) => candidate.id === item.exerciseId); const complete = item.sets.every((set) => set.completedAt); return <button type="button" aria-current={index === exerciseIndex ? 'step' : undefined} className={index === exerciseIndex ? 'active' : ''} key={`${item.exerciseId}-${index}`} onClick={() => setExerciseIndex(index)}><span>{complete ? <CheckCircle2 size={17} /> : index + 1}</span><div><strong>{library?.name ?? 'Ejercicio no disponible'}</strong><small>{item.sets.filter((set) => set.completedAt).length}/{item.sets.length} series</small></div></button>; })}</aside>

        <div className="set-stage">
          <div className="exercise-title"><div className="workout-exercise-heading"><button className="workout-exercise-media" type="button" onClick={() => setShowTechnique(true)} aria-label={`Abrir guía orientativa de ${exercise.name}`}><ExerciseAnimation exercise={exercise} compact /></button><div><p className="eyebrow">Ejercicio {exerciseIndex + 1} de {active.exercises.length}</p><h1>{exercise.name}</h1><div className="tag-row">{exercise.isBodyweight && <span>Peso corporal</span>}{exercise.isPerSide && <span>Por lado</span>}<span>{exercise.measurement === 'duration' ? 'Tiempo' : 'Repeticiones'}</span>{prescriptions.get(exercise.id)?.tempo && <span>Tempo {formatTempo(prescriptions.get(exercise.id)!)}</span>}{prescriptions.get(exercise.id)?.targetRpe && <span>Objetivo <Abbreviation code="RPE" /> {prescriptions.get(exercise.id)?.targetRpe}</span>}</div>{prescriptions.get(exercise.id)?.coachingNote && <p className="coaching-note">{prescriptions.get(exercise.id)?.coachingNote}</p>}<button className="text-link technique-link" type="button" onClick={() => setShowTechnique(true)}><BookOpen size={16} /> Abrir guía orientativa</button></div></div>{rule && <div className="next-load"><small>Propuesta</small><strong>{rule.state.nextLoadKg} kg</strong><span>{progressionName(rule.strategy)}</span></div>}</div>
          <div className={`sets-header ${metricColumns}`}><span>Serie</span><span>Carga</span><span>{exercise.measurement === 'duration' ? 'Tiempo' : <Abbreviation code="REPS" />}</span>{showRpe && <span className="optional-metric rpe-field"><Abbreviation code="RPE" /></span>}{showRir && <span className="optional-metric rir-field"><Abbreviation code="RIR" /></span>}<span>Hecho</span></div>
          <div className="sets-list">{current.sets.map((set) => <SetRow key={`${set.setNumber}-${set.side ?? 'both'}`} set={set} exercise={exercise} showRpe={showRpe} showRir={showRir} onSave={(next, justCompleted) => void saveSet(current.exerciseId, set.setNumber, set.side, next, justCompleted)} />)}</div>
          <div className="exercise-navigation"><button className="secondary-button" type="button" disabled={exerciseIndex === 0} onClick={() => setExerciseIndex((index) => index - 1)}><ArrowLeft size={17} /> Anterior</button>{exerciseIndex < active.exercises.length - 1 ? <button className="primary-button" type="button" onClick={() => setExerciseIndex((index) => index + 1)}>Siguiente <ArrowRight size={17} /></button> : <div className="finish-action"><button className="finish-button" type="button" disabled={starting || completedSets !== totalSets} aria-describedby={completedSets !== totalSets ? 'finish-workout-hint' : undefined} onClick={() => void completeWorkout()}><Trophy size={19} /> {starting ? 'Calculando…' : 'Terminar sesión'}</button>{completedSets !== totalSets && <small id="finish-workout-hint">Completa las {totalSets - completedSets} series pendientes para calcular la progresión.</small>}</div>}</div>
        </div>
      </section>
      <ConfirmDialog
        open={confirmExit}
        title="¿Salir de la sesión?"
        description="La sesión se marcará como cancelada. Las series registradas permanecerán en tu historial, pero no se calculará la progresión."
        confirmLabel="Salir y cancelar"
        onCancel={() => setConfirmExit(false)}
        onConfirm={async () => { setConfirmExit(false); await cancelWorkout(); }}
      />
      <ExerciseGuideDialog exercise={exercise} open={showTechnique} onClose={() => setShowTechnique(false)} />
    </main>
  );
}

export function createWorkoutExercise(prescription: ExercisePrescription, perSide: boolean, previous?: WorkoutExercise | null, prefillPreviousLoad = true): WorkoutExercise {
  const previousLoad = prefillPreviousLoad ? previous?.sets.find((set) => set.loadKg !== null)?.loadKg ?? 0 : 0;
  const sides: Array<WorkoutSet['side']> = perSide ? ['left', 'right'] : [null];
  const sets = Array.from({ length: prescription.sets }, (_, index) => sides.map((side): WorkoutSet => ({
    setNumber: index + 1,
    loadKg: previousLoad,
    repetitions: prescription.repetitions?.min ?? null,
    durationSeconds: prescription.durationSeconds ?? null,
    side,
    rpe: null,
    rir: null,
    completedAt: null,
  }))).flat();
  return { exerciseId: prescription.exerciseId, sets, estimatedOneRepMaxKg: null, notes: null };
}

function formatTempo(prescription: ExercisePrescription): string {
  const tempo = prescription.tempo;
  return tempo ? `${tempo.eccentricSeconds}–${tempo.pauseSeconds}–${tempo.concentricSeconds}` : '';
}

function progressionName(strategy: string): string {
  if (strategy === 'greyskull-lp') return 'Greyskull · progresión lineal';
  return strategy === 'double-progression' ? 'Doble progresión' : 'Progresión lineal';
}
