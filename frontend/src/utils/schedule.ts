import type { PlanDay, ScheduleOverride, WeeklyPlan } from '../types/state';

/**
 * Returns the plan days that are effective on a local calendar date.
 *
 * A schedule override removes its base day from `originalDate` and adds it to
 * `scheduledDate`. A Map keyed by plan-day id prevents duplicate entries when
 * the same day is both part of the base weekday and explicitly scheduled, or
 * when duplicate overrides exist in persisted data.
 */
export function effectivePlanDaysForDate(
  plan: Pick<WeeklyPlan, 'days'>,
  overrides: readonly ScheduleOverride[],
  dateKey: string,
): PlanDay[] {
  const weekday = weekdayForDateKey(dateKey);
  const daysById = new Map(plan.days.map((day) => [day.id, day]));
  const movedAway = new Set(
    overrides
      .filter((override) => override.originalDate === dateKey)
      .map((override) => override.baseDayId),
  );
  const effective = new Map<string, PlanDay>();

  for (const day of plan.days) {
    if (day.weekday === weekday && !movedAway.has(day.id)) effective.set(day.id, day);
  }

  for (const override of overrides) {
    if (override.scheduledDate !== dateKey) continue;
    const day = daysById.get(override.baseDayId);
    if (day) effective.set(day.id, day);
  }

  return [...effective.values()];
}

function weekdayForDateKey(dateKey: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new RangeError('dateKey must use YYYY-MM-DD');
  }
  const date = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(date.valueOf())) throw new RangeError('dateKey must be a valid calendar date');
  return date.getDay();
}
