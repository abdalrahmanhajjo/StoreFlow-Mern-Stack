import type { WebVitalName } from './types';

export interface VitalReport {
  name: WebVitalName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

// Core Web Vitals thresholds (good / needs-improvement boundaries).
const THRESHOLDS: Record<WebVitalName, [number, number]> = {
  LCP: [2500, 4000],
  INP: [200, 500],
  CLS: [0.1, 0.25],
  FCP: [1800, 3000],
  TTFB: [800, 1800],
};

function rate(name: WebVitalName, value: number): VitalReport['rating'] {
  const [good, poor] = THRESHOLDS[name];
  if (value <= good) return 'good';
  if (value <= poor) return 'needs-improvement';
  return 'poor';
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

/**
 * Observe Core Web Vitals with the native PerformanceObserver — no library, no
 * external script. Reports LCP, CLS, INP (approx), FCP and TTFB via `onReport`.
 * Returns a stop function; safely no-ops where the APIs are unavailable (SSR/jsdom).
 */
export function observeWebVitals(onReport: (report: VitalReport) => void): () => void {
  if (typeof PerformanceObserver === 'undefined') return () => {};

  const observers: PerformanceObserver[] = [];
  const report = (name: WebVitalName, value: number) => onReport({ name, value, rating: rate(name, value) });

  const observe = (type: string, cb: (entries: PerformanceEntryList) => void) => {
    try {
      const po = new PerformanceObserver((list) => cb(list.getEntries()));
      po.observe({ type, buffered: true } as PerformanceObserverInit);
      observers.push(po);
    } catch {
      /* entry type unsupported in this browser */
    }
  };

  // LCP — largest so far; report the latest candidate.
  observe('largest-contentful-paint', (entries) => {
    const last = entries[entries.length - 1];
    if (last) report('LCP', last.startTime);
  });

  // CLS — sum layout shifts without recent input.
  let cls = 0;
  observe('layout-shift', (entries) => {
    for (const e of entries as LayoutShiftEntry[]) {
      if (!e.hadRecentInput) cls += e.value;
    }
    report('CLS', cls);
  });

  // INP (approx) — worst interaction latency observed.
  let inp = 0;
  observe('event', (entries) => {
    for (const e of entries) {
      if (e.duration > inp) {
        inp = e.duration;
        report('INP', inp);
      }
    }
  });

  // FCP — first contentful paint.
  observe('paint', (entries) => {
    const fcp = entries.find((e) => e.name === 'first-contentful-paint');
    if (fcp) report('FCP', fcp.startTime);
  });

  // TTFB — from the navigation entry.
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav) report('TTFB', nav.responseStart);
  } catch {
    /* navigation timing unavailable */
  }

  return () => observers.forEach((o) => o.disconnect());
}
