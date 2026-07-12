import type { ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';
import { Toaster, ConfirmDialogHost } from '@/components/ui';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { OfflineBanner } from '@/components/feedback/OfflineBanner';
import { SessionBootstrap } from '@/features/auth/SessionBootstrap';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionBootstrap />
      <OfflineBanner />
      <ErrorBoundary>{children}</ErrorBoundary>
      <Toaster />
      <ConfirmDialogHost />
    </QueryClientProvider>
  );
}
