// Locale-aware formatting built on the Intl API — one place for money, numbers,
// dates, plurals and lists so the whole app respects the store's locale and
// currency instead of a hardcoded "$"/"en-US". Also exposes text direction so
// layouts can go RTL-safe.
//
// All factories are defensive: an invalid locale/currency never throws, it
// degrades to a sensible default. Intl instances are cached because constructing
// them is comparatively expensive.

import type { TextDirection } from '@/lib/contracts/types';

export interface PluralForms {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
}

export interface Formatters {
  locale: string;
  currency: string;
  direction: TextDirection;
  /** Currency, e.g. 1234.5 -> "£1,234.50" (en-GB/GBP). */
  money: (n: number) => string;
  /** Plain number with grouping + optional fraction digits. */
  number: (n: number, opts?: Intl.NumberFormatOptions) => string;
  /** Percent from a fraction, e.g. 0.2 -> "20%". */
  percent: (fraction: number, opts?: Intl.NumberFormatOptions) => string;
  /** Date/time; accepts Date | ISO string | epoch ms. */
  date: (value: Date | string | number, opts?: Intl.DateTimeFormatOptions) => string;
  /** CLDR plural selection: plural(2, { one, other }) -> "other". */
  plural: (n: number, forms: PluralForms) => string;
  /** "a, b and c" per locale. */
  list: (items: string[]) => string;
}

const RTL_LANGUAGES = new Set(['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'dv', 'yi', 'ckb']);

function safeLocale(locale: string): string {
  try {
    return new Intl.Locale(locale).toString();
  } catch {
    return 'en';
  }
}

/** Resolve text direction, preferring Intl.Locale.textInfo where supported. */
export function directionForLocale(locale: string): TextDirection {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      textInfo?: { direction?: string };
      getTextInfo?: () => { direction?: string };
    };
    const info = loc.getTextInfo?.() ?? loc.textInfo;
    if (info?.direction === 'rtl' || info?.direction === 'ltr') return info.direction;
    return RTL_LANGUAGES.has(loc.language ?? '') ? 'rtl' : 'ltr';
  } catch {
    const lang = locale.toLowerCase().split('-')[0];
    return RTL_LANGUAGES.has(lang) ? 'rtl' : 'ltr';
  }
}

export function isRtlLocale(locale: string): boolean {
  return directionForLocale(locale) === 'rtl';
}

// --- caches ------------------------------------------------------------------
const numberCache = new Map<string, Intl.NumberFormat>();
const dateCache = new Map<string, Intl.DateTimeFormat>();
const pluralCache = new Map<string, Intl.PluralRules>();

function numberFormat(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(opts);
  let fmt = numberCache.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(locale, opts);
    } catch {
      fmt = new Intl.NumberFormat('en', { ...opts, currency: undefined });
    }
    numberCache.set(key, fmt);
  }
  return fmt;
}

function dateFormat(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = locale + JSON.stringify(opts);
  let fmt = dateCache.get(key);
  if (!fmt) {
    try {
      fmt = new Intl.DateTimeFormat(locale, opts);
    } catch {
      fmt = new Intl.DateTimeFormat('en', opts);
    }
    dateCache.set(key, fmt);
  }
  return fmt;
}

function pluralRules(locale: string): Intl.PluralRules {
  let r = pluralCache.get(locale);
  if (!r) {
    try {
      r = new Intl.PluralRules(locale);
    } catch {
      r = new Intl.PluralRules('en');
    }
    pluralCache.set(locale, r);
  }
  return r;
}

function toDate(value: Date | string | number): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Build a bundle of formatters bound to a store's locale + currency.
 * Prefer calling this once (e.g. from a StoreProfile context) and passing the
 * result down, rather than re-deriving per render.
 */
export function createFormatters(locale: string, currency: string): Formatters {
  const loc = safeLocale(locale);
  const cur = /^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : 'USD';
  const direction = directionForLocale(loc);

  return {
    locale: loc,
    currency: cur,
    direction,
    money: (n) =>
      numberFormat(loc, { style: 'currency', currency: cur }).format(Number.isFinite(n) ? n : 0),
    number: (n, opts) => numberFormat(loc, opts ?? {}).format(Number.isFinite(n) ? n : 0),
    percent: (fraction, opts) =>
      numberFormat(loc, { style: 'percent', maximumFractionDigits: 2, ...opts }).format(
        Number.isFinite(fraction) ? fraction : 0
      ),
    date: (value, opts) => dateFormat(loc, opts ?? { dateStyle: 'medium' }).format(toDate(value)),
    plural: (n, forms) => {
      const category = pluralRules(loc).select(Number.isFinite(n) ? n : 0);
      return forms[category] ?? forms.other;
    },
    list: (items) => {
      try {
        return new Intl.ListFormat(loc, { style: 'long', type: 'conjunction' }).format(items);
      } catch {
        return items.join(', ');
      }
    },
  };
}

/** Default en-GB/GBP bundle for contexts without a resolved StoreProfile. */
export const defaultFormatters = createFormatters('en-GB', 'GBP');
