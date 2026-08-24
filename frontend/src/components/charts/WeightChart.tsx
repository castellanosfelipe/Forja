import { useId, useMemo, useState } from 'react';
import type { BodyWeightEntry } from '../../types/state';
import { formatDate } from '../../utils/dates';

interface WeightChartProps {
  entries: BodyWeightEntry[];
  targetKg: number | null;
}

const WIDTH = 760;
const HEIGHT = 270;
const PADDING = { top: 28, right: 30, bottom: 36, left: 48 };
const weightFormatter = new Intl.NumberFormat('es-CO', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatWeight(value: number): string {
  return weightFormatter.format(value);
}

export function WeightChart({ entries, targetKg }: WeightChartProps) {
  const gradientId = useId().replaceAll(':', '');
  const summaryId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);
  const data = useMemo(
    () => [...entries].sort((left, right) => left.measuredAt.localeCompare(right.measuredAt)).slice(-24),
    [entries],
  );

  if (data.length === 0) {
    return <div className="empty-chart">Añade tu primera medición para dibujar la tendencia.</div>;
  }

  const weights = [...data.map((entry) => entry.weightKg), ...(targetKg === null ? [] : [targetKg])];
  const min = Math.floor(Math.min(...weights) - 1);
  const max = Math.ceil(Math.max(...weights) + 1);
  const range = Math.max(1, max - min);
  const plotWidth = WIDTH - PADDING.left - PADDING.right;
  const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const point = (entry: BodyWeightEntry, index: number) => ({
    x: PADDING.left + (data.length === 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth),
    y: PADDING.top + ((max - entry.weightKg) / range) * plotHeight,
  });
  const points = data.map(point);
  const line = points.map((value, index) => `${index === 0 ? 'M' : 'L'} ${value.x} ${value.y}`).join(' ');
  const area = `${line} L ${points.at(-1)!.x} ${HEIGHT - PADDING.bottom} L ${points[0]!.x} ${HEIGHT - PADDING.bottom} Z`;
  const goalY = targetKg === null ? null : PADDING.top + ((max - targetKg) / range) * plotHeight;
  const activeIndex = data.findIndex((entry) => entry.id === activeId);
  const active = activeIndex >= 0 ? { entry: data[activeIndex]!, ...points[activeIndex]! } : null;
  const first = data[0]!;
  const latest = data.at(-1)!;
  const change = latest.weightKg - first.weightKg;
  const changeText = data.length === 1
    ? 'Aún no hay cambio para comparar.'
    : Math.abs(change) < 0.05
      ? 'El peso se mantuvo estable entre la primera y la última medición.'
      : `El peso ${change < 0 ? 'bajó' : 'subió'} ${formatWeight(Math.abs(change))} kg entre la primera y la última medición.`;
  const targetText = targetKg === null
    ? 'No hay una meta de peso definida.'
    : `La meta es ${formatWeight(targetKg)} kg.`;
  const summary = `${data.length} ${data.length === 1 ? 'medición representada' : 'mediciones representadas'}, del ${formatDate(first.measuredAt)} al ${formatDate(latest.measuredAt)}. Último peso: ${formatWeight(latest.weightKg)} kg. ${changeText} ${targetText}`;
  const accessiblePoints = [...data].reverse();

  return (
    <div aria-describedby={summaryId}>
      <p className="weight-chart-summary" id={summaryId}>{summary}</p>
      <div className="weight-chart-wrap">
        <svg className="weight-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#174e38" stopOpacity=".24" />
              <stop offset="1" stopColor="#174e38" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, .25, .5, .75, 1].map((fraction) => {
            const y = PADDING.top + fraction * plotHeight;
            const value = max - fraction * range;
            return (
              <g key={fraction}>
                <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} className="grid-line" />
                <text x={PADDING.left - 10} y={y + 4} textAnchor="end" className="axis-label">{value.toFixed(0)} kg</text>
              </g>
            );
          })}
          {goalY !== null && (
            <g>
              <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={goalY} y2={goalY} className="goal-line" />
              <text x={WIDTH - PADDING.right} y={goalY - 7} textAnchor="end" className="goal-label">Meta · {formatWeight(targetKg!)} kg</text>
            </g>
          )}
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} className="weight-line" />
          {points.map((value, index) => (
            <circle key={data[index]!.id} cx={value.x} cy={value.y} r={activeId === data[index]!.id ? 7 : 4.5} className="weight-point" />
          ))}
          {active && (
            <g className="chart-tooltip" transform={`translate(${Math.min(active.x, WIDTH - 145)} ${Math.max(8, active.y - 55)})`}>
              <rect width="128" height="43" rx="8" />
              <text x="10" y="18">{formatWeight(active.entry.weightKg)} kg</text>
              <text x="10" y="34" className="tooltip-date">{formatDate(active.entry.measuredAt, { day: 'numeric', month: 'short' })}</text>
            </g>
          )}
          <text x={PADDING.left} y={HEIGHT - 10} className="axis-label">{formatDate(first.measuredAt, { day: 'numeric', month: 'short' })}</text>
          <text x={WIDTH - PADDING.right} y={HEIGHT - 10} textAnchor="end" className="axis-label">{formatDate(latest.measuredAt, { day: 'numeric', month: 'short' })}</text>
        </svg>
      </div>
      <ol className="weight-point-list" aria-label="Mediciones de la gráfica, de la más reciente a la más antigua">
        {accessiblePoints.map((entry) => {
          const chronologicalIndex = data.findIndex((candidate) => candidate.id === entry.id);
          return (
            <li key={entry.id}>
              <button
                type="button"
                className={activeId === entry.id ? 'active' : undefined}
                aria-label={`${formatWeight(entry.weightKg)} kg, ${formatDate(entry.measuredAt)}. Punto ${chronologicalIndex + 1} de ${data.length}.`}
                onClick={() => setActiveId(entry.id)}
                onFocus={() => setActiveId(entry.id)}
                onBlur={() => setActiveId(null)}
                onPointerEnter={() => setActiveId(entry.id)}
                onPointerLeave={(event) => {
                  if (document.activeElement !== event.currentTarget) setActiveId(null);
                }}
              >
                <strong>{formatWeight(entry.weightKg)} kg</strong>
                <span>{formatDate(entry.measuredAt, { day: 'numeric', month: 'short' })}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
