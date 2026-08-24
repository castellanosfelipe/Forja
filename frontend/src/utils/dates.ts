const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(new Date(value));
}

export function weekdayName(index: number): string {
  return WEEKDAY_NAMES[index] ?? 'Día';
}

export function startOfWeek(date = new Date()): Date {
  const result = new Date(date);
  const difference = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - difference);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function isThisWeek(dateValue: string): boolean {
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  const date = new Date(dateValue);
  return date >= start && date < end;
}
