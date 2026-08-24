import { Activity, ArrowLeft, ArrowRight, Check, Dumbbell, HeartPulse, ShieldCheck, Sparkles, Target, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useStateStore } from '../../stores/state.store';
import type {
  ActivityLevel,
  BiologicalSex,
  MovementLimitation,
  OnboardingProfile,
  PriorityMuscleGroup,
  TrainingEquipment,
  TrainingExperience,
  TrainingGoal,
} from '../../types/state';
import { localDateKey } from '../../utils/dates';
import { generateRoutine } from './routine-generator';
import { Abbreviation } from '../../components/feedback/Abbreviation';
import { Modal } from '../../components/feedback/Modal';

const DEFAULT_ONBOARDING: OnboardingProfile = {
  completedAt: null,
  trainingGoal: 'hypertrophy',
  experience: 'beginner',
  trainingDaysPerWeek: 3,
  sessionMinutes: 60,
  equipment: 'full-gym',
  priorityMuscles: [],
  limitations: [],
  generatedAt: null,
  methodologyVersion: 'forja-safe-v1',
};

const STEPS = ['Inicio', 'Datos', 'Objetivo', 'Agenda', 'Equipo', 'Enfoque', 'Rutina'];

interface FormState {
  sex: BiologicalSex | '';
  ageYears: string;
  heightCm: string;
  weightKg: string;
  activityLevel: ActivityLevel;
  targetWeightKg: string;
  trainingGoal: TrainingGoal;
  experience: TrainingExperience;
  trainingDaysPerWeek: OnboardingProfile['trainingDaysPerWeek'];
  sessionMinutes: OnboardingProfile['sessionMinutes'];
  equipment: TrainingEquipment;
  priorityMuscles: PriorityMuscleGroup[];
  limitations: MovementLimitation[];
  safetyAccepted: boolean;
}

interface OnboardingWizardProps {
  open?: boolean;
  onClose?(): void;
}

export function OnboardingWizard({ open = false, onClose }: OnboardingWizardProps) {
  const state = useStateStore((store) => store.state);
  const update = useStateStore((store) => store.update);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const initial = useMemo(() => initialForm(state), [state]);
  const [form, setForm] = useState<FormState>(initial);
  const wasVisible = useRef(false);
  const firstSetup = Boolean(state && !state.onboarding?.completedAt);
  const visible = Boolean(state && (firstSetup || open));
  const editing = Boolean(state?.onboarding?.completedAt);

  useEffect(() => { titleRef.current?.focus(); }, [step]);
  useEffect(() => {
    if (visible && !wasVisible.current) {
      setStep(0);
      setError(null);
      setForm({ ...initial, safetyAccepted: false });
    }
    wasVisible.current = visible;
  }, [initial, visible]);

  if (!state || !visible) return null;
  const loadedState = state;
  const replacingPlan = loadedState.weeklyPlan.days.length > 0;
  const closeWizard = editing ? onClose : undefined;

  function next() {
    const message = validateStep(step, form);
    if (message) { setError(message); return; }
    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function previous() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  async function complete() {
    const message = validateStep(step, form);
    if (message) { setError(message); return; }
    setSaving(true); setError(null);
    try {
      const now = new Date().toISOString();
      const profile: OnboardingProfile = {
        completedAt: now,
        trainingGoal: form.trainingGoal,
        experience: form.experience,
        trainingDaysPerWeek: form.trainingDaysPerWeek,
        sessionMinutes: form.sessionMinutes,
        equipment: form.equipment,
        priorityMuscles: form.priorityMuscles,
        limitations: form.limitations,
        generatedAt: now,
        methodologyVersion: 'forja-safe-v1',
      };
      const generated = generateRoutine(profile, loadedState.exerciseLibrary, localDateKey(), { ageYears: Number(form.ageYears) });
      await update((draft) => {
        draft.onboarding = profile;
        draft.bodyMetrics.profile = {
          sex: form.sex as BiologicalSex,
          ageYears: Number(form.ageYears),
          heightCm: Number(form.heightCm),
          activityLevel: form.activityLevel,
          goal: form.trainingGoal === 'hypertrophy' ? 'gain' : 'maintain',
        };
        const weightKg = Number(form.weightKg);
        const latestWeight = draft.bodyWeight.entries.slice().sort((left, right) => right.measuredAt.localeCompare(left.measuredAt))[0];
        const initialWeight = draft.bodyWeight.entries.find((entry) => entry.note === 'Registro inicial de FORJA');
        if (!editing && initialWeight) {
          initialWeight.weightKg = weightKg;
          initialWeight.measuredAt = now;
        } else if (!latestWeight || latestWeight.weightKg !== weightKg) {
          draft.bodyWeight.entries.push({ id: crypto.randomUUID(), measuredAt: now, weightKg, note: editing ? 'Actualización desde configuración guiada' : 'Registro inicial de FORJA' });
        }
        draft.bodyWeight.goal = form.targetWeightKg
          ? { targetKg: Number(form.targetWeightKg), targetDate: null }
          : draft.bodyWeight.goal;
        draft.weeklyPlan = generated.plan;
        const previousRules = new Map(draft.progression.exerciseRules.map((rule) => [rule.exerciseId, rule]));
        draft.progression.exerciseRules = generated.progressionRules.map((rule) => {
          const previousRule = previousRules.get(rule.exerciseId);
          return previousRule ? { ...rule, state: previousRule.state } : rule;
        });
      });
      onClose?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No pudimos guardar tu rutina. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={visible}
      backdropClassName="onboarding-backdrop"
      contentClassName="onboarding-wizard"
      labelledBy="onboarding-title"
      describedBy="onboarding-help"
      initialFocusRef={titleRef}
      closeOnBackdrop={Boolean(closeWizard) && !saving}
      closeOnEscape={Boolean(closeWizard) && !saving}
      onClose={closeWizard}
    >
      {editing && onClose && <button className="onboarding-close" type="button" aria-label="Cerrar configuración guiada sin guardar" onClick={onClose}><X size={20} /></button>}
      <aside className="onboarding-progress" aria-label="Progreso de configuración">
        <div className="onboarding-brand"><span>F</span><div><strong>FORJA</strong><small>{editing ? 'Actualizar datos' : 'Tu punto de partida'}</small></div></div>
        <ol>{STEPS.map((label, index) => <li key={label} className={index === step ? 'active' : index < step ? 'complete' : ''} aria-current={index === step ? 'step' : undefined}><span aria-hidden="true">{index < step ? <Check size={14} /> : index + 1}</span><div><span className="sr-only">{index < step ? 'Completado. ' : index === step ? 'Paso actual. ' : 'Pendiente. '}</span><small>Paso {index + 1}</small><strong>{label}</strong></div></li>)}</ol>
        <p>Entrena. Registra. Evoluciona.</p>
      </aside>

      <div className="onboarding-content">
        <div className="onboarding-mobile-progress"><span>Paso {step + 1} de {STEPS.length}</span><div><i style={{ width: `${(step + 1) / STEPS.length * 100}%` }} /></div></div>
        {step === 0 && <WelcomeStep titleRef={titleRef} editing={editing} />}
        {step === 1 && <BodyStep titleRef={titleRef} form={form} setForm={setForm} />}
        {step === 2 && <GoalStep titleRef={titleRef} form={form} setForm={setForm} />}
        {step === 3 && <ScheduleStep titleRef={titleRef} form={form} setForm={setForm} />}
        {step === 4 && <EquipmentStep titleRef={titleRef} form={form} setForm={setForm} />}
        {step === 5 && <FocusStep titleRef={titleRef} form={form} setForm={setForm} />}
        {step === 6 && <ReviewStep titleRef={titleRef} form={form} setForm={setForm} replacingPlan={replacingPlan} />}
        <p id="onboarding-help" className="onboarding-privacy"><ShieldCheck size={15} /> Tus respuestas se guardan únicamente en tu instancia autoalojada.</p>
        {error && <div className="error-banner onboarding-error" role="alert">{error}</div>}
        <footer className="onboarding-actions">
          <button className="secondary-button" type="button" disabled={step === 0 || saving} onClick={previous}><ArrowLeft size={17} /> Atrás</button>
          {step < STEPS.length - 1
            ? <button className="primary-button" type="button" onClick={next}>Continuar <ArrowRight size={17} /></button>
            : <button className="primary-button" type="button" disabled={saving} onClick={() => void complete()}><Sparkles size={17} /> {saving ? 'Forjando rutina…' : editing ? 'Guardar cambios y regenerar' : replacingPlan ? 'Reemplazar y generar' : 'Generar mi rutina'}</button>}
        </footer>
      </div>
    </Modal>
  );
}

function WelcomeStep({ titleRef, editing }: StepTitleProps & { editing: boolean }) {
  return <div className="onboarding-step welcome-step"><span className="step-icon"><Sparkles /></span><p className="eyebrow">{editing ? 'Editar configuración' : 'Configuración guiada'}</p><h1 id="onboarding-title" ref={titleRef} tabIndex={-1}>{editing ? 'Actualicemos tus datos y tu plan' : 'Construyamos un plan que encaje contigo'}</h1><p>{editing ? 'Revisa tu punto de partida, disponibilidad y objetivo. Los cambios se aplicarán cuando confirmes el último paso.' : 'En unos minutos definiremos tu punto de partida, disponibilidad y objetivo. FORJA convertirá esos datos en una semana de entrenamiento editable, con progresión y descansos.'}</p><div className="onboarding-highlights"><span><Target /> Rutina a tu objetivo</span><span><Activity /> Volumen según experiencia</span><span><HeartPulse /> Límites de movimiento en cuenta</span></div></div>;
}

function BodyStep({ titleRef, form, setForm }: FormStepProps) {
  return <div className="onboarding-step"><span className="step-icon"><UserRound /></span><p className="eyebrow">Tu punto de partida</p><h1 id="onboarding-title" ref={titleRef} tabIndex={-1}>Datos corporales básicos</h1><p>Se usan para el seguimiento de peso, métricas y para contextualizar la carga de entrenamiento.</p><div className="onboarding-fields two-column"><label>Sexo biológico<select required value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value as BiologicalSex })}><option value="">Selecciona</option><option value="male">Masculino</option><option value="female">Femenino</option></select></label><label>Edad<input type="number" inputMode="numeric" min="18" max="100" value={form.ageYears} onChange={(event) => setForm({ ...form, ageYears: event.target.value })} /><small>18–100 años</small></label><label>Estatura (cm)<input type="number" inputMode="decimal" min="100" max="250" step="0.1" value={form.heightCm} onChange={(event) => setForm({ ...form, heightCm: event.target.value })} /></label><label>Peso actual (kg)<input type="number" inputMode="decimal" min="30" max="350" step="0.1" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} /></label><label className="span-2">Actividad fuera del entrenamiento<select value={form.activityLevel} onChange={(event) => setForm({ ...form, activityLevel: event.target.value as ActivityLevel })}><option value="sedentary">Mayormente sentado</option><option value="light">Ligera · camino ocasionalmente</option><option value="moderate">Moderada · me muevo a diario</option><option value="active">Alta · trabajo o actividad física</option><option value="very-active">Muy alta · actividad intensa diaria</option></select></label></div></div>;
}

function GoalStep({ titleRef, form, setForm }: FormStepProps) {
  const options: Array<{ value: TrainingGoal; title: string; text: string }> = [
    { value: 'hypertrophy', title: 'Ganar músculo', text: 'Más volumen y doble progresión, manteniendo 1–2 repeticiones en reserva.' },
    { value: 'strength', title: 'Ganar fuerza', text: 'Compuestos primero, rangos bajos y descansos más largos.' },
    { value: 'recomposition', title: 'Recomposición', text: 'Construir masa magra mientras controlas el peso corporal.' },
    { value: 'general-fitness', title: 'Condición general', text: 'Fuerza equilibrada, movilidad y capacidad de trabajo.' },
  ];
  return <div className="onboarding-step"><span className="step-icon"><Target /></span><p className="eyebrow">Dirección</p><h1 id="onboarding-title" ref={titleRef} tabIndex={-1}>¿Qué quieres conseguir?</h1><p>Tu objetivo modifica el orden, las repeticiones, el descanso y el método de progresión.</p><div className="choice-grid">{options.map((option) => <ChoiceCard key={option.value} selected={form.trainingGoal === option.value} title={option.title} text={option.text} onClick={() => setForm({ ...form, trainingGoal: option.value })} />)}</div><label className="target-weight-field">Peso objetivo (kg) <span>opcional</span><input type="number" inputMode="decimal" min="30" max="350" step="0.1" placeholder="Ej. 78" value={form.targetWeightKg} onChange={(event) => setForm({ ...form, targetWeightKg: event.target.value })} /></label></div>;
}

function ScheduleStep({ titleRef, form, setForm }: FormStepProps) {
  return <div className="onboarding-step"><span className="step-icon"><Activity /></span><p className="eyebrow">Ritmo sostenible</p><h1 id="onboarding-title" ref={titleRef} tabIndex={-1}>Experiencia y disponibilidad</h1><p>El mejor plan es el que puedes recuperar y repetir cada semana.</p><fieldset className="segmented-field"><legend>Experiencia entrenando</legend><div>{(['beginner', 'intermediate', 'advanced'] as const).map((value) => <button key={value} type="button" className={form.experience === value ? 'selected' : ''} aria-pressed={form.experience === value} onClick={() => setForm({ ...form, experience: value })}>{value === 'beginner' ? 'Principiante' : value === 'intermediate' ? 'Intermedio' : 'Avanzado'}</button>)}</div></fieldset><div className="onboarding-fields two-column"><label>Días por semana<select value={form.trainingDaysPerWeek} onChange={(event) => setForm({ ...form, trainingDaysPerWeek: Number(event.target.value) as FormState['trainingDaysPerWeek'] })}>{[2, 3, 4, 5, 6].map((day) => <option key={day} value={day}>{day} días</option>)}</select></label><label>Minutos por sesión<select value={form.sessionMinutes} onChange={(event) => setForm({ ...form, sessionMinutes: Number(event.target.value) as FormState['sessionMinutes'] })}>{[30, 45, 60, 75, 90].map((minutes) => <option key={minutes} value={minutes}>{minutes} minutos</option>)}</select></label></div><div className="method-note"><Dumbbell /><div><strong>{form.trainingDaysPerWeek <= 3 ? 'Cuerpo completo' : form.trainingDaysPerWeek === 4 ? 'Torso / pierna' : 'Empuje / tirón / pierna'}</strong><span>Distribución sugerida automáticamente para dejar recuperación entre estímulos.</span></div></div></div>;
}

function EquipmentStep({ titleRef, form, setForm }: FormStepProps) {
  const options: Array<{ value: TrainingEquipment; title: string; text: string }> = [
    { value: 'full-gym', title: 'Gimnasio completo', text: 'Barras, mancuernas, poleas y máquinas.' },
    { value: 'free-weights', title: 'Peso libre', text: 'Barras, mancuernas, banco y rack.' },
    { value: 'bodyweight', title: 'Peso corporal', text: 'Movimientos sin cargas externas; barra de dominadas opcional.' },
  ];
  return <div className="onboarding-step"><span className="step-icon"><Dumbbell /></span><p className="eyebrow">Recursos disponibles</p><h1 id="onboarding-title" ref={titleRef} tabIndex={-1}>¿Con qué vas a entrenar?</h1><p>FORJA elegirá variantes presentes en tu biblioteca que correspondan al entorno.</p><div className="choice-grid equipment-grid">{options.map((option) => <ChoiceCard key={option.value} selected={form.equipment === option.value} title={option.title} text={option.text} onClick={() => setForm({ ...form, equipment: option.value })} />)}</div></div>;
}

function FocusStep({ titleRef, form, setForm }: FormStepProps) {
  const priorities: Array<[PriorityMuscleGroup, string]> = [['chest', 'Pecho'], ['back', 'Espalda'], ['shoulders', 'Hombros'], ['arms', 'Brazos'], ['quadriceps', 'Cuádriceps'], ['hamstrings-glutes', 'Glúteos e isquios'], ['core', 'Core']];
  const limitations: Array<[MovementLimitation, string]> = [['shoulder', 'Hombro'], ['lower-back', 'Zona lumbar'], ['knee', 'Rodilla'], ['elbow-wrist', 'Codo o muñeca']];
  return <div className="onboarding-step"><span className="step-icon"><HeartPulse /></span><p className="eyebrow">Personalización</p><h1 id="onboarding-title" ref={titleRef} tabIndex={-1}>Prioridades y movimientos sensibles</h1><p>Elige hasta dos zonas prioritarias. Las limitaciones sustituyen movimientos demandantes, pero no constituyen una evaluación médica.</p><fieldset className="chip-field"><legend>Prioridad muscular <span>{form.priorityMuscles.length}/2</span></legend><div>{priorities.map(([value, label]) => <ToggleChip key={value} label={label} checked={form.priorityMuscles.includes(value)} disabled={!form.priorityMuscles.includes(value) && form.priorityMuscles.length >= 2} onChange={() => setForm({ ...form, priorityMuscles: toggle(form.priorityMuscles, value) })} />)}</div></fieldset><fieldset className="chip-field limitation-field"><legend>Zona con molestia o limitación</legend><div>{limitations.map(([value, label]) => <ToggleChip key={value} label={label} checked={form.limitations.includes(value)} onChange={() => setForm({ ...form, limitations: toggle(form.limitations, value) })} />)}</div><small>Si existe dolor, lesión reciente o diagnóstico, consulta a un profesional antes de entrenar.</small></fieldset></div>;
}

function ReviewStep({ titleRef, form, setForm, replacingPlan }: FormStepProps & { replacingPlan: boolean }) {
  const distribution = form.trainingDaysPerWeek <= 3 ? 'Cuerpo completo' : form.trainingDaysPerWeek === 4 ? 'Torso / pierna' : 'Empuje / tirón / pierna';
  return <div className="onboarding-step review-step"><span className="step-icon"><Sparkles /></span><p className="eyebrow">Listo para generar</p><h1 id="onboarding-title" ref={titleRef} tabIndex={-1}>Tu rutina está definida</h1><p>FORJA creará un plan base que podrás editar y reprogramar por días.</p><dl className="routine-summary"><div><dt>Objetivo</dt><dd>{goalLabel(form.trainingGoal)}</dd></div><div><dt>Frecuencia</dt><dd>{form.trainingDaysPerWeek} días · {form.sessionMinutes} min</dd></div><div><dt>Distribución</dt><dd>{distribution}</dd></div><div><dt>Intensidad</dt><dd><Abbreviation code="RPE" /> {form.experience === 'beginner' ? '7' : '8–8.5'} · {form.experience === 'beginner' ? '3' : '1–2'} <Abbreviation code="RIR" /></dd></div><div><dt>Tempo base</dt><dd>{form.trainingGoal === 'strength' ? '2–0–1' : '3–1–1'} · excéntrica controlada</dd></div><div><dt>Progresión</dt><dd>{form.experience === 'beginner' ? 'Lineal' : form.trainingGoal === 'strength' ? 'Greyskull · progresión lineal' : 'Doble progresión'}</dd></div></dl>{replacingPlan && <div className="replace-warning" role="note"><strong>Ya existe un plan semanal.</strong><span>Al generar, será reemplazado. El historial de sesiones y cargas anteriores se conserva.</span></div>}<label className="safety-check"><input type="checkbox" checked={form.safetyAccepted} onChange={(event) => setForm({ ...form, safetyAccepted: event.target.checked })} /><span><strong>Entrenaré con técnica controlada.</strong> No usaré negativas supramáximas ni dolor como indicador de progreso y ajustaré el plan si mi recuperación lo requiere.</span></label></div>;
}

function ChoiceCard({ selected, title, text, onClick }: { selected: boolean; title: string; text: string; onClick(): void }) {
  return <button type="button" className={selected ? 'choice-card selected' : 'choice-card'} aria-pressed={selected} onClick={onClick}><span>{selected && <Check size={15} />}</span><strong>{title}</strong><small>{text}</small></button>;
}

function ToggleChip({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange(): void }) {
  return <label className={checked ? 'toggle-chip selected' : 'toggle-chip'}><input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} /><span>{checked && <Check size={13} />}{label}</span></label>;
}

function initialForm(state: ReturnType<typeof useStateStore.getState>['state']): FormState {
  const profile = state?.onboarding ?? DEFAULT_ONBOARDING;
  const latestWeight = state?.bodyWeight.entries.slice().sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0];
  return {
    sex: state?.bodyMetrics.profile.sex ?? '',
    ageYears: state?.bodyMetrics.profile.ageYears?.toString() ?? '',
    heightCm: state?.bodyMetrics.profile.heightCm?.toString() ?? '',
    weightKg: latestWeight?.weightKg.toString() ?? '',
    activityLevel: state?.bodyMetrics.profile.activityLevel ?? 'moderate',
    targetWeightKg: state?.bodyWeight.goal?.targetKg.toString() ?? '',
    trainingGoal: profile.trainingGoal,
    experience: profile.experience,
    trainingDaysPerWeek: profile.trainingDaysPerWeek,
    sessionMinutes: profile.sessionMinutes,
    equipment: profile.equipment,
    priorityMuscles: profile.priorityMuscles,
    limitations: profile.limitations,
    safetyAccepted: false,
  };
}

function validateStep(step: number, form: FormState): string | null {
  if (step === 1) {
    if (!form.sex) return 'Selecciona el sexo biológico usado para las métricas corporales.';
    if (!between(form.ageYears, 18, 100)) return 'Indica una edad entre 18 y 100 años.';
    if (!between(form.heightCm, 100, 250)) return 'Indica una estatura entre 100 y 250 cm.';
    if (!between(form.weightKg, 30, 350)) return 'Indica un peso entre 30 y 350 kg.';
  }
  if (step === 2 && form.targetWeightKg && !between(form.targetWeightKg, 30, 350)) return 'El peso objetivo debe estar entre 30 y 350 kg.';
  if (step === 6 && !form.safetyAccepted) return 'Confirma el criterio de entrenamiento seguro para generar la rutina.';
  return null;
}

function between(value: string, min: number, max: number): boolean { const number = Number(value); return Number.isFinite(number) && number >= min && number <= max; }
function toggle<T>(values: T[], value: T): T[] { return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]; }
function goalLabel(goal: TrainingGoal): string { return { hypertrophy: 'Ganar músculo', strength: 'Ganar fuerza', recomposition: 'Recomposición', 'general-fitness': 'Condición general' }[goal]; }

interface StepTitleProps { titleRef: RefObject<HTMLHeadingElement | null> }
interface FormStepProps extends StepTitleProps { form: FormState; setForm(value: FormState): void }
