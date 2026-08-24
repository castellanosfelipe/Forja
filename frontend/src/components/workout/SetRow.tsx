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
  const measurementRef = useRef<HTMLInputElement>(null);
  const rpeRef = useRef<HTMLInputElement>(null);
  const rirRef = useRef<HTMLInputElement>(null);
  const errorId = `set-error-${useId().replaceAll(':', '')}`;

  useEffect(() => {
    setLoad(set.loadKg?.toString() ?? ''); setRepetitions(set.repetitions?.toString() ?? '');
    setDuration(set.durationSeconds?.toString() ?? ''); setRpe(set.rpe?.toString() ?? ''); setRir(set.rir?.toString() ?? '');
  }, [set]);

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
    if (!wasComplete) {
      const measurement = exercise.measurement === 'duration' ? Number(duration) : Number(repetitions);
      if (!Number.isFinite(measurement) || measurement <= 0) {
        setError(exercise.measurement === 'duration' ? 'Indica una duración mayor que cero.' : 'Indica al menos una repetición.');
        measurementRef.current?.focus();
        return;
      }
      if (rpe !== '' && (Number(rpe) < 1 || Number(rpe) > 10)) {
        setError('El esfuerzo percibido debe estar entre 1 y 10.');
        rpeRef.current?.focus();
        return;
      }
      if (rir !== '' && (Number(rir) < 0 || Number(rir) > 10)) {
        setError('Las repeticiones en reserva deben estar entre 0 y 10.');
        rirRef.current?.focus();
        return;
      }
    }
    setError(null);
    onSave(value(wasComplete ? null : new Date().toISOString()), !wasComplete);
  }

  const sideLabel = set.side === 'left' ? ', lado izquierdo' : set.side === 'right' ? ', lado derecho' : '';
  const seriesLabel = `serie ${set.setNumber}${sideLabel}`;
  const metricColumns = showRpe && showRir ? 'metrics-both' : showRpe || showRir ? 'metrics-one' : 'metrics-none';

  return (
    <div className={`set-row ${metricColumns}${set.completedAt ? ' complete' : ''}`} role="group" aria-label={`Datos de ${seriesLabel}`} aria-describedby={error ? errorId : undefined}>
      <span className="set-number" aria-label={set.side ? `${set.setNumber}, ${set.side === 'left' ? 'lado izquierdo' : 'lado derecho'}` : undefined}>{set.side ? `${set.setNumber}${set.side === 'left' ? 'I' : 'D'}` : set.setNumber}</span>
      {!exercise.isBodyweight && <label><small>kg</small><input aria-label={`Carga en kilogramos, ${seriesLabel}`} inputMode="decimal" type="number" min="0" max="2000" step="0.25" value={load} onChange={(event) => setLoad(event.target.value)} onBlur={() => onSave(value(), false)} /></label>}
      {exercise.isBodyweight && <label><small>lastre kg</small><input aria-label={`Lastre en kilogramos, ${seriesLabel}`} inputMode="decimal" type="number" min="0" max="500" step="0.25" value={load} onChange={(event) => setLoad(event.target.value)} onBlur={() => onSave(value(), false)} /></label>}
      {exercise.measurement === 'duration'
        ? <label><small>segundos</small><input ref={measurementRef} aria-label={`Duración en segundos, ${seriesLabel}`} aria-invalid={Boolean(error && Number(duration) <= 0)} inputMode="numeric" type="number" min="1" max="86400" value={duration} onChange={(event) => { setDuration(event.target.value); setError(null); }} onBlur={() => onSave(value(), false)} /></label>
        : <label><small>reps</small><input ref={measurementRef} aria-label={`Repeticiones, ${seriesLabel}`} aria-invalid={Boolean(error && Number(repetitions) <= 0)} inputMode="numeric" type="number" min="1" max="1000" value={repetitions} onChange={(event) => { setRepetitions(event.target.value); setError(null); }} onBlur={() => onSave(value(), false)} /></label>}
      {showRpe && <label className="optional-metric rpe-field"><small>Esfuerzo</small><input ref={rpeRef} aria-label={`Esfuerzo percibido RPE, ${seriesLabel}`} aria-invalid={Boolean(error?.includes('esfuerzo percibido'))} inputMode="decimal" type="number" min="1" max="10" step="0.5" value={rpe} onChange={(event) => { setRpe(event.target.value); setError(null); }} onBlur={() => onSave(value(), false)} /></label>}
      {showRir && <label className="optional-metric rir-field"><small>En reserva</small><input ref={rirRef} aria-label={`Repeticiones en reserva RIR, ${seriesLabel}`} aria-invalid={Boolean(error?.includes('repeticiones en reserva'))} inputMode="numeric" type="number" min="0" max="10" value={rir} onChange={(event) => { setRir(event.target.value); setError(null); }} onBlur={() => onSave(value(), false)} /></label>}
      <button className="complete-set" type="button" onClick={toggleComplete} aria-label={`${set.completedAt ? 'Reabrir' : 'Completar'} ${seriesLabel}`}>{set.completedAt ? <RotateCcw size={18} /> : <Check size={20} />}</button>
      {error && <span className="set-row-error" id={errorId} role="alert">{error}</span>}
    </div>
  );
}
