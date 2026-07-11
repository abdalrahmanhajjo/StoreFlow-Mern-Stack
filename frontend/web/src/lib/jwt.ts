// Decodes a JWT's payload WITHOUT verifying its signature — verification is
// the backend's job. We only need to read `exp` so we know when to
// proactively refresh the access token.
export function getExpiryMs(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof json.exp !== 'number') return null;
    return json.exp * 1000; // exp is in seconds, we work in ms
  } catch {
    return null;
  }
}