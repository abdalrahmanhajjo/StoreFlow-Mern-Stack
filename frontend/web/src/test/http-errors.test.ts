import { describe, it, expect } from 'vitest';
import { messageForStatus, parseRetryAfter } from '@/lib/http/errors';

describe('messageForStatus', () => {
  it('gives user-safe messages per status without leaking internals', () => {
    expect(messageForStatus(401, 'x')).toMatch(/session has expired/i);
    expect(messageForStatus(403, 'x')).toMatch(/permission/i);
    expect(messageForStatus(429, 'x')).toMatch(/too many requests/i);
    expect(messageForStatus(500, 'x')).toMatch(/our end/i);
    expect(messageForStatus(503, 'x')).toMatch(/our end/i);
  });
  it('falls back for unknown statuses', () => {
    expect(messageForStatus(418, 'fallback')).toBe('fallback');
    expect(messageForStatus(undefined, 'fallback')).toBe('fallback');
  });
});

describe('parseRetryAfter', () => {
  it('parses delta-seconds', () => {
    expect(parseRetryAfter('30')).toBe(30);
    expect(parseRetryAfter('0')).toBe(0);
  });
  it('parses an HTTP-date into seconds from now', () => {
    const future = new Date(Date.now() + 60_000).toUTCString();
    const secs = parseRetryAfter(future);
    expect(secs).toBeGreaterThan(50);
    expect(secs).toBeLessThanOrEqual(60);
  });
  it('returns undefined for missing / invalid values', () => {
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter('')).toBeUndefined();
    expect(parseRetryAfter('not-a-date')).toBeUndefined();
  });
});
