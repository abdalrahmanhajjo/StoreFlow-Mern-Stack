import { describe, it, expect } from 'vitest';
import { createFormatters, directionForLocale, isRtlLocale } from '@/lib/i18n/format';

describe('createFormatters — money', () => {
  it('formats currency per locale', () => {
    const gb = createFormatters('en-GB', 'GBP');
    expect(gb.money(1234.5)).toContain('£');
    expect(gb.money(1234.5)).toContain('1,234.50');

    const us = createFormatters('en-US', 'USD');
    expect(us.money(1234.5)).toBe('$1,234.50');
  });

  it('uses the store currency, not a hardcoded symbol', () => {
    const eg = createFormatters('ar-EG', 'EGP');
    // Arabic-Egypt uses Eastern Arabic digits + the EGP symbol; just assert it
    // is not a naive "$" and that it produced a non-empty localised string.
    expect(eg.money(10)).not.toContain('$');
    expect(eg.money(10).length).toBeGreaterThan(0);
  });

  it('degrades safely on an invalid currency/locale instead of throwing', () => {
    // A malformed (non 3-letter) currency falls back to USD.
    const bad = createFormatters('not-a-locale', '$$');
    expect(bad.currency).toBe('USD');
    expect(() => bad.money(5)).not.toThrow();
    // A well-formed but unknown code is accepted by Intl and must not throw.
    const unknown = createFormatters('en', 'ZZZ');
    expect(() => unknown.money(5)).not.toThrow();
  });

  it('treats non-finite input as 0', () => {
    const f = createFormatters('en-US', 'USD');
    expect(f.money(Number.NaN)).toBe('$0.00');
  });
});

describe('number / percent / date', () => {
  const f = createFormatters('en-GB', 'GBP');
  it('formats numbers and percents', () => {
    expect(f.number(1234567.89, { maximumFractionDigits: 1 })).toBe('1,234,567.9');
    expect(f.percent(0.2)).toBe('20%');
  });
  it('formats dates from Date, ISO and epoch', () => {
    const iso = '2026-07-03T00:00:00.000Z';
    expect(f.date(iso, { dateStyle: 'short', timeZone: 'UTC' })).toMatch(/03\/07\/2026|3\/7\/2026/);
    expect(f.date(new Date(iso), { dateStyle: 'medium', timeZone: 'UTC' })).toContain('2026');
  });
});

describe('plural rules', () => {
  it('selects CLDR categories for English', () => {
    const f = createFormatters('en', 'USD');
    const forms = { one: '1 item', other: '# items' };
    expect(f.plural(1, forms)).toBe('1 item');
    expect(f.plural(2, forms)).toBe('# items');
    expect(f.plural(0, forms)).toBe('# items');
  });

  it('handles languages with more plural forms (Arabic)', () => {
    const f = createFormatters('ar', 'EGP');
    const forms = { zero: 'zero', one: 'one', two: 'two', few: 'few', many: 'many', other: 'other' };
    // Arabic has distinct zero/one/two/few/many categories.
    expect(f.plural(0, forms)).toBe('zero');
    expect(f.plural(1, forms)).toBe('one');
    expect(f.plural(2, forms)).toBe('two');
  });
});

describe('list + direction', () => {
  it('formats lists per locale', () => {
    const f = createFormatters('en-GB', 'GBP');
    expect(f.list(['a', 'b', 'c'])).toBe('a, b and c');
  });

  it('detects RTL locales', () => {
    expect(isRtlLocale('ar-EG')).toBe(true);
    expect(isRtlLocale('he-IL')).toBe(true);
    expect(isRtlLocale('en-GB')).toBe(false);
    expect(directionForLocale('fa')).toBe('rtl');
    expect(directionForLocale('fr')).toBe('ltr');
  });
});
