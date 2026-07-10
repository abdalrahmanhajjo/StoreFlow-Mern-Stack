import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { telemetry } from '@/lib/observability/telemetry';

/** Emit a route_change telemetry event whenever the pathname changes. */
export function useRouteTelemetry(): void {
  const location = useLocation();
  const prev = useRef<string | undefined>(undefined);

  useEffect(() => {
    const to = location.pathname;
    telemetry.trackRouteChange(to, prev.current);
    prev.current = to;
  }, [location.pathname]);
}
