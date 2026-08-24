import { useEffect, useId, useMemo, useRef } from 'react';
import type { WorkoutSession } from '../../types/state';
import { formatDate, localDateKey } from '../../utils/dates';

interface TrainingHeatmapProps { sessions: WorkoutSession[] }

export interface TrainingHeatmapDay {
  key: string;
  count: number;
  date: Date;
}

export interface TrainingHeatmapData {
  days: TrainingHeatmapDay[];
  slots: Array<TrainingHeatmapDay | null>;
  leadingPadding: number;
  trailingPadding: number;
  total: number;
}

/** Builds exactly 365 calendar days; null slots only align the first day to Monday. */
export function buildTrainingHeatmap(sessions: WorkoutSession[], today = new Date()): TrainingHeatmapData {
  const counts = new Map<string, number>();
  for (const session of sessions) {
    if (session.status !== 'completed') continue;
    counts.set(session.scheduledDate, (counts.get(session.scheduledDate) ?? 0) + 1);
  }

  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - 364);

  const days = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = localDateKey(date);
    return { key, count: counts.get(key) ?? 0, date };
  });
  const leadingPadding = (start.getDay() + 6) % 7;
  const trailingPadding = (7 - ((leadingPadding + days.length) % 7)) % 7;
  const slots: Array<TrainingHeatmapDay | null> = [
    ...Array.from({ length: leadingPadding }, () => null),
    ...days,
    ...Array.from({ length: trailingPadding }, () => null),
  ];

  return {
    days,
    slots,
    leadingPadding,
    trailingPadding,
    total: days.reduce((sum, day) => sum + day.count, 0),
  };
}

function dateLabel(key: string): string {
  return formatDate(`${key}T12:00:00`);
}

export function TrainingHeatmap({ sessions }: TrainingHeatmapProps) {
  const headingId = useId();
  const summaryId = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const data = useMemo(() => buildTrainingHeatmap(sessions), [sessions]);
  const activeDays = data.days.filter((day) => day.count > 0);
  const busiest = activeDays.reduce<TrainingHeatmapDay | null>(
    (current, day) => current === null || day.count > current.count ? day : current,
    null,
  );
  const firstDay = data.days[0]!;
  const lastDay = data.days.at(-1)!;
  const sessionWord = data.total === 1 ? 'sesión completada' : 'sesiones completadas';
  const dayWord = activeDays.length === 1 ? 'día con entrenamiento' : 'días con entrenamiento';
  const summary = data.total === 0
    ? `Periodo del ${dateLabel(firstDay.key)} al ${dateLabel(lastDay.key)}. No hay sesiones completadas en estos 365 días.`
    : `Periodo del ${dateLabel(firstDay.key)} al ${dateLabel(lastDay.key)}: ${data.total} ${sessionWord}, ${data.total === 1 ? 'distribuida' : 'distribuidas'} en ${activeDays.length} ${dayWord}. ${busiest ? `El día más activo fue el ${dateLabel(busiest.key)}, con ${busiest.count} ${busiest.count === 1 ? 'sesión' : 'sesiones'}.` : ''}`;

  useEffect(() => {
    const scroll = scrollRef.current;
    if (scroll && scroll.scrollWidth > scroll.clientWidth) scroll.scrollLeft = scroll.scrollWidth;
  }, []);

  return (
    <section aria-labelledby={headingId} aria-describedby={summaryId}>
      <div className="card-heading compact">
        <div><p className="eyebrow">Constancia</p><h3 id={headingId}>365 días en movimiento</h3></div>
        <strong>{data.total} {data.total === 1 ? 'sesión' : 'sesiones'}</strong>
      </div>
      <p className="sr-only" id={summaryId}>{summary}</p>
      <div
        className="heatmap-scroll"
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Actividad diaria; desplázate horizontalmente para recorrer el año"
        aria-describedby={summaryId}
      >
        <div className="heatmap" aria-hidden="true">
          {data.slots.map((day, index) => day ? (
            <span
              key={day.key}
              className={`heat-cell level-${Math.min(4, day.count)}`}
              data-heatmap-day={day.key}
              title={`${dateLabel(day.key)}: ${day.count} ${day.count === 1 ? 'sesión' : 'sesiones'}`}
            />
          ) : (
            <span key={`padding-${index}`} className="heat-padding" data-heatmap-padding="true" />
          ))}
        </div>
      </div>
      <div className="heat-legend" role="list" aria-label="Escala de sesiones por día">
        <span aria-hidden="true">Menos</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <span className="heat-legend-item" role="listitem" key={level}>
            <i className={`heat-cell level-${level}`} aria-hidden="true" />
            <span className="sr-only">{level === 0 ? 'Ninguna sesión' : level === 4 ? '4 o más sesiones' : `${level} ${level === 1 ? 'sesión' : 'sesiones'}`}</span>
          </span>
        ))}
        <span aria-hidden="true">Más</span>
      </div>
    </section>
  );
}
