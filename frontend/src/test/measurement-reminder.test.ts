import { describe, expect, it } from 'vitest';
import { addOneMonth, isMeasurementDue, snoozeOneWeek } from '../features/metrics/measurement-reminder';

describe('monthly body measurement reminder', () => {
  it('preserves the day of month and clamps short months', () => {
    expect(addOneMonth('2026-01-31T12:00:00.000Z')).toBe('2026-02-28T12:00:00.000Z');
    expect(addOneMonth('2028-01-31T12:00:00.000Z')).toBe('2028-02-29T12:00:00.000Z');
  });

  it('becomes due only when enabled and supports a seven-day snooze', () => {
    const now = new Date('2026-08-24T12:00:00.000Z');
    expect(isMeasurementDue({ enabled: true, intervalMonths: 1, nextDueAt: '2026-08-24T11:59:59.000Z', lastNotifiedAt: null }, now)).toBe(true);
    expect(isMeasurementDue({ enabled: false, intervalMonths: 1, nextDueAt: '2026-08-01T00:00:00.000Z', lastNotifiedAt: null }, now)).toBe(false);
    expect(snoozeOneWeek(now)).toBe('2026-08-31T12:00:00.000Z');
  });
});
