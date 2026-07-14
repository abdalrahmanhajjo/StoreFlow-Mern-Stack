import type { ReactNode } from 'react';
import { usePlanLimits } from '@/features/subscriptions/usePlanLimits';
import type { PlanFeatures } from '@/features/subscriptions/subscriptionService';

export type FeatureKey = keyof PlanFeatures;

interface Props {
  feature: FeatureKey;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PlanFeatureGate({ feature, fallback = null, children }: Props) {
  const { data, loading } = usePlanLimits();

  if (loading) return null;

  const enabled = data?.features?.[feature] === true;
  if (!enabled) return <>{fallback}</>;

  return <>{children}</>;
}
