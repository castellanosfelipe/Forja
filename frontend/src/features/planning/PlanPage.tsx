import { ArrowRight, CalendarClock, Layers3, Plus, Repeat2, Trash2 } from 'lucide-react';
import { FormEvent, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { EXERCISE_CATEGORIES } from '../exercises/exercise-categories';
import { useStateStore } from '../../stores/state.store';
import { formatDate, localDateKey, weekdayName } from '../../utils/dates';
import { Abbreviation } from '../../components/feedback/Abbreviation';
import type { PlanDay } from '../../types/state';
import { userFacingError } from '../../utils/user-facing-error';

type PendingOperation = 'add' | 'reschedule' | 'remove' | null;

export function formatRestDuration(value: number): string {
  const totalSeconds = Math.max(0, Math.round(value));
  if (totalSeconds === 0) return 'sin descanso';
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes && seconds) return `${minutes} min ${seconds} s`;
  if (minutes) return `${minutes} min`;
  return `${seconds} s`;
}

export function nextDateForWeekday(weekday: number, from = new Date()): string {
  const date = new Date(from);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + ((weekday - date.getDay() + 7) % 7));
  return localDateKey(date);
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

function operationError(cause: unknown, action: string): string {
  return userFacingError(cause, `No pudimos ${action}. Inténtalo de nuevo.`);
}

export function PlanPage() {
  const state = useStateStore((store) => store.state);
  const update = useStateStore((store) => store.update);
  const [dayId, setDayId] = useState('');
  const [originalDate, setOriginalDate] = useState(localDateKey());
  const [scheduledDate, setScheduledDate] = useState(localDateKey());
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [pendingOperation, setPendingOperation] = useState<PendingOperation>(null);
  const builderCardRef = useRef<HTMLElement>(null);
  const builderHeadingRef = useRef<HTMLHeadingElement>(null);
  const exerciseSelectRef = useRef<HTMLSelectElement>(null);
  const rescheduleCardRef = useRef<HTMLElement>(null);
  const rescheduleHeadingRef = useRef<HTMLHeadingElement>(null);
  const [pendingRemoval, setPendingRemoval] = useState<
    | { kind: 'prescription'; dayId: string; blockId: string; exerciseId: string; label: string }
    | { kind: 'override'; id: string; label: string }
    | null
  >(null);
  const [builder, setBuilder] = useState({ weekday: '1', dayName: 'Día A', exerciseId: '', blockType: 'standard' as 'standard' | 'superset', sets: '3', repMin: '5', repMax: '5', restSeconds: '120' });

  const days = useMemo(() => [...(state?.weeklyPlan.days ?? [])].sort((a, b) => a.weekday - b.weekday), [state]);
  if (!state) return null;
  const loadedState = state;
  const builderExercise = loadedState.exerciseLibrary.find((exercise) => exercise.id === builder.exerciseId);

  function selectDayForReschedule(day: PlanDay, moveFocus = false) {
    const alignedOriginalDate = nextDateForWeekday(day.weekday);
    setDayId(day.id);
    setOriginalDate(alignedOriginalDate);
    setScheduledDate(addDays(alignedOriginalDate, 1));
    setFeedback(null);
    if (moveFocus) {
      rescheduleCardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      rescheduleHeadingRef.current?.focus({ preventScroll: true });
    }
  }

  function focusBuilder() {
    builderCardRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    builderHeadingRef.current?.focus({ preventScroll: true });
    exerciseSelectRef.current?.focus({ preventScroll: true });
  }

  async function reschedule(event: FormEvent) {
    event.preventDefault();
    if (pendingOperation) return;
    setFeedback(null);
    if (!dayId) { setFeedback({ kind: 'error', text: 'Selecciona el día del plan que quieres mover.' }); return; }
    if (originalDate === scheduledDate) { setFeedback({ kind: 'error', text: 'La nueva fecha debe ser diferente de la fecha original.' }); return; }
    const selectedDay = days.find((day) => day.id === dayId);
    if (selectedDay && new Date(`${originalDate}T12:00:00`).getDay() !== selectedDay.weekday) {
      setFeedback({ kind: 'error', text: `La fecha original debe corresponder a un ${weekdayName(selectedDay.weekday)}.` });
      return;
    }
    if (loadedState.scheduleOverrides.some((item) => item.baseDayId === dayId && item.originalDate === originalDate)) {
      setFeedback({ kind: 'error', text: 'Esa sesión ya tiene una reprogramación. Elimina el cambio existente antes de crear otro.' });
      return;
    }
    setPendingOperation('reschedule');
    try {
      await update((draft) => {
        draft.scheduleOverrides.push({
          id: crypto.randomUUID(),
          baseDayId: dayId,
          originalDate,
          scheduledDate,
          reason: reason.trim() || 'Reprogramación personal',
          createdAt: new Date().toISOString(),
        });
      });
      setReason('');
      setFeedback({ kind: 'success', text: 'Sesión reprogramada sin modificar el plan base.' });
    } catch (cause) {
      setFeedback({ kind: 'error', text: operationError(cause, 'guardar la reprogramación') });
    } finally {
      setPendingOperation(null);
    }
  }

  async function addToBasePlan(event: FormEvent) {
    event.preventDefault();
    if (pendingOperation) return;
    setFeedback(null);
    if (!builder.exerciseId) { setFeedback({ kind: 'error', text: 'Selecciona un ejercicio de la biblioteca.' }); return; }
    if (!builderExercise) { setFeedback({ kind: 'error', text: 'El ejercicio seleccionado ya no está disponible en la biblioteca.' }); return; }
    const existingDay = loadedState.weeklyPlan.days.find((candidate) => candidate.weekday === Number(builder.weekday));
    const duplicate = existingDay?.blocks.some((block) => block.exercises.some((item) => item.exerciseId === builder.exerciseId));
    if (duplicate) { setFeedback({ kind: 'error', text: 'Ese ejercicio ya forma parte del día seleccionado.' }); return; }
    if (builderExercise?.measurement !== 'duration' && Number(builder.repMin) > Number(builder.repMax)) {
      setFeedback({ kind: 'error', text: 'Las repeticiones mínimas no pueden superar las máximas.' });
      return;
    }
    const sets = Number(builder.sets);
    const repetitionMin = Number(builder.repMin);
    const repetitionMax = Number(builder.repMax);
    const restSeconds = Number(builder.restSeconds);
    if (!Number.isInteger(sets) || sets < 1 || sets > 20 || !Number.isInteger(restSeconds) || restSeconds < 0 || restSeconds > 3600) {
      setFeedback({ kind: 'error', text: 'Revisa las series y el descanso: deben ser números enteros dentro de los límites indicados.' });
      return;
    }
    if ((!Number.isInteger(repetitionMax) || repetitionMax < 1) || (builderExercise.measurement !== 'duration' && (!Number.isInteger(repetitionMin) || repetitionMin < 1))) {
      setFeedback({ kind: 'error', text: builderExercise.measurement === 'duration' ? 'La duración debe ser un número entero mayor que cero.' : 'Las repeticiones deben ser números enteros mayores que cero.' });
      return;
    }
    setPendingOperation('add');
    try {
      await update((draft) => {
        const weekday = Number(builder.weekday);
        let day = draft.weeklyPlan.days.find((candidate) => candidate.weekday === weekday);
        if (!day) {
          day = { id: `${weekday}-${crypto.randomUUID().slice(0, 6)}`, weekday, name: builder.dayName.trim() || `Día ${weekdayName(weekday)}`, blocks: [] };
          draft.weeklyPlan.days.push(day);
        }
        const blockId = `${builder.blockType}-${weekday}`;
        let block = day.blocks.find((candidate) => candidate.id === blockId);
        if (!block) {
          block = { id: blockId, type: builder.blockType, ...(builder.blockType === 'superset' ? { rounds: sets, restAfterRoundSeconds: restSeconds } : {}), exercises: [] };
          day.blocks.push(block);
        }
        const exercise = draft.exerciseLibrary.find((candidate) => candidate.id === builder.exerciseId);
        block.exercises.push({
          exerciseId: builder.exerciseId,
          sets,
          ...(exercise?.measurement === 'duration'
            ? { durationSeconds: repetitionMax }
            : { repetitions: { min: repetitionMin, max: repetitionMax } }),
          restSeconds: builder.blockType === 'superset' ? 0 : restSeconds,
        });
        if (exercise?.measurement === 'repetitions' && !draft.progression.exerciseRules.some((rule) => rule.exerciseId === exercise.id)) {
          draft.progression.exerciseRules.push({
            exerciseId: exercise.id,
            strategy: 'linear-progression',
            config: { incrementKg: exercise.isBodyweight ? 1 : 2.5, deloadAfterFailures: 3, deloadPercent: 10, sets, targetReps: repetitionMax },
            state: { nextLoadKg: 0, consecutiveFailures: 0, deloadCount: 0, lastEvaluatedSessionId: null },
          });
        }
      });
      setBuilder((current) => ({ ...current, exerciseId: '' }));
      setFeedback({ kind: 'success', text: 'Ejercicio añadido al plan semanal.' });
    } catch (cause) {
      setFeedback({ kind: 'error', text: operationError(cause, 'añadir el ejercicio al plan') });
    } finally {
      setPendingOperation(null);
    }
  }

  async function removePrescription(dayIdToEdit: string, blockId: string, exerciseId: string) {
    if (pendingOperation) return;
    setPendingOperation('remove');
    try {
      await update((draft) => {
        const day = draft.weeklyPlan.days.find((candidate) => candidate.id === dayIdToEdit);
        const block = day?.blocks.find((candidate) => candidate.id === blockId);
        if (!day || !block) return;
        block.exercises = block.exercises.filter((candidate) => candidate.exerciseId !== exerciseId);
        day.blocks = day.blocks.filter((candidate) => candidate.exercises.length > 0);
        draft.weeklyPlan.days = draft.weeklyPlan.days.filter((candidate) => candidate.blocks.length > 0);
      });
      setPendingRemoval(null);
      setFeedback({ kind: 'success', text: 'Ejercicio retirado del plan base.' });
    } catch (cause) {
      setPendingRemoval(null);
      setFeedback({ kind: 'error', text: operationError(cause, 'quitar el ejercicio del plan') });
    } finally {
      setPendingOperation(null);
    }
  }

  async function removeOverride(id: string) {
    if (pendingOperation) return;
    setPendingOperation('remove');
    try {
      await update((draft) => {
        draft.scheduleOverrides = draft.scheduleOverrides.filter((item) => item.id !== id);
      });
      setPendingRemoval(null);
      setFeedback({ kind: 'success', text: 'Reprogramación eliminada.' });
    } catch (cause) {
      setPendingRemoval(null);
      setFeedback({ kind: 'error', text: operationError(cause, 'eliminar la reprogramación') });
    } finally {
      setPendingOperation(null);
    }
  }

  return (
    <main className="page">
      <header className="page-header"><div><p className="eyebrow">Ritmo sostenible</p><h1>{state.weeklyPlan.name}</h1><p>El plan base se conserva; cada semana puede adaptarse a tu vida.</p></div></header>
      {feedback && <div className={feedback.kind === 'error' ? 'error-banner page-feedback' : 'notice-banner'} role={feedback.kind === 'error' ? 'alert' : 'status'}>{feedback.text}<button className="icon-button" type="button" aria-label="Cerrar aviso" onClick={() => setFeedback(null)}>×</button></div>}

      <section className="plan-layout">
        <div className="week-column">
          {days.map((day) => (
            <article className="plan-day-card" key={day.id}>
              <header><div className="day-number">{day.weekday}</div><div><p>{weekdayName(day.weekday)}</p><h2>{day.name}</h2></div><span>{day.blocks.reduce((sum, block) => sum + block.exercises.length, 0)} ejercicios</span></header>
              <div className="plan-blocks">
                {day.blocks.map((block) => (
                  <div className="plan-block" key={block.id}>
                    <div className="block-type">
                      {block.type === 'superset'
                        ? <><Repeat2 size={15} /> Superserie{block.rounds ? ` · ${block.rounds} rondas` : ''}{block.restAfterRoundSeconds !== undefined ? ` · ${formatRestDuration(block.restAfterRoundSeconds)} entre rondas` : ''}</>
                        : <><Layers3 size={15} /> Bloque</>}
                    </div>
                    <ol>
                      {block.exercises.map((prescription, prescriptionIndex) => {
                        const exercise = state.exerciseLibrary.find((item) => item.id === prescription.exerciseId);
                        const label = exercise?.name ?? 'Ejercicio no disponible';
                        const tempo = prescription.tempo ? `${prescription.tempo.eccentricSeconds}–${prescription.tempo.pauseSeconds}–${prescription.tempo.concentricSeconds}` : null;
                        return <li key={`${prescription.exerciseId}-${prescriptionIndex}`}><strong>{label}</strong><span>{prescription.sets} × {prescription.durationSeconds !== undefined ? `${prescription.durationSeconds} s` : prescription.repetitions ? `${prescription.repetitions.min}–${prescription.repetitions.max}` : 'libre'}{block.type === 'superset' ? ' · sin descanso entre ejercicios' : prescription.restSeconds === 0 ? ' · sin descanso' : ` · ${formatRestDuration(prescription.restSeconds)} de descanso`}{tempo ? ` · tempo ${tempo}` : ''}{prescription.targetRpe ? <> · <span className="plan-rpe"><Abbreviation code="RPE" /> {prescription.targetRpe}</span></> : null}</span><button className="plan-remove-button" type="button" disabled={pendingOperation !== null} aria-label={`Quitar ${label} de ${day.name}`} onClick={() => setPendingRemoval({ kind: 'prescription', dayId: day.id, blockId: block.id, exerciseId: prescription.exerciseId, label })}><Trash2 size={14} /></button></li>;
                      })}
                    </ol>
                  </div>
                ))}
              </div>
              <button className="text-link" type="button" disabled={pendingOperation !== null} aria-controls="reschedule-form" aria-label={`Reprogramar ${weekdayName(day.weekday)} · ${day.name}`} onClick={() => selectDayForReschedule(day, true)}><CalendarClock size={16} /> Reprogramar este día</button>
            </article>
          ))}
          {days.length === 0 && <div className="empty-state"><CalendarClock size={34} /><h2>Tu semana aún está en blanco</h2><p>{state.exerciseLibrary.length ? 'Añade tu primer ejercicio y empieza a construir una semana que puedas sostener.' : 'Crea un ejercicio en la biblioteca antes de construir tu semana.'}</p>{state.exerciseLibrary.length ? <button className="primary-button" type="button" aria-controls="plan-builder-form" onClick={focusBuilder}><Plus size={17} /> Añadir primer ejercicio</button> : <Link className="primary-button" to="/library">Ir a la biblioteca</Link>}</div>}
        </div>

        <div className="aside-column">
        <aside className="content-card plan-builder-card" ref={builderCardRef}>
          <p className="eyebrow">Plan base</p><h2 ref={builderHeadingRef} tabIndex={-1}>Añadir movimiento</h2><p className="muted">Este cambio sí se repite cada semana.</p>
          <form id="plan-builder-form" aria-busy={pendingOperation === 'add'} onSubmit={addToBasePlan}>
            <fieldset className="stack-form form-fieldset" disabled={pendingOperation !== null}>
            <div className="date-pair"><label>Día<select value={builder.weekday} onChange={(event) => setBuilder({ ...builder, weekday: event.target.value })}>{[1, 2, 3, 4, 5, 6, 0].map((value) => <option key={value} value={value}>{weekdayName(value)}</option>)}</select></label><span /><label>Nombre<input required value={builder.dayName} onChange={(event) => setBuilder({ ...builder, dayName: event.target.value })} /></label></div>
            <label>Ejercicio<select ref={exerciseSelectRef} required value={builder.exerciseId} onChange={(event) => setBuilder({ ...builder, exerciseId: event.target.value })}><option value="">Selecciona desde la biblioteca</option>{EXERCISE_CATEGORIES.map((category) => { const categoryExercises = state.exerciseLibrary.filter((exercise) => exercise.category === category.id).sort((left, right) => left.name.localeCompare(right.name, 'es')); return categoryExercises.length ? <optgroup key={category.id} label={`${category.label} · ${categoryExercises.length}`}>{categoryExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</optgroup> : null; })}</select></label>
            <label>Tipo de bloque<select value={builder.blockType} onChange={(event) => setBuilder({ ...builder, blockType: event.target.value as 'standard' | 'superset' })}><option value="standard">Estándar</option><option value="superset">Superserie</option></select></label>
            <div className={`builder-numbers ${builderExercise?.measurement === 'duration' ? 'two-columns' : ''}`}><label>Series<input type="number" min="1" max="20" required value={builder.sets} onChange={(event) => setBuilder({ ...builder, sets: event.target.value })} /></label>{builderExercise?.measurement !== 'duration' && <label>Repeticiones mínimas<input type="number" min="1" max="1000" required value={builder.repMin} onChange={(event) => setBuilder({ ...builder, repMin: event.target.value })} /></label>}<label>{builderExercise?.measurement === 'duration' ? 'Duración (seg.)' : 'Repeticiones máximas'}<input type="number" min="1" max={builderExercise?.measurement === 'duration' ? '86400' : '1000'} required value={builder.repMax} onChange={(event) => setBuilder({ ...builder, repMax: event.target.value })} /></label></div>
            <label>Descanso (segundos)<input type="number" min="0" max="3600" required value={builder.restSeconds} onChange={(event) => setBuilder({ ...builder, restSeconds: event.target.value })} /></label>
            <button className="primary-button" type="submit" disabled={state.exerciseLibrary.length === 0 || pendingOperation !== null}><Plus size={17} /> {pendingOperation === 'add' ? 'Añadiendo…' : 'Añadir al plan'}</button>
            </fieldset>
          </form>
        </aside>

        <aside className="content-card reschedule-card" ref={rescheduleCardRef}>
          <p className="eyebrow">Cambio puntual</p><h2 ref={rescheduleHeadingRef} tabIndex={-1}>Mover una sesión</h2><p className="muted" id="reschedule-help">Solo moverás esta sesión; las demás fechas del plan no cambiarán.</p>
          <form id="reschedule-form" aria-busy={pendingOperation === 'reschedule'} onSubmit={reschedule}>
            <fieldset className="stack-form form-fieldset" disabled={pendingOperation !== null || days.length === 0}>
            <label>Día del plan<select required aria-describedby="reschedule-help" value={dayId} onChange={(event) => { const selectedDay = days.find((day) => day.id === event.target.value); if (selectedDay) selectDayForReschedule(selectedDay); else setDayId(''); }}><option value="">Selecciona</option>{days.map((day) => <option key={day.id} value={day.id}>{weekdayName(day.weekday)} · {day.name}</option>)}</select></label>
            <div className="date-pair"><label>Fecha original<input type="date" required value={originalDate} onChange={(event) => setOriginalDate(event.target.value)} /></label><ArrowRight size={18} aria-hidden="true" /><label>Nueva fecha<input type="date" required value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} /></label></div>
            <label>Motivo<input maxLength={200} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Viaje, agenda, recuperación…" /></label>
            <button className="primary-button" type="submit" disabled={pendingOperation !== null || days.length === 0}>{pendingOperation === 'reschedule' ? 'Guardando…' : 'Guardar cambio'}</button>
            </fieldset>
          </form>

          <div className="override-list">
            <h3>Próximos cambios</h3>
            {state.scheduleOverrides.slice().sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate)).map((override) => (
              <div key={override.id}><CalendarClock size={17} /><div><strong>{formatDate(`${override.scheduledDate}T12:00:00`)}</strong><span>{override.reason} · desde {formatDate(`${override.originalDate}T12:00:00`, { day: 'numeric', month: 'short' })}</span></div><button type="button" disabled={pendingOperation !== null} aria-label={`Eliminar reprogramación del ${formatDate(`${override.scheduledDate}T12:00:00`)}`} onClick={() => setPendingRemoval({ kind: 'override', id: override.id, label: formatDate(`${override.scheduledDate}T12:00:00`) })}>×</button></div>
            ))}
            {state.scheduleOverrides.length === 0 && <p className="muted">Sin reprogramaciones.</p>}
          </div>
        </aside>
        </div>
      </section>
      <ConfirmDialog
        open={Boolean(pendingRemoval)}
        title={pendingRemoval?.kind === 'prescription' ? '¿Quitar este ejercicio?' : '¿Eliminar esta reprogramación?'}
        description={pendingRemoval?.kind === 'prescription' ? `${pendingRemoval.label} dejará de aparecer en este día del plan base.` : `La sesión del ${pendingRemoval?.label ?? ''} volverá a seguir el calendario base.`}
        confirmLabel={pendingRemoval?.kind === 'prescription' ? 'Quitar del plan' : 'Eliminar cambio'}
        busy={pendingOperation === 'remove'}
        onCancel={() => setPendingRemoval(null)}
        onConfirm={() => pendingRemoval?.kind === 'prescription'
          ? removePrescription(pendingRemoval.dayId, pendingRemoval.blockId, pendingRemoval.exerciseId)
          : pendingRemoval ? removeOverride(pendingRemoval.id) : undefined}
      />
    </main>
  );
}
