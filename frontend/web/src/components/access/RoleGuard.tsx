import type { ReactNode } from 'react';
import type { StoreRole } from '@/lib/contracts/types';
import { useStoreRole } from '@/config/StoreProfileContext';

export interface RoleGuardProps {
  /** Roles allowed to see the guarded UI. */
  allow: StoreRole[];
  /** Override the current role (defaults to the StoreProfile context role). */
  role?: StoreRole;
  /** Shown when the role is not allowed. Defaults to nothing (hidden). */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders privileged UI for permitted roles.
 *
 * SECURITY: this is a UX affordance only. Hiding a control does NOT protect the
 * underlying action — the server must independently authorise every request.
 * Never gate a sensitive mutation on RoleGuard alone; treat it as "don't show
 * what the user can't use", not "make the user safe".
 */
export function RoleGuard({ allow, role, fallback = null, children }: RoleGuardProps) {
  const contextRole = useStoreRoleSafe();
  const effective = role ?? contextRole;
  if (!effective || !allow.includes(effective)) return <>{fallback}</>;
  return <>{children}</>;
}

// Allow standalone use (explicit `role` prop) without a provider in tests/storybook.
function useStoreRoleSafe(): StoreRole | null {
  try {
    return useStoreRole();
  } catch {
    return null;
  }
}
