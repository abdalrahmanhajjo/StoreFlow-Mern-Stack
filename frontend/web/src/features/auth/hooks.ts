import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authService } from './authService';
import { useSession } from '@/store/session';
import { landingRouteForRole } from '@/app/navConfig';
import { toast } from '@/components/ui';
import type { LoginInput, RegisterInput } from './schemas';

interface ApiErr { code: string; message: string; fields?: Record<string, string> }

/** Email awaiting OTP verification while the user is away at checkout —
 * lets the register page resume at the Verify step after payment. */
export const VERIFY_EMAIL_STORAGE_KEY = 'sf_pending_verify_email';

export function useLogin(returnTo?: string) {
  const setSession = useSession((s) => s.setSession);
  const navigate = useNavigate();
  return useMutation<Awaited<ReturnType<typeof authService.login>>, ApiErr, LoginInput>({
    mutationFn: (input) => authService.login(input),
    onSuccess: ({ user, accessToken }) => {
      setSession(user, accessToken);
      const destination = returnTo && /^\/(?!\/)/.test(returnTo) ? returnTo : landingRouteForRole(user.role);
      navigate(destination, { replace: true });
    },
    onError: (err, input) => {
      if (err.code === 'EMAIL_UNVERIFIED') {
        toast.error(err.message || 'Please verify your email before logging in.');
        navigate(`/resend-verification?email=${encodeURIComponent(input.email)}`);
        return;
      }
      if (err.code !== 'PENDING_APPROVAL') {
        toast.error(err.message || 'Sign in failed');
      }
    },
  });
}

/** Creates the store + owner and triggers the verification email. Navigation
 * happens after the email code is confirmed (see useVerifyEmail).
 * For paid plans, redirects to Stripe Checkout after registration. */
export function useRegister() {
  return useMutation<Awaited<ReturnType<typeof authService.register>>, ApiErr, RegisterInput>({
    mutationFn: (input) => authService.register(input),
    onSuccess: (result, input) => {
      if (result?.checkout?.url) {
        // The verification code was already emailed; remember who to verify so
        // the checkout-complete page can bring the user back to the OTP step.
        sessionStorage.setItem(VERIFY_EMAIL_STORAGE_KEY, input.email);
        window.location.href = result.checkout.url;
      } else {
        toast.success('Verification code sent', 'Check your email');
      }
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
      sessionStorage.removeItem(VERIFY_EMAIL_STORAGE_KEY);
      toast.success('Email verified', 'Application received');
      navigate(`/pending-approval?email=${encodeURIComponent(email)}`, { replace: true });
    },
  });
}
