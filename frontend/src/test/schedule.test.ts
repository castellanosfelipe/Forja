import { describe, expect, it } from 'vitest';
import type { PlanDay, ScheduleOverride, WeeklyPlan } from '../types/state';
import { effectivePlanDaysForDate } from '../utils/schedule';

const monday: PlanDay = { id: 'monday', weekday: 1, name: 'Torso', blocks: [] };
const tuesday: PlanDay = { id: 'tuesday', weekday: 2, name: 'Pierna', blocks: [] };
const plan: WeeklyPlan = {
  id: 'weekly-plan',
  name: 'Plan semanal',
  effectiveFrom: '2026-08-24',
  days: [monday, tuesday],
};
const moveMondayToTuesday: ScheduleOverride = {
  id: 'move-monday',
  baseDayId: monday.id,
  originalDate: '2026-08-24',
  scheduledDate: '2026-08-25',
  reason: 'Agenda',
  createdAt: '2026-08-23T12:00:00.000Z',
};

describe('effectivePlanDaysForDate', () => {
  it('moves a Monday plan day to Tuesday without changing the base plan', () => {
    const original = effectivePlanDaysForDate(plan, [moveMondayToTuesday], '2026-08-24');
    const destination = effectivePlanDaysForDate(plan, [moveMondayToTuesday], '2026-08-25');

    expect(original).toEqual([]);
    expect(destination.map((day) => day.id)).toEqual(['tuesday', 'monday']);
    expect(plan.days).toEqual([monday, tuesday]);
    expect(moveMondayToTuesday.originalDate).toBe('2026-08-24');
  });

  it('leaves the original date empty after the only scheduled day moves away', () => {
    expect(effectivePlanDaysForDate(
      { ...plan, days: [monday] },
      [moveMondayToTuesday],
      '2026-08-24',
    )).toEqual([]);
  });

  it('makes the moved day effective on its new date alongside that date base day', () => {
    expect(effectivePlanDaysForDate(plan, [moveMondayToTuesday], '2026-08-25').map((day) => day.id))
      .toEqual(['tuesday', 'monday']);
  });

  it('does not duplicate a plan day when repeated overrides target the same date', () => {
    const duplicate = { ...moveMondayToTuesday, id: 'duplicate' };
    expect(effectivePlanDaysForDate(plan, [moveMondayToTuesday, duplicate], '2026-08-25').map((day) => day.id))
      .toEqual(['tuesday', 'monday']);
  });
});
