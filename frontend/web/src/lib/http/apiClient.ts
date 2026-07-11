import { api } from '@/lib/axios';
import { createApiClient, type HttpLike } from './client';
import { telemetry } from '@/lib/observability/telemetry';

// Adapt the shared axios instance to the transport-agnostic HttpLike contract.
// axios responses carry { data, headers, … } which structurally satisfy HttpLike.
const adapter: HttpLike = {
  get: (url, config) => api.get(url, config),
  request: (config) => api.request(config),
};

/** App-wide typed client: schema-validated reads, correlation-stamped writes,
 *  with every failure reported to telemetry. */
export const apiClient = createApiClient(adapter, {
  onError: (problem, endpoint) => telemetry.trackApiFailure(problem, endpoint),
});
