import { Eye, Plus, Search, Sparkles } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useStateStore } from '../../stores/state.store';
import type { Exercise, ProgressionStrategy } from '../../types/state';
import { EXERCISE_CATEGORIES, exerciseCategory } from './exercise-categories';
import { MuscleMultiSelect } from './MuscleMultiSelect';
import { ExerciseAnimation } from './ExerciseAnimation';
import { ExerciseGuideDialog } from './ExerciseGuideDialog';

const PAGE_SIZE = 24;

export function LibraryPage() {
  const state = useStateStore((store) => store.state);
  const update = useStateStore((store) => store.update);
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [savingExercise, setSavingExercise] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [guideExercise, setGuideExercise] = useState<Exercise | null>(null);
  const [form, setForm] = useState({ name: '', category: 'chest', equipment: '', measurement: 'repetitions' as Exercise['measurement'], bodyweight: false, perSide: false, primary: [] as string[], secondary: [] as string[], strategy: 'linear-progression' as ProgressionStrategy });

  const library = state?.exerciseLibrary ?? [];
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const exercise of library) counts.set(exercise.category, (counts.get(exercise.category) ?? 0) + 1);
    return counts;
  }, [library]);
  const exercises = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    return library.filter((exercise) => {
      if (categoryFilter !== 'all' && exercise.category !== categoryFilter) return false;
      if (!normalizedQuery) return true;
      const category = exerciseCategory(exercise.category);
      const searchable = normalizeSearch([
        exercise.name,
        category.label,
        ...exercise.equipment,
        ...exercise.muscles.primary,
        ...exercise.muscles.secondary,
      ].join(' '));
      return searchable.includes(normalizedQuery);
    });
  }, [categoryFilter, library, query]);
  useEffect(() => setVisibleCount(PAGE_SIZE), [categoryFilter, query]);
  const visibleExercises = useMemo(() => exercises.slice(0, visibleCount), [exercises, visibleCount]);
  const groupedExercises = useMemo(() => {
    const groups = new Map<string, Exercise[]>();
    for (const exercise of visibleExercises) {
      const group = groups.get(exercise.category) ?? [];
      group.push(exercise);
      groups.set(exercise.category, group);
    }
    const knownOrder = new Map(EXERCISE_CATEGORIES.map((category, index) => [category.id, index]));
    return [...groups.entries()]
      .map(([categoryId, items]) => ({ category: exerciseCategory(categoryId), exercises: items.sort((left, right) => left.name.localeCompare(right.name, 'es')) }))
      .sort((left, right) => (knownOrder.get(left.category.id) ?? 999) - (knownOrder.get(right.category.id) ?? 999));
  }, [visibleExercises]);
  if (!state) return null;

  async function addExercise(event: FormEvent) {
    event.preventDefault();
    if (form.primary.length === 0) {
      setFormError('Selecciona al menos un músculo principal.');
      return;
    }
    const idBase = form.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!idBase) {
      setFormError('Escribe un nombre que incluya al menos una letra o un número.');
      return;
    }
    if (library.some((exercise) => normalizeSearch(exercise.name) === normalizeSearch(form.name))) {
      setFormError('Ya existe un ejercicio con ese nombre. Usa un nombre que identifique claramente la variante.');
      return;
    }
    setFormError(null);
    const id = library.some((exercise) => exercise.id === idBase) ? `${idBase}-${crypto.randomUUID().slice(0, 5)}` : idBase;
    setSavingExercise(true);
    try {
      await update((draft) => {
      draft.exerciseLibrary.push({
        id,
        name: form.name.trim(),
        category: form.category,
        equipment: splitList(form.equipment),
        measurement: form.measurement,
        isBodyweight: form.bodyweight,
        isPerSide: form.perSide,
        muscles: { primary: form.primary, secondary: form.secondary },
      });
      if (form.measurement === 'repetitions') draft.progression.exerciseRules.push({
        exerciseId: id,
        strategy: form.strategy,
        config: {
          incrementKg: form.bodyweight ? 1 : 2.5,
          deloadAfterFailures: 3,
          deloadPercent: 10,
          sets: 3,
          targetReps: 5,
          ...(form.strategy === 'double-progression' ? { repRange: { min: 8, max: 12 } } : {}),
        },
        state: { nextLoadKg: 0, consecutiveFailures: 0, deloadCount: 0, lastEvaluatedSessionId: null },
      });
      });
      setForm({ name: '', category: 'chest', equipment: '', measurement: 'repetitions', bodyweight: false, perSide: false, primary: [], secondary: [], strategy: 'linear-progression' });
      setShowForm(false);
      setNotice('Ejercicio añadido a tu biblioteca.');
    } finally {
      setSavingExercise(false);
    }
  }

  return (
    <main className="page library-page">
      <header className="page-header"><div><p className="eyebrow">Tu vocabulario de movimiento</p><h1>Biblioteca</h1><p>{state.exerciseLibrary.length} ejercicios organizados por zona y tipo de entrenamiento.</p></div><button className="primary-button" type="button" aria-expanded={showForm} aria-controls="exercise-form-panel" onClick={() => setShowForm(!showForm)}><Plus size={19} /> {showForm ? 'Cerrar formulario' : 'Nuevo ejercicio'}</button></header>
      {notice && <div className="notice-banner" role="status">{notice}<button className="icon-button" type="button" aria-label="Cerrar confirmación" onClick={() => setNotice(null)}>×</button></div>}

      {showForm && <section id="exercise-form-panel" className="content-card exercise-form-card"><div><p className="eyebrow">Personalizado</p><h2>Definir ejercicio</h2><p className="muted">Configura cómo se registra y en qué categoría aparecerá.</p></div><form className="exercise-form" onSubmit={addExercise}>
        <label className="span-2">Nombre<input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Peso muerto rumano" /></label>
        <label>Categoría<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{EXERCISE_CATEGORIES.slice(0, 16).map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
        <label>Medición<select value={form.measurement} onChange={(event) => setForm({ ...form, measurement: event.target.value as Exercise['measurement'] })}><option value="repetitions">Repeticiones</option><option value="duration">Tiempo</option></select></label>
        <label className="span-2">Equipamiento, separado por comas<input value={form.equipment} onChange={(event) => setForm({ ...form, equipment: event.target.value })} placeholder="barra, discos" /></label>
        <MuscleMultiSelect id="primary-muscles" label="Músculos principales" selected={form.primary} required invalid={Boolean(formError)} hint="Selecciona uno o varios músculos que reciben la carga principal." onChange={(primary) => { setForm({ ...form, primary, secondary: form.secondary.filter((muscle) => !primary.includes(muscle)) }); setFormError(null); }} />
        <MuscleMultiSelect id="secondary-muscles" label="Músculos secundarios" selected={form.secondary} excluded={form.primary} hint="Solo muestra músculos que no estén seleccionados como principales." onChange={(secondary) => setForm({ ...form, secondary })} />
        {formError && <div className="error-banner span-2" role="alert">{formError}</div>}
        <label>Progresión<select disabled={form.measurement === 'duration'} value={form.strategy} onChange={(event) => setForm({ ...form, strategy: event.target.value as ProgressionStrategy })}><option value="linear-progression">Lineal</option><option value="greyskull-lp">Greyskull · progresión lineal</option><option value="double-progression">Doble progresión</option></select><small>{form.measurement === 'duration' ? 'No aplica a ejercicios por tiempo.' : 'Define cómo aumenta la próxima carga.'}</small></label>
        <div className="toggle-pair"><label><input type="checkbox" checked={form.bodyweight} onChange={(event) => setForm({ ...form, bodyweight: event.target.checked })} /> Peso corporal</label><label><input type="checkbox" checked={form.perSide} onChange={(event) => setForm({ ...form, perSide: event.target.checked })} /> Por lado</label></div>
        <div className="form-actions span-2"><button type="button" className="secondary-button" disabled={savingExercise} onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" type="submit" disabled={savingExercise}>{savingExercise ? 'Guardando…' : 'Añadir a biblioteca'}</button></div>
      </form></section>}

      <section className="library-browser" aria-label="Explorar biblioteca">
        <div className="category-filter" role="group" aria-label="Filtrar por categoría">
          <button type="button" className={categoryFilter === 'all' ? 'active' : ''} aria-label={`Mostrar todos los ejercicios: ${library.length}`} aria-pressed={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}><span>Todos</span><strong>{library.length}</strong></button>
          {EXERCISE_CATEGORIES.filter((category) => (categoryCounts.get(category.id) ?? 0) > 0).map((category) => <button type="button" key={category.id} className={categoryFilter === category.id ? 'active' : ''} aria-label={`Filtrar por ${category.label}: ${categoryCounts.get(category.id)} ejercicios`} aria-pressed={categoryFilter === category.id} onClick={() => setCategoryFilter(category.id)}><span>{category.shortLabel}</span><strong>{categoryCounts.get(category.id)}</strong></button>)}
        </div>
        <div className="library-toolbar"><label className="search-box"><span className="sr-only">Buscar ejercicios</span><Search size={18} aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar ejercicio, músculo o equipo" /></label><span aria-live="polite">Mostrando {Math.min(visibleExercises.length, exercises.length)} de {exercises.length} {exercises.length === 1 ? 'resultado' : 'resultados'}</span></div>
      </section>

      {groupedExercises.map(({ category, exercises: categoryExercises }) => (
        <section className="exercise-category-section" key={category.id} aria-labelledby={`category-${category.id}`}>
          <header><div><p className="eyebrow">{categoryExercises.length} {categoryExercises.length === 1 ? 'ejercicio' : 'ejercicios'}</p><h2 id={`category-${category.id}`}>{category.label}</h2><p>{category.description}</p></div></header>
          <div className="exercise-grid">
            {categoryExercises.map((exercise) => {
              const rule = state.progression.exerciseRules.find((candidate) => candidate.exerciseId === exercise.id);
              return <article className="exercise-card" key={exercise.id}><button className="exercise-media-button" type="button" onClick={() => setGuideExercise(exercise)} aria-label={`Abrir guía orientativa de ${exercise.name}`}><ExerciseAnimation exercise={exercise} compact /><span><Eye size={15} /> Guía orientativa</span></button><div className="exercise-body"><p>{category.shortLabel}</p><h3>{exercise.name}</h3><div className="tag-row">{exercise.isBodyweight && <span>Peso corporal</span>}{exercise.isPerSide && <span>Por lado</span>}{exercise.equipment.slice(0, 2).map((item) => <span key={item}>{item}</span>)}{exercise.equipment.length === 0 && !exercise.isBodyweight && <span>Sin equipo</span>}</div></div><div className="exercise-meta"><span><Sparkles size={15} /> {progressionLabel(rule?.strategy)}</span><strong>{rule ? `${rule.state.nextLoadKg} kg` : exercise.measurement === 'duration' ? 'Tiempo' : 'Libre'}</strong><small>{rule ? 'próxima carga' : 'al añadir al plan'}</small></div></article>;
            })}
          </div>
        </section>
      ))}
      {visibleExercises.length < exercises.length && (
        <div className="library-load-more">
          <button className="secondary-button" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
            Mostrar {Math.min(PAGE_SIZE, exercises.length - visibleExercises.length)} ejercicios más
          </button>
          <span>{visibleExercises.length} de {exercises.length} visibles</span>
        </div>
      )}
      {exercises.length === 0 && <div className="empty-state compact-empty"><Search size={30} /><h2>Sin coincidencias</h2><p>No encontramos ejercicios con esos filtros.</p><button className="secondary-button" type="button" onClick={() => { setQuery(''); setCategoryFilter('all'); }}>Limpiar filtros</button></div>}
      <ExerciseGuideDialog exercise={guideExercise} open={Boolean(guideExercise)} onClose={() => setGuideExercise(null)} />
    </main>
  );
}

function normalizeSearch(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}
function splitList(value: string): string[] { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function progressionLabel(strategy?: ProgressionStrategy): string {
  if (!strategy) return 'Sin progresión';
  return strategy === 'greyskull-lp' ? 'Greyskull · progresión lineal' : strategy === 'double-progression' ? 'Doble progresión' : 'Progresión lineal';
}
