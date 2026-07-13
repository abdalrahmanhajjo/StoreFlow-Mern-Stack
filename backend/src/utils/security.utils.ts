/**
 * Security utilities: sanitization, regex escaping, field allowlists.
 * Every function here is unit-testable and side-effect–free.
 */

/**
 * Escapes user input for use inside a MongoDB $regex query.
 * Prevents ReDoS and query-bypass attacks.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Creates a safe $regex query object from user input.
 * Automatically escapes special regex characters.
 */
export function safeRegex(field: string, value: string, opts?: 'i' | ''): Record<string, unknown> {
  return { [field]: { $regex: escapeRegex(value), $options: opts ?? 'i' } };
}

/**
 * Strips MongoDB operators ($ne, $gt, $regex, $where, etc.) from an object
 * and removes prototype-pollution keys. Returns a new object.
 */
export function stripOperators<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = {} as T;
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key as keyof T] = stripOperators(value as Record<string, unknown>) as T[keyof T];
    } else {
      cleaned[key as keyof T] = value as T[keyof T];
    }
  }
  return cleaned;
}

/**
 * Returns only the allowed fields from an object. Unknown keys are dropped.
 */
export function pickAllowed<T extends Record<string, unknown>>(
  source: Record<string, unknown>,
  allowed: readonly (keyof T)[]
): T {
  const result = {} as T;
  for (const key of allowed) {
    if (key in source) {
      (result as Record<string, unknown>)[key as string] = source[key as string];
    }
  }
  return result;
}

/**
 * Validates that a redirect URL is safe (same origin, internal path only).
 * Returns the sanitized path or null. Server-safe (no browser APIs).
 */
export function sanitizeRedirectPath(url: string | null | undefined): string | null {
  if (!url) return null;
  // Block javascript: vbscript: data: etc.
  if (/^\s*(?:javascript|vbscript|data|file):/i.test(url)) return null;
  // Block protocol-relative URLs (//evil.com)
  if (/^\/\//.test(url)) return null;
  // Block path traversal
  if (url.includes('..') || url.includes('\\')) return null;
  // If it has a scheme, it must be http/https to the same origin or a relative path
  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      // Reject external origins — only same-origin redirects are allowed server-side
      return null;
    } catch {
      return null;
    }
  }
  // Must start with / (internal path)
  if (!url.startsWith('/')) return null;
  return url;
}

/**
 * Enum of allowed login redirect reason codes.
 */
export const LOGIN_REASON_MESSAGES: Record<string, string> = {
  'session-ended': 'Your session has expired. Please sign in again.',
  'authentication-required': 'Please sign in to continue.',
  'signed-out': 'You have been signed out successfully.',
} as const;

export const ALLOWED_LOGIN_REASONS = new Set(Object.keys(LOGIN_REASON_MESSAGES));

export function safeLoginReason(reason: string | null): string | null {
  if (!reason || !ALLOWED_LOGIN_REASONS.has(reason)) return null;
  return reason;
}
