import { Activity, Calculator, Flame, Ruler, Save, Scale, Trash2, TrendingUp } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { Abbreviation } from '../../components/feedback/Abbreviation';
import { useStateStore } from '../../stores/state.store';
import { pushApi } from '../../pwa/push';
import type { ActivityLevel, BiologicalSex, BodyGoal, BodyMetricEntry, BodyMetricsProfile } from '../../types/state';
import { formatDate } from '../../utils/dates';
import { userFacingError } from '../../utils/user-facing-error';
import { calculateBodyMetrics, type BodyMetricInput } from './calculations';
import { addOneMonth, isMeasurementDue, reminderFor } from './measurement-reminder';

interface FormState {
  sex: BiologicalSex | '';
  ageYears: string;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel;
  goal: BodyGoal;
  neckCm: string;
  waistCm: string;
  hipCm: string;
  note: string;
}

const EMPTY_PROFILE: BodyMetricsProfile = {
  sex: null,
  ageYears: null,
  heightCm: null,
  activityLevel: 'moderate',
  goal: 'maintain',
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentario',
  light: 'Ligero · 1–3 días/semana',
  moderate: 'Moderado · 3–5 días/semana',
  active: 'Activo · 6–7 días/semana',
  'very-active': 'Muy activo · trabajo físico + entrenamiento',
};

const GOAL_LABELS: Record<BodyGoal, string> = {
  lose: 'Reducir grasa',
  maintain: 'Mantener',
  gain: 'Ganar masa',
};

export function MetricsPage() {
  const state = useStateStore((store) => store.state);
  const update = useStateStore((store) => store.update);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [measurementToRemove, setMeasurementToRemove] = useState<BodyMetricEntry | null>(null);
  const [busy, setBusy] = useState(false);

  const bodyMetrics = state?.bodyMetrics ?? { profile: EMPTY_PROFILE, entries: [] };
  const measurementReminder = state ? reminderFor(state) : null;
  const history = useMemo(
    () => [...bodyMetrics.entries].sort((left, right) => right.measuredAt.localeCompare(left.measuredAt)),
    [bodyMetrics.entries],
  );

  useEffect(() => {
    if (!state || hydrated) return;
    const profile = state.bodyMetrics?.profile ?? EMPTY_PROFILE;
    const latestMetric = [...(state.bodyMetrics?.entries ?? [])].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
    const latestWeight = [...state.bodyWeight.entries].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
    setForm({
      sex: profile.sex ?? '',
      ageYears: profile.ageYears?.toString() ?? '',
      heightCm: profile.heightCm?.toString() ?? '',
      weightKg: (latestMetric?.weightKg ?? latestWeight?.weightKg)?.toString() ?? '',
      activityLevel: profile.activityLevel,
      goal: profile.goal,
      neckCm: latestMetric?.neckCm?.toString() ?? '',
      waistCm: latestMetric?.waistCm?.toString() ?? '',
      hipCm: latestMetric?.hipCm?.toString() ?? '',
      note: '',
    });
    setHydrated(true);
  }, [hydrated, state]);

  const evaluation = useMemo(() => {
    if (!form.sex || !form.ageYears || !form.heightCm || !form.weightKg) return { result: null, error: null };
    try {
      return { result: calculateBodyMetrics(toInput(form)), error: null };
    } catch (cause) {
      return { result: null, error: userFacingError(cause, 'Revisa los valores.') };
    }
  }, [form]);

  if (!state) return null;

  async function saveMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const input = toInput(form);
      const result = calculateBodyMetrics(input);
      const measuredAt = new Date().toISOString();
      const entry: BodyMetricEntry = {
        id: crypto.randomUUID(),
        measuredAt,
        weightKg: input.weightKg,
        neckCm: input.neckCm,
        waistCm: input.waistCm,
        hipCm: input.hipCm,
        bmi: result.bmi,
        bodyFatPercent: result.bodyFatPercent,
        leanMassKg: result.leanMassKg,
        ffmi: result.ffmi,
        basalMetabolicRateKcal: result.basalMetabolicRateKcal,
        totalDailyEnergyExpenditureKcal: result.totalDailyEnergyExpenditureKcal,
        targetCaloriesKcal: result.targetCaloriesKcal,
        macros: result.macros,
        note: form.note.trim() || null,
      };
      await update((draft) => {
        draft.bodyMetrics ??= { profile: EMPTY_PROFILE, entries: [] };
        draft.bodyMetrics.profile = {
          sex: input.sex,
          ageYears: input.ageYears,
          heightCm: input.heightCm,
          activityLevel: input.activityLevel,
          goal: input.goal,
        };
        draft.bodyMetrics.entries.push(entry);
        const sameWeightToday = draft.bodyWeight.entries.some((item) =>
          item.measuredAt.slice(0, 10) === measuredAt.slice(0, 10) && item.weightKg === input.weightKg,
        );
        if (!sameWeightToday) {
          draft.bodyWeight.entries.push({ id: crypto.randomUUID(), measuredAt, weightKg: input.weightKg, note: 'Medición de composición corporal' });
          draft.bodyWeight.entries.sort((left, right) => left.measuredAt.localeCompare(right.measuredAt));
        }
        if (result.bodyFatPercent !== null) {
          draft.bodyMeasurementReminder = {
            ...reminderFor(draft),
            nextDueAt: addOneMonth(measuredAt),
          };
        }
      });
      if (result.bodyFatPercent !== null && navigator.onLine) {
        await pushApi.syncMeasurementReminder().catch(() => undefined);
      }
      setForm((current) => ({ ...current, note: '' }));
      setNotice(result.bodyFatPercent !== null
        ? `Medición guardada. Te recordaremos repetir los perímetros el ${formatDate(addOneMonth(measuredAt))}.`
        : 'Medición guardada y tendencia de peso actualizada.');
    } catch (cause) {
      setError(userFacingError(cause, 'No pudimos guardar la medición. Revisa los valores e inténtalo de nuevo.'));
    } finally {
      setBusy(false);
    }
  }

  async function removeMeasurement(id: string) {
    setBusy(true); setError(null); setNotice(null);
    try {
      await update((draft) => {
        if (!draft.bodyMetrics) return;
        const target = draft.bodyMetrics.entries.find((entry) => entry.id === id);
        if (!target) return;
        draft.bodyMetrics.entries = draft.bodyMetrics.entries.filter((entry) => entry.id !== id);
        draft.bodyWeight.entries = draft.bodyWeight.entries.filter((entry) => !(
          entry.note === 'Medición de composición corporal'
          && entry.measuredAt === target.measuredAt
          && entry.weightKg === target.weightKg
        ));
      });
      setMeasurementToRemove(null);
      setNotice('Medición eliminada del historial corporal y de la tendencia de peso asociada.');
    } catch (cause) {
      setError(userFacingError(cause, 'No pudimos eliminar la medición. Inténtalo de nuevo.'));
    } finally {
      setBusy(false);
    }
  }

  const latest = history[0];
  const prior = history[1];

  return (
    <main className="page metrics-page">
      <header className="page-header">
        <div><p className="eyebrow">Composición y nutrición</p><h1>Tu cuerpo en contexto.</h1><p>Ingresa tus datos una vez: FORJA conecta <Abbreviation code="IMC" />, grasa corporal, energía y macros.</p></div>
        <div className="metric-history-summary"><TrendingUp size={20} /><span><strong>{history.length}</strong> mediciones guardadas</span></div>
      </header>

      {notice && <div className="notice-banner" role="status">{notice}<button className="icon-button" type="button" aria-label="Cerrar confirmación" onClick={() => setNotice(null)}>×</button></div>}
      {measurementReminder && isMeasurementDue(measurementReminder) && <div className="measurement-reminder compact" role="status"><Ruler size={22} /><div><strong>Tu medición mensual está pendiente</strong><span>Incluye cuello y cintura{bodyMetrics.profile.sex === 'female' ? ', además de cadera,' : ''} para actualizar la grasa corporal.</span></div></div>}

      <div className="calculation-chain" aria-label="Cadena de cálculos">
        <span><b>1</b> <Abbreviation code="IMC" /></span><i>→</i><span><b>2</b> Grasa</span><i>→</i><span><b>3</b> Energía</span><i>→</i><span><b>4</b> Macros</span>
      </div>

      <section className="metrics-layout">
        <form className="content-card metrics-form" aria-busy={busy} onSubmit={saveMeasurement}>
          <div className="card-heading"><div><p className="eyebrow">Perfil compartido</p><h2>Nueva medición</h2><small>Los perímetros son opcionales; habilitan grasa corporal, masa magra y <Abbreviation code="FFMI" />.</small></div><Calculator size={25} /></div>
          <div className="metrics-fields">
            <label>Sexo usado por las fórmulas<select required value={form.sex} onChange={(event) => change('sex', event.target.value as BiologicalSex)}><option value="">Seleccionar</option><option value="male">Masculino</option><option value="female">Femenino</option></select></label>
            <label>Edad<input required type="number" min="18" max="100" value={form.ageYears} onChange={(event) => change('ageYears', event.target.value)} /><small>años</small></label>
            <label>Altura<input required type="number" min="100" max="250" step="0.1" value={form.heightCm} onChange={(event) => change('heightCm', event.target.value)} /><small>cm</small></label>
            <label>Peso<input required type="number" min="20" max="500" step="0.1" value={form.weightKg} onChange={(event) => change('weightKg', event.target.value)} /><small>kg</small></label>
            <label className="span-2">Actividad<select value={form.activityLevel} onChange={(event) => change('activityLevel', event.target.value as ActivityLevel)}>{Object.entries(ACTIVITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="span-2">Objetivo<select value={form.goal} onChange={(event) => change('goal', event.target.value as BodyGoal)}>{Object.entries(GOAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>

          <fieldset className="circumference-fields"><legend>Perímetros para grasa corporal</legend><p>Mide con cinta flexible, sin comprimir la piel.</p><div><label>Cuello<input type="number" min="20" max="80" step="0.1" value={form.neckCm} onChange={(event) => change('neckCm', event.target.value)} /><small>cm</small></label><label>Cintura<input type="number" min="40" max="250" step="0.1" value={form.waistCm} onChange={(event) => change('waistCm', event.target.value)} /><small>cm</small></label><label className={form.sex === 'female' ? '' : 'optional-field'}>Cadera<input type="number" min="40" max="250" step="0.1" required={form.sex === 'female' && Boolean(form.neckCm || form.waistCm)} disabled={form.sex === 'male'} value={form.hipCm} onChange={(event) => change('hipCm', event.target.value)} /><small>{form.sex === 'female' ? 'cm' : 'solo fórmula femenina'}</small></label></div></fieldset>

          <label className="metric-note">Nota opcional<input maxLength={180} value={form.note} onChange={(event) => change('note', event.target.value)} placeholder="Ej. al despertar, antes de desayunar" /></label>
          {(error ?? evaluation.error) && <div className="error-banner" role="alert">{error ?? evaluation.error}</div>}
          <button className="primary-button" type="submit" disabled={busy}><Save size={18} /> {busy ? 'Guardando…' : 'Calcular y guardar'}</button>
        </form>

        <section className="metrics-results" aria-live="polite">
          {!evaluation.result ? <div className="content-card empty-metrics"><Ruler size={30} /><h2>Completa tu perfil</h2><p>Los resultados aparecerán aquí y se actualizarán mientras escribes.</p></div> : <>
            <div className="result-grid">
              <ResultCard icon={<Scale />} label={<Abbreviation code="IMC" />} value={evaluation.result.bmi.toFixed(1)} detail={evaluation.result.bmiCategory} />
              <ResultCard icon={<Activity />} label="Grasa estimada" value={evaluation.result.bodyFatPercent === null ? '—' : `${evaluation.result.bodyFatPercent.toFixed(1)}%`} detail={evaluation.result.bodyFatCategory ?? 'Añade perímetros'} />
              <ResultCard icon={<TrendingUp />} label={<>Masa magra / <Abbreviation code="FFMI" /></>} value={evaluation.result.leanMassKg === null ? '—' : `${evaluation.result.leanMassKg.toFixed(1)} kg`} detail={evaluation.result.ffmi === null ? 'Añade perímetros' : <><Abbreviation code="FFMI" /> {evaluation.result.ffmi.toFixed(1)}</>} />
              <ResultCard icon={<Flame />} label="Objetivo energético" value={`${evaluation.result.targetCaloriesKcal}`} detail={<>kcal/día · <Abbreviation code="TDEE" /> {evaluation.result.totalDailyEnergyExpenditureKcal}</>} />
            </div>
            <article className="content-card macro-card"><div className="card-heading"><div><p className="eyebrow">Distribución diaria</p><h2>Macros sugeridos</h2></div><strong>{evaluation.result.targetCaloriesKcal} kcal</strong></div><div className="macro-results"><span className="protein"><strong>{evaluation.result.macros.proteinGrams} g</strong><small>Proteína · {evaluation.result.macros.proteinPercent}%</small></span><span className="fat"><strong>{evaluation.result.macros.fatGrams} g</strong><small>Grasas · {evaluation.result.macros.fatPercent}%</small></span><span className="carbs"><strong>{evaluation.result.macros.carbohydrateGrams} g</strong><small>Carbohidratos · {evaluation.result.macros.carbohydratePercent}%</small></span></div><p className="formula-note"><Abbreviation code="TMB" /> estimada: {evaluation.result.basalMetabolicRateKcal} kcal. Rango de peso correspondiente a <Abbreviation code="IMC" /> 18,5–24,9: {evaluation.result.healthyWeightRangeKg.min}–{evaluation.result.healthyWeightRangeKg.max} kg.</p></article>
          </>}
        </section>
      </section>

      <section className="content-card metrics-history">
        <div className="card-heading"><div><p className="eyebrow">Evolución</p><h2>Historial corporal</h2><small>{latest && prior ? `Último cambio: ${signed(latest.weightKg - prior.weightKg)} kg y ${signedNullable(latest.bodyFatPercent, prior.bodyFatPercent)} de grasa.` : 'Guarda al menos dos mediciones para comparar avances.'}</small></div></div>
        {!history.length ? <div className="empty-history">Tu primera medición aparecerá aquí.</div> : <div className="history-table-wrap" tabIndex={0} aria-label="Historial corporal desplazable"><table><thead><tr><th>Fecha</th><th>Peso</th><th><Abbreviation code="IMC" /></th><th>Grasa</th><th>Masa magra</th><th><Abbreviation code="FFMI" /></th><th>Objetivo</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{history.slice(0, 24).map((entry) => <tr key={entry.id}><td><strong>{formatDate(entry.measuredAt)}</strong>{entry.note && <small>{entry.note}</small>}</td><td>{entry.weightKg.toFixed(1)} kg</td><td>{entry.bmi.toFixed(1)}</td><td>{formatOptional(entry.bodyFatPercent, '%')}</td><td>{formatOptional(entry.leanMassKg, ' kg')}</td><td>{formatOptional(entry.ffmi, '')}</td><td>{entry.targetCaloriesKcal} kcal</td><td><button className="icon-button danger" type="button" disabled={busy} onClick={() => setMeasurementToRemove(entry)} aria-label={`Eliminar medición del ${formatDate(entry.measuredAt)}`}><Trash2 size={17} /></button></td></tr>)}</tbody></table></div>}
      </section>

      <aside className="metrics-disclaimer"><strong>Estimaciones, no diagnóstico.</strong><span>Usa condiciones de medición consistentes para comparar tendencias. Embarazo, crecimiento, alto desarrollo muscular y algunas condiciones clínicas pueden reducir la utilidad de estas fórmulas.</span><div><a href="https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight" target="_blank" rel="noreferrer">Organización Mundial de la Salud · índice de masa corporal <span className="sr-only">(abre en una pestaña nueva)</span></a><a href="https://pubmed.ncbi.nlm.nih.gov/2305711/" target="_blank" rel="noreferrer">Mifflin–St Jeor <span className="sr-only">(abre en una pestaña nueva)</span></a><a href="https://www.mynavyhr.navy.mil/Portals/55/Support/Culture%20Resilience/Physical/Guide%204%20-%20Body%20Composition%20Assessment.pdf" target="_blank" rel="noreferrer">Marina de Estados Unidos · perímetros <span className="sr-only">(abre en una pestaña nueva)</span></a><a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/" target="_blank" rel="noreferrer">Sociedad Internacional de Nutrición Deportiva · proteína <span className="sr-only">(abre en una pestaña nueva)</span></a></div></aside>
      <ConfirmDialog
        open={Boolean(measurementToRemove)}
        title="¿Eliminar esta medición?"
        description={measurementToRemove ? `Se eliminará la medición del ${formatDate(measurementToRemove.measuredAt)} y el registro de peso que FORJA haya creado junto con ella. Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar medición"
        busy={busy}
        onCancel={() => setMeasurementToRemove(null)}
        onConfirm={() => measurementToRemove ? removeMeasurement(measurementToRemove.id) : undefined}
      />
    </main>
  );

  function change<K extends keyof FormState>(key: K, value: FormState[K]) {
    setError(null);
    setNotice(null);
    setForm((current) => ({ ...current, [key]: value }));
  }
}

function ResultCard({ icon, label, value, detail }: { icon: ReactNode; label: ReactNode; value: string; detail: ReactNode }) {
  return <article className="content-card result-card"><span>{icon}</span><p>{label}</p><strong>{value}</strong><small>{detail}</small></article>;
}

function emptyForm(): FormState {
  return { sex: '', ageYears: '', heightCm: '', weightKg: '', activityLevel: 'moderate', goal: 'maintain', neckCm: '', waistCm: '', hipCm: '', note: '' };
}

function toInput(form: FormState): BodyMetricInput {
  if (!form.sex) throw new Error('Selecciona el sexo usado por las fórmulas.');
  return {
    sex: form.sex,
    ageYears: Number(form.ageYears),
    heightCm: Number(form.heightCm),
    weightKg: Number(form.weightKg),
    activityLevel: form.activityLevel,
    goal: form.goal,
    neckCm: numberOrNull(form.neckCm),
    waistCm: numberOrNull(form.waistCm),
    hipCm: form.sex === 'male' ? null : numberOrNull(form.hipCm),
  };
}

function numberOrNull(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}`;
}

function signedNullable(current: number | null, prior: number | null): string {
  return current === null || prior === null ? 'sin comparación' : `${signed(current - prior)} pp`;
}

function formatOptional(value: number | null, suffix: string): string {
  return value === null ? '—' : `${value.toFixed(1)}${suffix}`;
}
