export function nowMs(): number {
  return Date.now();
}

export function toDate(ms: number | Date): Date {
  return ms instanceof Date ? ms : new Date(ms);
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
