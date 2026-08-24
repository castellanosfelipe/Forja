import type { BodyMeasurementReminder, UserState } from '../../types/state';

export function reminderFor(state: UserState): BodyMeasurementReminder {
  return state.bodyMeasurementReminder ?? {
    enabled: true,
    intervalMonths: 1,
    nextDueAt: addOneMonth(state.owner.createdAt),
    lastNotifiedAt: null,
  };
}

export function isMeasurementDue(reminder: BodyMeasurementReminder, now = new Date()): boolean {
  return reminder.enabled && Date.parse(reminder.nextDueAt) <= now.valueOf();
}

export function addOneMonth(value: string | Date): string {
  const date = new Date(value);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const daysInTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, daysInTargetMonth));
  return date.toISOString();
}

export function snoozeOneWeek(now = new Date()): string {
  return new Date(now.valueOf() + 7 * 24 * 60 * 60 * 1_000).toISOString();
}
