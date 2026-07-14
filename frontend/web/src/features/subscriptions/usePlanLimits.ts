import { useEffect, useState, useCallback } from 'react';
import { errorMessage } from '@/lib/http/errors';
import { subscriptionService, PlanLimitsResponse } from './subscriptionService';

interface UsePlanLimitsResult {
  data: PlanLimitsResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePlanLimits(): UsePlanLimitsResult {
  const [data, setData] = useState<PlanLimitsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await subscriptionService.getLimits();
      setData(result);
    } catch (e) {
      setError(errorMessage(e, 'Failed to load plan limits'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
