import { AlertTriangle, CheckCircle2, Wind, X } from 'lucide-react';
import { useId, useRef } from 'react';
import { Modal } from '../../components/feedback/Modal';
import type { Exercise } from '../../types/state';
import { ExerciseMedia } from './ExerciseMedia';
import { getExerciseGuide } from './exercise-guide';
import { getExerciseMedia } from './media/exercise-media';

export function ExerciseGuideDialog({ exercise, open, onClose }: { exercise: Exercise | null; open: boolean; onClose(): void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  if (!exercise) return null;
  const guide = getExerciseGuide(exercise);
  const media = getExerciseMedia(exercise.id);
  const steps = media?.instructions.length
    ? media.instructions.map((description, index) => ({ title: `Paso ${index + 1}`, description }))
    : guide.steps;
  const cues = media?.tips.length ? media.tips : guide.cues;
  return (
    <Modal
      open={open}
      backdropClassName="guide-dialog-backdrop"
      contentClassName="exercise-guide-dialog"
      labelledBy={titleId}
      initialFocusRef={closeButton}
      onClose={onClose}
    >
      <header>
        <div><p className="eyebrow">Guía de ejecución</p><h2 id={titleId}>{exercise.name}</h2><span>{exercise.equipment.length ? exercise.equipment.join(' · ') : exercise.isBodyweight ? 'Peso corporal' : 'Sin equipo'}</span></div>
        <button ref={closeButton} className="icon-button" type="button" aria-label="Cerrar guía" onClick={onClose}><X /></button>
      </header>
      <div className="exercise-guide-layout">
        <div className="guide-visual-panel">
          <ExerciseMedia exercise={exercise} />
          <div className="guide-media-note">
            {media
              ? <p><strong>Demostración del ejercicio:</strong> compara cada posición antes de comenzar la serie.</p>
              : <p><strong>Ejercicio personalizado:</strong> todavía no cuenta con una demostración visual verificada.</p>}
            {media?.description && <p>{media.description}</p>}
          </div>
        </div>
        <div className="guide-instructions">
          <ol>{steps.map((step, index) => <li key={`${index}-${step.title}`}><span>{index + 1}</span><div><strong>{step.title}</strong><p>{step.description}</p></div></li>)}</ol>
          <section className="technique-cues"><h3>Señales clave</h3><div>{cues.map((cue) => <span key={cue}><CheckCircle2 /> {cue}</span>)}</div></section>
          <div className="breathing-cue"><Wind /><div><strong>Respiración</strong><p>{guide.breathing}</p></div></div>
          <div className="safety-cue"><AlertTriangle /><div><strong>Evita</strong><p>{guide.warning}</p></div></div>
        </div>
      </div>
      <footer><p>Guía educativa general. Si existe dolor, lesión o una condición médica, consulta a un profesional cualificado.</p><button className="primary-button" type="button" onClick={onClose}>Entendido</button></footer>
    </Modal>
  );
}
