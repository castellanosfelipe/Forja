import { describe, expect, it } from 'vitest';
import { isThisWeek, localDateKey, startOfWeek } from '../utils/dates';

describe('date helpers', () => {
  it('formats local date keys without UTC day drift', () => {
    expect(localDateKey(new Date(2026, 7, 24, 23, 30))).toBe('2026-08-24');
  });

  it('uses Monday as the first day of the week', () => {
    const monday = startOfWeek(new Date(2026, 7, 26, 10));
    expect(monday.getDay()).toBe(1);
    expect(isThisWeek(new Date().toISOString())).toBe(true);
  });
});
