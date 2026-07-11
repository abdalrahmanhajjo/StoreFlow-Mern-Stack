// Locale-aware number parsing. Users type "1.234,56" (de) or "1,234.56" (en);
// we must read both without guessing. We discover the locale's group and
// decimal separators from Intl and normalise to a JS number. Currency symbols,
// spaces and bidi marks are stripped so pasted values (e.g. "£12.50") still work
// — we never block paste.

interface Separators {
  group: string;
  decimal: string;
}

const sepCache = new Map<string, Separators>();

export function getSeparators(locale: string): Separators {
  let s = sepCache.get(locale);
  if (!s) {
    try {
      const parts = new Intl.NumberFormat(locale).formatToParts(11111.1);
      const group = parts.find((p) => p.type === 'group')?.value ?? ',';
      const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
      s = { group, decimal };
    } catch {
      s = { group: ',', decimal: '.' };
    }
    sepCache.set(locale, s);
  }
  return s;
}

const NON_NUMERIC = /[^\d.-]/g;
// Bidi/format control chars sometimes wrap RTL currency strings.
const CONTROL = /[\u200E\u200F\u061C\u2066-\u2069]/g;

/**
 * Parse a user-entered string into a number using the given locale's
 * separators. Returns `null` when the input is empty or not a valid number
 * (so callers can distinguish "cleared" from "0").
 */
export function parseLocaleNumber(input: string, locale: string): number | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.replace(CONTROL, '').trim();
  if (trimmed === '') return null;

  const { group, decimal } = getSeparators(locale);
  // Remove group separators, standardise the decimal separator to ".".
  let normalised = trimmed.split(group).join('');
  if (decimal !== '.') normalised = normalised.split(decimal).join('.');
  // Drop currency symbols, letters, stray spaces — keep digits, dot, sign.
  normalised = normalised.replace(NON_NUMERIC, '');
  if (normalised === '' || normalised === '-' || normalised === '.') return null;

  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

/** Clamp helper shared by numeric inputs. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
