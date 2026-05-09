export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}

export function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
