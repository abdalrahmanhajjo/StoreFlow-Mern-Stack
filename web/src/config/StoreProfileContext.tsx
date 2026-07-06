import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { StoreProfile, StoreRole } from '@/lib/contracts/types';
import { storeProfileSchema } from '@/lib/contracts/schemas';
import { resolveStoreConfig, type ResolvedStoreConfig } from '@/config/templates/registry';
import { createFormatters, type Formatters } from '@/lib/i18n/format';

interface StoreContextValue {
  config: ResolvedStoreConfig;
  formatters: Formatters;
  /** Store-facing UX role of the current user (presentation only). */
  role: StoreRole;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export interface StoreProfileProviderProps {
  profile: StoreProfile;
  role: StoreRole;
  children: ReactNode;
}

/**
 * Resolves a StoreProfile into template config + locale formatters and shares
 * them via context. Sets `dir`/`lang` and the theme accent on a wrapper so
 * layouts below are RTL-safe and correctly localised.
 *
 * The profile is re-validated with the schema here because it may have arrived
 * from the network; an invalid profile is logged (in dev) and still rendered
 * best-effort rather than crashing the shell.
 */
export function StoreProfileProvider({ profile, role, children }: StoreProfileProviderProps) {
  const value = useMemo<StoreContextValue>(() => {
    const parsed = storeProfileSchema.safeParse(profile);
    if (!parsed.success && import.meta.env.DEV) {
      console.warn('[StoreProfile] invalid profile, rendering best-effort', parsed.error.flatten());
    }
    const config = resolveStoreConfig(profile);
    const formatters = createFormatters(profile.locale, profile.currency);
    return { config, formatters, role };
  }, [profile, role]);

  const accentStyle = value.config.effective.accent
    ? ({ ['--accent']: value.config.effective.accent } as React.CSSProperties)
    : undefined;

  return (
    <StoreContext.Provider value={value}>
      <div dir={value.formatters.direction} lang={value.formatters.locale} style={accentStyle}>
        {children}
      </div>
    </StoreContext.Provider>
  );
}

function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore* hooks must be used within <StoreProfileProvider>');
  return ctx;
}

export const useStoreConfig = (): ResolvedStoreConfig => useStore().config;
export const useFormatters = (): Formatters => useStore().formatters;
export const useStoreRole = (): StoreRole => useStore().role;
