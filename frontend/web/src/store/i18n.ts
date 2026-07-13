import { create } from 'zustand';
import { createFormatters, type Formatters } from '@/lib/i18n/format';

interface I18nState {
  locale: string;
  currency: string;
  timezone: string;
  formatters: Formatters;
  setLocale: (locale: string) => void;
  setCurrency: (currency: string) => void;
  setTimezone: (timezone: string) => void;
  configure: (locale: string, currency: string, timezone: string) => void;
}

// The app is English-only (all UI text is authored in English, no translation
// layer), so the whole product formats numbers/dates in English and lays out
// left-to-right regardless of a store's business-type locale. Only currency is
// per-store. Import UI_LOCALE wherever a store profile would otherwise supply
// its own locale.
export const UI_LOCALE = 'en-US';
const DEFAULT_LOCALE = UI_LOCALE;
const DEFAULT_CURRENCY = 'USD';
const DEFAULT_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const useI18n = create<I18nState>((set) => ({
  locale: DEFAULT_LOCALE,
  currency: DEFAULT_CURRENCY,
  timezone: DEFAULT_TZ,
  formatters: createFormatters(DEFAULT_LOCALE, DEFAULT_CURRENCY),
  setLocale: (locale) =>
    set((s) => ({ locale, formatters: createFormatters(locale, s.currency) })),
  setCurrency: (currency) =>
    set((s) => ({ currency, formatters: createFormatters(s.locale, currency) })),
  setTimezone: (timezone) => set({ timezone }),
  configure: (locale, currency, timezone) =>
    set({ locale, currency, timezone, formatters: createFormatters(locale, currency) }),
}));
