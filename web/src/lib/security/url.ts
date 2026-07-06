// Frontend URL-safety guards. These are defence-in-depth for a client that
// renders user-supplied URLs (e.g. product image URLs, links). They are NOT a
// substitute for server-side validation and output encoding.

const SAFE_PROTOCOLS = new Set(['http:', 'https:']);

// Control chars (\x00-\x1F, \x7F) are used to smuggle `java\nscript:` past naive checks.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;

/**
 * Returns a sanitised, renderable URL or `''` if the input is unsafe/unparsable.
 *
 * Blocks `javascript:`, `data:`, `vbscript:`, `file:` and other non-HTTP(S)
 * schemes that can execute script or exfiltrate data when reflected into an
 * `href`/`src`. Relative URLs are resolved against the current origin.
 */
export function safeUrl(input: string | null | undefined, base: string = window.location.origin): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed === '' || CONTROL_CHARS.test(trimmed)) return '';
  try {
    const url = new URL(trimmed, base);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

/** Same as safeUrl but only accepts absolute http(s) image URLs (no relative). */
export function safeImageUrl(input: string | null | undefined): string {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed === '' || CONTROL_CHARS.test(trimmed)) return '';
  try {
    const url = new URL(trimmed);
    return SAFE_PROTOCOLS.has(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}
