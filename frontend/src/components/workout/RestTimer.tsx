import { Minus, Plus, SkipForward } from 'lucide-react';
import { useState } from 'react';

interface RestTimerProps {
  seconds: number;
  onAdd(seconds: number): void;
  onSkip(): void;
}

export function RestTimer({ seconds, onAdd, onSkip }: RestTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(() => Math.max(1, seconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  const progress = Math.min(100, Math.max(0, seconds / totalSeconds * 100));

  function adjust(delta: number) {
    setTotalSeconds((current) => Math.max(1, current + delta));
    onAdd(delta);
  }

  return (
    <aside className="rest-timer" aria-label="Temporizador de descanso">
      <div className="timer-ring" style={{ '--timer-progress': `${progress * 3.6}deg` } as React.CSSProperties}>
        <div><small>Descanso</small><strong role="timer" aria-live="off" aria-label={`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'} y ${remainder} ${remainder === 1 ? 'segundo' : 'segundos'}`}>{minutes}:{String(remainder).padStart(2, '0')}</strong></div>
      </div>
      <div><h2>Respira. Recupera.</h2><p>La siguiente serie empieza cuando estés listo.</p><div className="timer-actions"><button type="button" aria-label="Restar 15 segundos" onClick={() => adjust(-15)}><Minus size={16} aria-hidden="true" /> <span>15 s</span></button><button type="button" aria-label="Añadir 15 segundos" onClick={() => adjust(15)}><Plus size={16} aria-hidden="true" /> <span>15 s</span></button><button type="button" aria-label="Omitir descanso" onClick={onSkip}><SkipForward size={16} aria-hidden="true" /> <span>Omitir</span></button></div></div>
    </aside>
  );
}
