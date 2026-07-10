import type { TelemetryEvent, TelemetrySink, WebVitalName } from './types';
import type { ApiProblem } from '@/lib/contracts/types';

// Distribute over the union so each event variant keeps its own fields with `at`
// made optional (a plain Omit<Union,'at'> would collapse to only shared keys).
type EventInput = TelemetryEvent extends infer E
  ? E extends TelemetryEvent
    ? Omit<E, 'at'> & { at?: string }
    : never
  : never;

// Central telemetry hub. Fan-out is isolated: one misbehaving sink can never
// break another or the app. Convenience methods build well-typed events.
export class Telemetry {
  private sinks: TelemetrySink[] = [];

  addSink(sink: TelemetrySink): () => void {
    this.sinks.push(sink);
    return () => {
      this.sinks = this.sinks.filter((s) => s !== sink);
    };
  }

  emit(event: EventInput): void {
    const full = { at: new Date().toISOString(), ...event } as TelemetryEvent;
    for (const sink of this.sinks) {
      try {
        sink.send(full);
      } catch {
        /* never let a sink failure propagate */
      }
    }
  }

  trackRouteChange(to: string, from?: string): void {
    this.emit({ type: 'route_change', to, from });
  }

  trackApiFailure(problem: ApiProblem, endpoint?: string): void {
    this.emit({
      type: 'api_failure',
      status: problem.status,
      problemType: problem.type,
      endpoint,
      correlationId: problem.correlationId,
    });
  }

  trackQueueSyncFailure(failed: number, lastError?: string): void {
    this.emit({ type: 'queue_sync_failure', failed, lastError });
  }

  trackUserAction(action: string, meta?: Record<string, unknown>): void {
    this.emit({ type: 'user_action', action, meta });
  }

  trackWebVital(name: WebVitalName, value: number, rating?: 'good' | 'needs-improvement' | 'poor'): void {
    this.emit({ type: 'web_vital', name, value, rating });
  }

  trackJsError(message: string, source?: string, stack?: string): void {
    this.emit({ type: 'js_error', message, source, stack });
  }
}

// --- sinks -------------------------------------------------------------------

/** Collects events in memory — tests and debugging. */
export class MemorySink implements TelemetrySink {
  events: TelemetryEvent[] = [];
  send(event: TelemetryEvent): void {
    this.events.push(event);
  }
}

/** Logs to the console — development only. */
export class ConsoleSink implements TelemetrySink {
  send(event: TelemetryEvent): void {
    console.debug('[telemetry]', event.type, event);
  }
}

/**
 * Ships events to a collector via `navigator.sendBeacon` (survives page unload,
 * respects CSP `connect-src`). Falls back to a keepalive fetch.
 */
export class BeaconSink implements TelemetrySink {
  constructor(private url: string) {}
  send(event: TelemetryEvent): void {
    const body = JSON.stringify(event);
    try {
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        navigator.sendBeacon(this.url, new Blob([body], { type: 'application/json' }));
        return;
      }
      if (typeof fetch !== 'undefined') {
        void fetch(this.url, { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } });
      }
    } catch {
      /* telemetry is best-effort */
    }
  }
}

/** App-wide singleton. Wire sinks once at bootstrap. */
export const telemetry = new Telemetry();
