import { telemetry, ConsoleSink, BeaconSink } from './telemetry';
import { observeWebVitals } from './webVitals';
import type { Telemetry } from './telemetry';

/**
 * Bridge uncaught errors and unhandled promise rejections into telemetry. Note
 * this observes for reporting only — it does not swallow errors (React error
 * boundaries and the default handlers still run).
 */
export function installErrorHandlers(t: Telemetry = telemetry): () => void {
  if (typeof window === 'undefined') return () => {};

  const onError = (e: ErrorEvent) => {
    t.trackJsError(e.message || 'Uncaught error', e.filename, e.error instanceof Error ? e.error.stack : undefined);
  };
  const onRejection = (e: PromiseRejectionEvent) => {
    const reason = (e as PromiseRejectionEvent).reason;
    const message = reason instanceof Error ? reason.message : String(reason ?? 'Unhandled rejection');
    t.trackJsError(message, 'unhandledrejection', reason instanceof Error ? reason.stack : undefined);
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

export interface ObservabilityOptions {
  /** Collector endpoint; when set, events are shipped via BeaconSink. */
  beaconUrl?: string;
  /** Also log events to the console (default: dev only). */
  console?: boolean;
}

/**
 * One-call bootstrap: wires sinks, error handlers and Web Vitals. Returns a
 * teardown. Call once from the app entry point.
 */
export function installObservability(options: ObservabilityOptions = {}): () => void {
  const teardowns: Array<() => void> = [];

  if (options.console ?? import.meta.env.DEV) teardowns.push(telemetry.addSink(new ConsoleSink()));
  if (options.beaconUrl) teardowns.push(telemetry.addSink(new BeaconSink(options.beaconUrl)));

  teardowns.push(installErrorHandlers(telemetry));
  teardowns.push(observeWebVitals((v) => telemetry.trackWebVital(v.name, v.value, v.rating)));

  return () => teardowns.forEach((fn) => fn());
}
