import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(sec: number): string {
  if (!sec) return '0с';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}с`;
  return `${m}м ${s}с`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
}

export function formatDateOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU');
}

export function scoreColor(score: number): string {
  if (score >= 8) return 'text-green-600';
  if (score >= 5) return 'text-yellow-600';
  return 'text-red-600';
}

export function scoreBg(score: number): string {
  if (score >= 8) return 'bg-green-100 text-green-800';
  if (score >= 5) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}
