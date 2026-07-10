import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from './authService';
import { useSession } from '@/store/session';
import { landingRouteForRole } from '@/app/navConfig';
import { toast } from '@/components/ui';
import type { LoginInput, RegisterInput } from './schemas';

interface ApiErr { code: string; message: string; fields?: Record<string, string> }

export function useLogin(returnTo?: string) {
  const setSession = useSession((s) => s.setSession);
  const navigate = useNavigate();
  return useMutation<Awaited<ReturnType<typeof authService.login>>, ApiErr, LoginInput>({
    mutationFn: (input) => authService.login(input),
    onSuccess: ({ user, accessToken }) => {
      setSession(user, accessToken);
      navigate(returnTo || landingRouteForRole(user.role), { replace: true });
    },
    onError: (err) => {
      if (err.code !== 'PENDING_APPROVAL') {
        toast.error(err.message || 'Sign in failed');
      }
    },
  });
}

/** Creates the store + owner and triggers the verification email. Navigation
 * happens after the email code is confirmed (see useVerifyEmail). */
export function useRegister() {
  return useMutation<void, ApiErr, RegisterInput>({
    mutationFn: (input) => authService.register(input),
    onSuccess: () => {
      toast.success('Verification code sent', 'Check your email');
    },
    onError: (err) => {
      toast.error(err.message || 'Registration failed. Please try again.');
    },
  });
}

/** Confirms the 6-digit email code, then hands off to the approval screen. */
export function useVerifyEmail() {
  const navigate = useNavigate();
  return useMutation<void, ApiErr, { email: string; code: string }>({
    mutationFn: ({ email, code }) => authService.verifyEmailCode(email, code),
    onSuccess: (_data, { email }) => {
      toast.success('Email verified', 'Application received');
      navigate(`/pending-approval?email=${encodeURIComponent(email)}`, { replace: true });
    },
  });
}
