import type { BiologicalSex, Exercise, WorkoutSession } from '../../types/state';
import { muscleLabel } from '../../features/exercises/muscle-options';
import { AnatomyFigure, type AnatomySide } from './AnatomyFigure';

interface MuscleMapProps {
  sessions: WorkoutSession[];
  exercises: Exercise[];
  sex: BiologicalSex | null;
}

export function MuscleMap({ sessions, exercises, sex }: MuscleMapProps) {
  const { scores, sessionCount } = calculateRecentMuscleScores(sessions, exercises);
  const maximumScore = Math.max(1, ...scores.values());
  const leaders = [...scores.entries()]
    .filter(([, score]) => score > 0)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5);
  const summary = leaders.map(([id]) => muscleLabel(id)).join(', ');
  const sexLabel = sex === 'female' ? 'Anatomía femenina' : sex === 'male' ? 'Anatomía masculina' : 'Anatomía neutra';

  return (
    <div className="muscle-map-card">
      <div className="card-heading compact">
        <div><p className="eyebrow">Carga reciente</p><h3>Músculos trabajados</h3></div>
        <div className="muscle-map-meta"><span>{sexLabel}</span><small>{sessionCount ? `${sessionCount} ${sessionCount === 1 ? 'sesión' : 'sesiones'}` : 'Sin sesiones'}</small></div>
      </div>
      <div
        className="muscle-map"
        role="img"
        aria-label={summary ? `Mapa muscular de ${sexLabel.toLowerCase()}, vista frontal y posterior. Mayor estímulo reciente: ${summary}` : `Mapa muscular de ${sexLabel.toLowerCase()} sin actividad registrada todavía`}
      >
        {(['front', 'back'] as AnatomySide[]).map((side) => (
          <div className="body-panel" key={side}>
            <span className="body-label">{side === 'front' ? 'Frente' : 'Espalda'}</span>
            <AnatomyFigure side={side} sex={sex} scores={scores} maximumScore={maximumScore} />
          </div>
        ))}
      </div>
      <div className="stimulus-legend" aria-hidden="true"><span>Menor</span>{[1, 2, 3, 4].map((level) => <i className={`level-${level}`} key={level} />)}<span>Mayor</span></div>
      <div className="muscle-key" aria-label="Zonas con mayor estímulo">
        {leaders.map(([id, score]) => <span key={id}><strong>{muscleLabel(id)}</strong><small>{score}</small></span>)}
        {!leaders.length && <span className="muted">Completa una sesión para iluminar las zonas trabajadas.</span>}
      </div>
      <p className="muscle-method">El color combina las series completadas en las últimas cinco sesiones; el músculo principal pondera el doble que el secundario.</p>
    </div>
  );
}

export function calculateRecentMuscleScores(sessions: WorkoutSession[], exercises: Exercise[]) {
  const scores = new Map<string, number>();
  const exercisesById = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  const recent = sessions
    .filter((session) => session.status === 'completed')
    .sort((left, right) => (right.completedAt ?? right.startedAt).localeCompare(left.completedAt ?? left.startedAt))
    .slice(0, 5);

  for (const session of recent) {
    for (const workoutExercise of session.exercises) {
      const exercise = exercisesById.get(workoutExercise.exerciseId);
      if (!exercise) continue;
      const completedSets = workoutExercise.sets.filter((set) => Boolean(set.completedAt)).length;
      const setStimulus = completedSets || workoutExercise.sets.length || 1;
      for (const muscle of new Set(exercise.muscles.primary)) addScore(scores, muscle, setStimulus * 2);
      for (const muscle of new Set(exercise.muscles.secondary)) addScore(scores, muscle, setStimulus);
    }
  }

  return { scores, sessionCount: recent.length };
}

function addScore(scores: Map<string, number>, muscle: string, amount: number) {
  scores.set(muscle, (scores.get(muscle) ?? 0) + amount);
}
