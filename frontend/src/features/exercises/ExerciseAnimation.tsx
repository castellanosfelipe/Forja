import type { Exercise } from '../../types/state';
import { useEffect, useId, useRef, useState } from 'react';
import { getExerciseGuide } from './exercise-guide';

export function ExerciseAnimation({ exercise, compact = false, paused = false }: { exercise: Exercise; compact?: boolean; paused?: boolean }) {
  const guide = getExerciseGuide(exercise);
  const animationId = useId().replaceAll(':', '');
  const floorPattern = ['horizontal-press', 'fly', 'hip-thrust', 'plank', 'core-flexion', 'leg-curl'].includes(guide.pattern);
  const animationRef = useRef<SVGSVGElement>(null);
  const [isVisible, setIsVisible] = useState(!compact);
  useEffect(() => {
    if (!compact || !animationRef.current || typeof IntersectionObserver === 'undefined') { setIsVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setIsVisible(Boolean(entry?.isIntersecting)), { rootMargin: '120px' });
    observer.observe(animationRef.current);
    return () => observer.disconnect();
  }, [compact]);
  return (
    <svg
      ref={animationRef}
      className={`exercise-animation pattern-${guide.pattern}${compact ? ' compact' : ''}${paused || compact || !isVisible ? ' is-paused' : ''}`}
      viewBox="0 0 240 160"
      role={compact ? 'presentation' : 'img'}
      aria-hidden={compact || undefined}
      aria-label={compact ? undefined : `Ilustración orientativa de ${exercise.name}`}
      aria-describedby={compact ? undefined : `animation-description-${animationId}`}
    >
      {!compact && <title id={`animation-title-${animationId}`}>Ilustración orientativa de {exercise.name}</title>}
      {!compact && <desc id={`animation-description-${animationId}`}>Representación esquemática de una familia de movimientos; no sustituye una demostración específica ni la supervisión profesional.</desc>}
      <rect className="guide-background" x="1" y="1" width="238" height="158" rx="18" />
      <path className="guide-grid" d="M20 132H220M30 28H210" />
      {floorPattern ? <FloorFigure pattern={guide.pattern} /> : <StandingFigure pattern={guide.pattern} />}
      <g className="guide-motion-indicator" aria-hidden="true">
        <path d="M207 54v36" />
        <path d="m201 83 6 7 6-7" />
      </g>
    </svg>
  );
}

function StandingFigure({ pattern }: { pattern: ReturnType<typeof getExerciseGuide>['pattern'] }) {
  const seated = pattern === 'leg-extension';
  return (
    <g className="guide-figure standing-figure" aria-hidden="true">
      {seated && <path className="guide-equipment" d="M86 99h50v10H96v31M136 104v35" />}
      <g className="guide-body">
        <circle className="guide-head" cx="112" cy="35" r="12" />
        <path className="guide-torso" d="M112 48v55" />
        <path className="guide-shoulders" d="M91 58h42" />
        <g className="guide-arm-left"><path d="M92 59 76 84" /><g className="guide-forearm-left"><path d="M76 84 80 111" /><circle className="guide-weight" cx="80" cy="115" r="5" /></g></g>
        <g className="guide-arm-right"><path d="M132 59 148 84" /><g className="guide-forearm-right"><path d="M148 84 144 111" /><circle className="guide-weight" cx="144" cy="115" r="5" /></g></g>
        <g className="guide-legs">
          <g className="guide-leg-left"><path d="M111 102 94 128" /><path d="M94 128 83 146" /></g>
          <g className="guide-leg-right"><path d="M113 102 130 128" /><path d="M130 128 141 146" /></g>
        </g>
      </g>
    </g>
  );
}

function FloorFigure({ pattern }: { pattern: ReturnType<typeof getExerciseGuide>['pattern'] }) {
  const plank = pattern === 'plank';
  const hipThrust = pattern === 'hip-thrust';
  const legCurl = pattern === 'leg-curl';
  const showBench = pattern === 'horizontal-press' || pattern === 'fly' || hipThrust;
  return (
    <g className="guide-figure floor-figure" aria-hidden="true">
      {showBench && <path className="guide-equipment guide-bench" d="M48 101h111M62 101v31M145 101v31" />}
      <g className="guide-floor-body">
        <circle className="guide-head" cx="54" cy={plank ? 80 : 87} r="11" />
        <path className="guide-torso" d={plank ? 'M66 84 132 102' : hipThrust ? 'M66 90 132 104' : 'M66 90h70'} />
        <g className="guide-floor-arms">
          <path d={plank ? 'M78 89 70 126M78 89 91 126' : 'M86 91V56M103 91V56'} />
          {!plank && <path className="guide-bar" d="M70 52h50" />}
        </g>
        <g className="guide-floor-legs">
          <path d={legCurl ? 'M134 91 168 90 177 61' : 'M134 92 170 112 198 128'} />
          <path d={legCurl ? 'M132 96 162 102 171 73' : 'M132 98 165 120 194 135'} />
        </g>
      </g>
    </g>
  );
}
