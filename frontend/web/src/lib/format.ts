import { useI18n } from '@/store/i18n';
import { parseLocaleNumber as i18nParse } from '@/lib/i18n/parse';

/**
 * Reactive i18n helpers that read locale/currency/timezone from the i18n store.
 * Drop-in replacements for the old hardcoded `money()`/`points()`.
 */

function store() {
  return useI18n.getState();
}

export function money(n: number): string {
  return store().formatters.money(n);
}

export function points(n: number): string {
  return store().formatters.number(n, { maximumFractionDigits: 0 });
}

export function formatNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return store().formatters.number(n, opts);
}

export function percent(fraction: number): string {
  return store().formatters.percent(fraction);
}

export function formatDate(
  value: Date | string | number,
  opts?: Intl.DateTimeFormatOptions
): string {
  const s = store();
  return s.formatters.date(value, { timeZone: s.timezone, ...opts });
}

export function formatDateTime(
  value: Date | string | number,
  opts?: Intl.DateTimeFormatOptions
): string {
  const s = store();
  return s.formatters.date(value, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: s.timezone,
    ...opts,
  });
}

export function formatTime(value: Date | string | number): string {
  const s = store();
  return s.formatters.date(value, { timeStyle: 'short', timeZone: s.timezone });
}

export function parseLocaleNumber(input: string, locale?: string): number | null {
  return i18nParse(input, locale ?? store().locale);
}

export function formatRelative(value: Date | string | number): string {
  const s = store();
  const date = value instanceof Date ? value : new Date(value);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (Math.abs(diffSec) < 60) return diffSec < 0 ? 'just now' : 'moments ago';
  if (Math.abs(diffMin) < 60) return s.formatters.plural(Math.abs(diffMin), { one: '1 min', other: `${Math.abs(diffMin)} mins` }) + (diffMin < 0 ? ' ago' : '');
  if (Math.abs(diffHour) < 24) return s.formatters.plural(Math.abs(diffHour), { one: '1 hr', other: `${Math.abs(diffHour)} hrs` }) + (diffHour < 0 ? ' ago' : '');
  if (Math.abs(diffDay) < 7) return s.formatters.plural(Math.abs(diffDay), { one: '1 day', other: `${Math.abs(diffDay)} days` }) + (diffDay < 0 ? ' ago' : '');
  return store().formatters.date(date, { dateStyle: 'medium', timeZone: s.timezone });
}
