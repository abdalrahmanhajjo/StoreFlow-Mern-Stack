import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession, type Role } from '@/store/session';
import { Loader } from '@/components/feedback/Loader';

// SF-103: require a valid session (waits for the initial silent refresh first)
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useSession((s) => s.user);
  const status = useSession((s) => s.status);
  const location = useLocation();

  if (status === 'loading') return <Loader />;
  if (!user) {
    const returnTo = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }
  return <>{children}</>;
}

// SF-103: require one of the allowed roles
export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = useSession((s) => s.user);
  const status = useSession((s) => s.status);
  if (status === 'loading') return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}
