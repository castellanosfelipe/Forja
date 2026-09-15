import { Check, RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { Exercise, WorkoutSet } from '../../types/state';

interface SetRowProps {
  set: WorkoutSet;
  exercise: Exercise;
  showRpe: boolean;
  showRir: boolean;
  onSave(next: WorkoutSet, justCompleted: boolean): void;
}

export function SetRow({ set, exercise, showRpe, showRir, onSave }: SetRowProps) {
  const [load, setLoad] = useState(set.loadKg?.toString() ?? '');
  const [repetitions, setRepetitions] = useState(set.repetitions?.toString() ?? '');
  const [duration, setDuration] = useState(set.durationSeconds?.toString() ?? '');
  const [rpe, setRpe] = useState(set.rpe?.toString() ?? '');
  const [rir, setRir] = useState(set.rir?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);
  const dirtyFields = useRef(new Set<string>());
  const loadRef = useRef<HTMLInputElement>(null);
  const measurementRef = useRef<HTMLInputElement>(null);
  const rpeRef = useRef<HTMLInputElement>(null);
  const rirRef = useRef<HTMLInputElement>(null);
  const errorId = `set-error-${useId().replaceAll(':', '')}`;

  useEffect(() => {
    function reconcile(key: string, current: string, incoming: number | null, apply: (value: string) => void) {
      const acknowledged = current === '' ? incoming === null : incoming === Number(current);
      if (!dirtyFields.current.has(key) || acknowledged) {
        dirtyFields.current.delete(key);
        apply(incoming?.toString() ?? '');
      }
    }
    reconcile('load', load, set.loadKg, setLoad);
    reconcile('repetitions', repetitions, set.repetitions, setRepetitions);
    reconcile('duration', duration, set.durationSeconds, setDuration);
    reconcile('rpe', rpe, set.rpe, setRpe);
    reconcile('rir', rir, set.rir, setRir);
  }, [set]);

  function change(key: string, next: string, apply: (value: string) => void) {
    dirtyFields.current.add(key);
    apply(next);
    setError(null);
  }

  function validate(requireMeasurement: boolean): boolean {
    const loadLimit = exercise.isBodyweight ? 500 : 2000;
    if (load !== '' && (!Number.isFinite(Number(load)) || Number(load) < 0 || Number(load) > loadLimit)) {
      setError(`La carga debe estar entre 0 y ${loadLimit} kg.`); loadRef.current?.focus(); return false;
    }
    const timed = exercise.measurement === 'duration';
    const measurement = timed ? duration : repetitions;
    const maximum = timed ? 86400 : 1000;
    if ((requireMeasurement && measurement === '') || (measurement !== '' && (!Number.isInteger(Number(measurement)) || Number(measurement) < 1 || Number(measurement) > maximum))) {
      setError(timed ? 'Indica una duración entera entre 1 y 86400 segundos.' : 'Indica al menos una repetición, sin decimales y hasta 1000.');
      measurementRef.current?.focus(); return false;
    }
    if (rpe !== '' && (!Number.isFinite(Number(rpe)) || Number(rpe) < 1 || Number(rpe) > 10)) {
      setError('El esfuerzo percibido debe estar entre 1 y 10.'); rpeRef.current?.focus(); return false;
    }
    if (rir !== '' && (!Number.isInteger(Number(rir)) || Number(rir) < 0 || Number(rir) > 10)) {
      setError('Las repeticiones en reserva deben ser enteras entre 0 y 10.'); rirRef.current?.focus(); return false;
    }
    return true;
  }

  function saveDraft() {
    if (!validate(Boolean(set.completedAt))) return;
    setError(null);
    onSave(value(), false);
  }

  function value(nextCompletedAt = set.completedAt): WorkoutSet {
    return {
      ...set,
      loadKg: load === '' ? null : Number(load),
      repetitions: repetitions === '' ? null : Number(repetitions),
      durationSeconds: duration === '' ? null : Number(duration),
      rpe: rpe === '' ? null : Number(rpe),
      rir: rir === '' ? null : Number(rir),
      completedAt: nextCompletedAt,
    };
  }

  function toggleComplete() {
    const wasComplete = Boolean(set.completedAt);
    if (!validate(!wasComplete)) return;
    setError(null);
    onSave(value(wasComplete ? null : new Date().toISOString()), !wasComplete);
  }

  const sideLabel = set.side === 'left' ? ', lado izquierdo' : set.side === 'right' ? ', lado derecho' : '';
  const seriesLabel = `serie ${set.setNumber}${sideLabel}`;
  const metricColumns = showRpe && showRir ? 'metrics-both' : showRpe || showRir ? 'metrics-one' : 'metrics-none';

  return (
    <div className={`set-row ${metricColumns}${set.completedAt ? ' complete' : ''}`} role="group" aria-label={`Datos de ${seriesLabel}`} aria-describedby={error ? errorId : undefined}>
      <span className="set-number" aria-label={set.side ? `${set.setNumber}, ${set.side === 'left' ? 'lado izquierdo' : 'lado derecho'}` : undefined}>{set.side ? `${set.setNumber}${set.side === 'left' ? 'I' : 'D'}` : set.setNumber}</span>
      {!exercise.isBodyweight && <label><small>kg</small><input ref={loadRef} aria-label={`Carga en kilogramos, ${seriesLabel}`} inputMode="decimal" type="number" min="0" max="2000" step="0.25" value={load} onChange={(event) => change('load', event.target.value, setLoad)} onBlur={saveDraft} /></label>}
      {exercise.isBodyweight && <label><small>lastre kg</small><input ref={loadRef} aria-label={`Lastre en kilogramos, ${seriesLabel}`} inputMode="decimal" type="number" min="0" max="500" step="0.25" value={load} onChange={(event) => change('load', event.target.value, setLoad)} onBlur={saveDraft} /></label>}
      {exercise.measurement === 'duration'
        ? <label><small>segundos</small><input ref={measurementRef} aria-label={`Duración en segundos, ${seriesLabel}`} aria-invalid={Boolean(error?.includes('duración'))} inputMode="numeric" type="number" min="1" max="86400" value={duration} onChange={(event) => change('duration', event.target.value, setDuration)} onBlur={saveDraft} /></label>
        : <label><small>reps</small><input ref={measurementRef} aria-label={`Repeticiones, ${seriesLabel}`} aria-invalid={Boolean(error?.includes('una repetición'))} inputMode="numeric" type="number" min="1" max="1000" value={repetitions} onChange={(event) => change('repetitions', event.target.value, setRepetitions)} onBlur={saveDraft} /></label>}
      {showRpe && <label className="optional-metric rpe-field"><small>Esfuerzo</small><input ref={rpeRef} aria-label={`Esfuerzo percibido RPE, ${seriesLabel}`} aria-invalid={Boolean(error?.includes('esfuerzo percibido'))} inputMode="decimal" type="number" min="1" max="10" step="0.5" value={rpe} onChange={(event) => change('rpe', event.target.value, setRpe)} onBlur={saveDraft} /></label>}
      {showRir && <label className="optional-metric rir-field"><small>En reserva</small><input ref={rirRef} aria-label={`Repeticiones en reserva RIR, ${seriesLabel}`} aria-invalid={Boolean(error?.includes('repeticiones en reserva'))} inputMode="numeric" type="number" min="0" max="10" value={rir} onChange={(event) => change('rir', event.target.value, setRir)} onBlur={saveDraft} /></label>}
      <button className="complete-set" type="button" onClick={toggleComplete} aria-label={`${set.completedAt ? 'Reabrir' : 'Completar'} ${seriesLabel}`}>{set.completedAt ? <RotateCcw size={18} /> : <Check size={20} />}</button>
      {error && <span className="set-row-error" id={errorId} role="alert">{error}</span>}
    </div>
  );
}
