// Client-side JWT *decoding* only (never verification — that is the server's job).
// Used to read the access token's `exp` so we can refresh proactively before it lapses.
export interface JwtClaims {
  sub?: string;
  role?: string;
  storeId?: string | null;
  iat?: number;
  exp?: number; // seconds since epoch
  [key: string]: unknown;
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(input.length / 4) * 4, '=');
  return atob(padded);
}

export function decodeJwt(token: string): JwtClaims | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    return JSON.parse(base64UrlDecode(parts[1])) as JwtClaims;
  } catch {
    return null;
  }
}

/** Access-token expiry in ms since epoch, or null if it can't be determined. */
export function getExpiryMs(token: string): number | null {
  const claims = decodeJwt(token);
  return typeof claims?.exp === 'number' ? claims.exp * 1000 : null;
}
