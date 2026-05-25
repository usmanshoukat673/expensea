import { faker } from '@faker-js/faker';

let seeded = false;

export function initFaker(seed = 20260525): void {
  if (!seeded) {
    faker.seed(seed);
    seeded = true;
  }
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

export function toDateString(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function toIso(d: Date): string {
  return d.toISOString();
}

export function monthStart(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickWeighted<T extends string>(
  weights: Record<T, number>,
): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

export function randomAmount(min: number, max: number): number {
  const v = min + Math.random() * (max - min);
  return Math.round(v * 100) / 100;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function randomExpenseDate(monthsBack = 8): Date {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - monthsBack);
  const ts = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  const d = new Date(ts);
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() + 1);
  if (day === 6 && Math.random() < 0.35) d.setDate(d.getDate() - 1);
  return d;
}

export function categoryAmountRange(slug: string): [number, number] {
  switch (slug) {
    case 'food':
      return [250, 5500];
    case 'travel':
      return [800, 28000];
    case 'office':
      return [500, 15000];
    case 'internet':
      return [1200, 8500];
    case 'utilities':
      return [2000, 12000];
    case 'entertainment':
      return [400, 8000];
    default:
      return [300, 6000];
  }
}

export function log(step: string, detail?: string): void {
  const msg = detail ? `[seed] ${step} — ${detail}` : `[seed] ${step}`;
  console.log(msg);
}
