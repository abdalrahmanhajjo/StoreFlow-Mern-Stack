// Telemetry event model. Events are plain, serialisable objects fanned out to
// pluggable sinks, so the app never depends on a specific analytics vendor and
// stays CSP-safe (no third-party script injection — a sink decides transport).

export type WebVitalName = 'LCP' | 'INP' | 'CLS' | 'FCP' | 'TTFB';

interface BaseEvent {
  /** ISO 8601 timestamp; stamped by Telemetry.emit if absent. */
  at: string;
  /** Correlation id linking client events to server logs where available. */
  correlationId?: string;
}

export type TelemetryEvent =
  | (BaseEvent & { type: 'route_change'; from?: string; to: string })
  | (BaseEvent & { type: 'api_failure'; status: number; problemType: string; endpoint?: string })
  | (BaseEvent & { type: 'queue_sync_failure'; failed: number; lastError?: string })
  | (BaseEvent & { type: 'user_action'; action: string; meta?: Record<string, unknown> })
  | (BaseEvent & { type: 'web_vital'; name: WebVitalName; value: number; rating?: 'good' | 'needs-improvement' | 'poor' })
  | (BaseEvent & { type: 'js_error'; message: string; source?: string; stack?: string });

export interface TelemetrySink {
  /** Deliver an event. Must not throw — Telemetry isolates sink failures. */
  send(event: TelemetryEvent): void;
}
