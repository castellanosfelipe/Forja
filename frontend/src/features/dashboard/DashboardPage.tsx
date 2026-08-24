import { ArrowDownRight, ArrowRight, ArrowUpRight, BellRing, Calculator, Dumbbell, Plus, Ruler, Scale, Target } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { WeightChart } from '../../components/charts/WeightChart';
import { TrainingHeatmap } from '../../components/charts/TrainingHeatmap';
import { MuscleMap } from '../../components/muscle-map/MuscleMap';
import { useAuthStore } from '../../stores/auth.store';
import { useStateStore } from '../../stores/state.store';
import { pushApi } from '../../pwa/push';
import { isThisWeek, localDateKey } from '../../utils/dates';
import { effectivePlanDaysForDate } from '../../utils/schedule';
import { isMeasurementDue, reminderFor, snoozeOneWeek } from '../metrics/measurement-reminder';

export function DashboardPage() {
  const user = useAuthStore((store) => store.user)!;
  const state = useStateStore((store) => store.state);
  const update = useStateStore((store) => store.update);
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [weight, setWeight] = useState('');
  const [goal, setGoal] = useState('');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [weightBusy, setWeightBusy] = useState(false);
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('weight') === 'new') {
      setShowWeightForm(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const summary = useMemo(() => {
    if (!state) return null;
    const weights = [...state.bodyWeight.entries].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
    const latest = weights.at(-1)?.weightKg ?? null;
    const prior = weights.at(-2)?.weightKg ?? null;
    const weekSessions = state.workoutSessions.filter((session) => session.status === 'completed' && isThisWeek(session.completedAt ?? session.startedAt));
    const volume = weekSessions.reduce((total, session) => total + session.exercises.reduce((exerciseTotal, exercise) => exerciseTotal + exercise.sets.reduce((setTotal, set) => setTotal + (set.loadKg ?? 0) * (set.repetitions ?? 0), 0), 0), 0);
    return { latest, change: latest !== null && prior !== null ? latest - prior : null, weekSessions: weekSessions.length, volume };
  }, [state]);

  if (!state || !summary) return null;

  async function saveWeight(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(weight);
    const parsedGoal = goal ? Number(goal) : null;
    if (!Number.isFinite(parsed) || parsed < 20 || parsed > 500) {
      setWeightError('Introduce un peso entre 20 y 500 kg.');
      return;
    }
    if (parsedGoal !== null && (!Number.isFinite(parsedGoal) || parsedGoal < 20 || parsedGoal > 500)) {
      setWeightError('La meta debe estar entre 20 y 500 kg.');
      return;
    }
    setWeightBusy(true);
    try {
      await update((draft) => {
        draft.bodyWeight.entries.push({ id: crypto.randomUUID(), measuredAt: new Date().toISOString(), weightKg: parsed, note: null });
        if (parsedGoal !== null) draft.bodyWeight.goal = { targetKg: parsedGoal, targetDate: null };
      });
      setWeight(''); setGoal(''); setWeightError(null); setShowWeightForm(false);
    } catch (cause) {
      setWeightError(cause instanceof Error ? cause.message : 'No pudimos guardar la medición.');
    } finally {
      setWeightBusy(false);
    }
  }

  async function snoozeReminder() {
    setReminderBusy(true);
    setReminderError(null);
    try {
      await update((draft) => {
        draft.bodyMeasurementReminder = { ...reminderFor(draft), nextDueAt: snoozeOneWeek() };
      });
      if (navigator.onLine) await pushApi.syncMeasurementReminder();
    } catch (cause) {
      setReminderError(cause instanceof Error ? cause.message : 'No pudimos aplazar el recordatorio.');
    } finally {
      setReminderBusy(false);
    }
  }

  const todayDays = effectivePlanDaysForDate(state.weeklyPlan, state.scheduleOverrides, localDateKey());
  const todayExerciseCount = todayDays.reduce(
    (total, day) => total + day.blocks.reduce((sum, block) => sum + block.exercises.length, 0),
    0,
  );
  const measurementReminder = reminderFor(state);
  const weightTrendIsGood = summary.change !== null && (
    state.bodyWeight.goal && summary.latest !== null
      ? Math.abs(summary.latest - state.bodyWeight.goal.targetKg) <= Math.abs(summary.latest - summary.change - state.bodyWeight.goal.targetKg)
      : state.bodyMetrics.profile.goal === 'lose'
        ? summary.change < 0
        : state.bodyMetrics.profile.goal === 'gain'
          ? summary.change > 0
          : Math.abs(summary.change) <= 0.2
  );

  return (
    <main className="page dashboard-page">
      <header className="page-header">
        <div><p className="eyebrow">{new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p><h1>Hola, {user.displayName.split(' ')[0]}.</h1><p>Un vistazo honesto a tu progreso.</p></div>
        <Link to="/workout" className="primary-button"><Dumbbell size={20} /> Entrenar ahora</Link>
      </header>

      {isMeasurementDue(measurementReminder) && <section className="measurement-reminder" aria-labelledby="measurement-reminder-title"><span className="measurement-reminder-icon"><BellRing size={23} /></span><div><p className="eyebrow">Recordatorio mensual</p><h2 id="measurement-reminder-title">Es hora de medir tus perímetros.</h2><p>Registra cuello, cintura y cadera cuando corresponda para actualizar tu estimación de grasa corporal.</p>{reminderError && <small role="alert">{reminderError}</small>}</div><div className="measurement-reminder-actions"><Link className="primary-button" to="/metrics"><Ruler size={18} /> Medir ahora</Link><button className="secondary-button" type="button" disabled={reminderBusy} onClick={() => void snoozeReminder()}>{reminderBusy ? 'Aplazando…' : 'En 7 días'}</button></div></section>}

      <section className="metric-grid" aria-label="Métricas principales">
        <article className="metric-card accent-green"><span className="metric-icon"><Scale size={21} /></span><p>Peso actual</p><strong>{summary.latest?.toFixed(1) ?? '—'} <small>kg</small></strong><span className={weightTrendIsGood ? 'trend good' : 'trend'}>{summary.change === null ? 'Sin comparación' : <>{summary.change < 0 ? <ArrowDownRight size={15} /> : summary.change > 0 ? <ArrowUpRight size={15} /> : null} {Math.abs(summary.change).toFixed(1)} kg vs. anterior</>}</span></article>
        <article className="metric-card"><span className="metric-icon"><Dumbbell size={21} /></span><p>Esta semana</p><strong>{summary.weekSessions} <small>sesiones</small></strong><span className="trend">{summary.volume.toLocaleString('es-CO', { maximumFractionDigits: 0 })} kg de carga registrada</span></article>
        <article className="metric-card"><span className="metric-icon"><Target size={21} /></span><p>Meta</p><strong>{state.bodyWeight.goal?.targetKg ?? '—'} <small>kg</small></strong><span className="trend">{summary.latest && state.bodyWeight.goal ? `${Math.abs(summary.latest - state.bodyWeight.goal.targetKg).toFixed(1)} kg por recorrer` : 'Define tu rumbo'}</span></article>
        <article className="metric-card next-card"><p>Hoy</p><strong>{todayDays.length ? todayDays.map((day) => day.name).join(' · ') : 'Recuperación'}</strong><span>{todayDays.length ? `${todayExerciseCount} ejercicios programados` : 'El descanso también entrena.'}</span><Link to={todayDays.length ? '/workout' : '/plan'}>{todayDays.length ? 'Comenzar' : 'Ver plan'} <ArrowRight size={16} /></Link></article>
      </section>

      <section className="dashboard-grid">
        <article className="content-card weight-card">
          <div className="card-heading"><div><p className="eyebrow">Composición</p><h2>Tendencia de peso</h2></div><div className="card-actions"><Link className="secondary-button" to="/metrics"><Calculator size={17} /> Analizar</Link><button className="secondary-button" type="button" aria-expanded={showWeightForm} aria-controls="weight-entry-form" onClick={() => { setShowWeightForm(!showWeightForm); setWeightError(null); }}><Plus size={17} /> {showWeightForm ? 'Cerrar' : 'Peso'}</button></div></div>
          {showWeightForm && <form id="weight-entry-form" className="inline-form" aria-busy={weightBusy} onSubmit={saveWeight}><label>Peso (kg)<input autoFocus type="number" inputMode="decimal" min="20" max="500" step="0.1" required disabled={weightBusy} value={weight} onChange={(event) => { setWeight(event.target.value); setWeightError(null); }} /></label><label>Meta opcional<input type="number" inputMode="decimal" min="20" max="500" step="0.1" disabled={weightBusy} value={goal} onChange={(event) => { setGoal(event.target.value); setWeightError(null); }} /></label>{weightError && <div className="error-banner inline-form-message" role="alert">{weightError}</div>}<button className="primary-button" type="submit" disabled={weightBusy}>{weightBusy ? 'Guardando…' : 'Guardar medición'}</button></form>}
          <WeightChart entries={state.bodyWeight.entries} targetKg={state.bodyWeight.goal?.targetKg ?? null} />
        </article>
        <article className="content-card muscle-card"><MuscleMap sessions={state.workoutSessions} exercises={state.exerciseLibrary} sex={state.bodyMetrics.profile.sex} /></article>
        <article className="content-card heat-card"><TrainingHeatmap sessions={state.workoutSessions} /></article>
      </section>
    </main>
  );
}
