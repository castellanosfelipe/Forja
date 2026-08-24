import { AlertTriangle, CheckCircle2, Pause, Play, Wind, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Modal } from '../../components/feedback/Modal';
import type { Exercise } from '../../types/state';
import { ExerciseAnimation } from './ExerciseAnimation';
import { getExerciseGuide } from './exercise-guide';

export function ExerciseGuideDialog({ exercise, open, onClose }: { exercise: Exercise | null; open: boolean; onClose(): void }) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [paused, setPaused] = useState(false);

  useEffect(() => { setPaused(false); }, [exercise?.id, open]);

  if (!exercise) return null;
  const guide = getExerciseGuide(exercise);
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
          <ExerciseAnimation exercise={exercise} paused={paused} />
          <div className="guide-animation-controls">
            <p><strong>Referencia orientativa:</strong> muestra una familia de movimiento genérica, no una demostración verificada de este ejercicio exacto.</p>
            <button className="secondary-button" type="button" aria-pressed={paused} onClick={() => setPaused((value) => !value)}>
              {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
              {paused ? 'Reproducir' : 'Pausar'}
            </button>
          </div>
        </div>
        <div className="guide-instructions">
          <ol>{guide.steps.map((step, index) => <li key={step.title}><span>{index + 1}</span><div><strong>{step.title}</strong><p>{step.description}</p></div></li>)}</ol>
          <section className="technique-cues"><h3>Señales clave</h3><div>{guide.cues.map((cue) => <span key={cue}><CheckCircle2 /> {cue}</span>)}</div></section>
          <div className="breathing-cue"><Wind /><div><strong>Respiración</strong><p>{guide.breathing}</p></div></div>
          <div className="safety-cue"><AlertTriangle /><div><strong>Evita</strong><p>{guide.warning}</p></div></div>
        </div>
      </div>
      <footer><p>Guía educativa general. Si existe dolor, lesión o una condición médica, consulta a un profesional cualificado.</p><button className="primary-button" type="button" onClick={onClose}>Entendido</button></footer>
    </Modal>
  );
}
