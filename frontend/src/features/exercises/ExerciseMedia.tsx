import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import type { Exercise } from '../../types/state';
import { getExerciseMedia } from './media/exercise-media';
import type { ExerciseMediaFrame } from './media/types';
import { validGuideImage } from './custom-media';

interface ExerciseMediaProps {
  exercise: Exercise;
  compact?: boolean;
}

export function ExerciseMedia({ exercise, compact = false }: ExerciseMediaProps) {
  if (exercise.guideMedia && validGuideImage(exercise.guideMedia.dataUrl)) {
    return <MediaImage key={exercise.guideMedia.dataUrl} exerciseName={exercise.name} frame={{ src: exercise.guideMedia.dataUrl, label: 'Secuencia' }} compact={compact} alt={exercise.guideMedia.alt} />;
  }
  const media = getExerciseMedia(exercise.id);
  if (!media) return <MissingMedia compact={compact} />;

  if (compact) {
    return (
      <MediaImage
        key={media.frames[0]!.src}
        exerciseName={exercise.name}
        frame={media.frames[0]!}
        compact
      />
    );
  }

  return (
    <div className={`exercise-media-gallery frames-${Math.min(media.frames.length, 3)}`} role="group" aria-label={`Demostración visual de ${exercise.name}`}>
      {media.frames.map((frame) => (
        <figure className={frame.label === 'Secuencia' ? 'sequence-frame' : undefined} key={frame.src}>
          <MediaImage exerciseName={exercise.name} frame={frame} />
          <figcaption>{frame.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function MediaImage({ exerciseName, frame, compact = false, alt }: { exerciseName: string; frame: ExerciseMediaFrame; compact?: boolean; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <MissingMedia compact={compact} loadFailed />;

  return (
    <img
      className={`exercise-media-image${compact ? ' compact' : ''}`}
      src={frame.src}
      alt={compact ? '' : alt ?? `${exerciseName}: ${frame.label.toLowerCase()}`}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

function MissingMedia({ compact, loadFailed = false }: { compact?: boolean; loadFailed?: boolean }) {
  return (
    <div className={`exercise-media-missing${compact ? ' compact' : ''}`} role={compact ? undefined : 'status'}>
      <ImageOff aria-hidden="true" />
      <span>{loadFailed ? 'No se pudo cargar la demostración' : 'Sin demostración verificada'}</span>
    </div>
  );
}
