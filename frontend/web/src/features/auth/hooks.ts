import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from './authService';
import { useSession } from '@/store/session';
import { landingRouteForRole } from '@/app/navConfig';
import { toast } from '@/components/ui';
import type { ApiErr } from '@/lib/api';
import type { LoginInput, RegisterInput } from './schemas';

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
      // 403 here means "email not verified" (auth.controller.ts login()) —
      // LoginPage renders its own message + resend action for that case,
      // so don't also fire a generic error toast.
      if (err.status !== 403) toast.error(err.message || 'Sign in failed');
    },
  });
}

// Step 0-2 of RegisterPage call this when the Account step is completed —
// creates the store + owner and triggers the first verification email.
// No auto-navigation: RegisterPage advances to its own "Verify" step.
export function useRegister() {
  return useMutation<Awaited<ReturnType<typeof authService.register>>, ApiErr, RegisterInput>({
    mutationFn: (input) => authService.register(input),
  });
}

// Step 3 of RegisterPage (and the "resend" action on LoginPage) call these directly.
export function useVerifyEmailCode() {
  return useMutation<{ message: string }, ApiErr, { email: string; code: string }>({
    mutationFn: ({ email, code }) => authService.verifyEmailCode(email, code),
  });
}

export function useResendVerificationCode() {
  return useMutation<{ message: string }, ApiErr, string>({
    mutationFn: (email) => authService.resendVerificationCode(email),
  });
}

export function useLogout() {
  const clear = useSession((s) => s.clear);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => authService.logout(),
    // Clear local session and redirect even if the network call fails —
    // the user clicked logout, so the UI should reflect that regardless.
    onSettled: () => {
      clear();
      navigate('/login', { replace: true });
    },
  });
}