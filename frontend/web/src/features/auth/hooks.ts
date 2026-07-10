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

export function useRegister() {
  const navigate = useNavigate();
  return useMutation<void, ApiErr, RegisterInput>({
    mutationFn: (input) => authService.register(input),
    onSuccess: (_data, input) => {
      toast.success('Registration submitted', 'Application received');
      navigate(`/pending-approval?email=${encodeURIComponent(input.email)}`, { replace: true });
    },
    onError: () => {
      toast.error('Registration failed. Please try again.');
    },
  });
}
