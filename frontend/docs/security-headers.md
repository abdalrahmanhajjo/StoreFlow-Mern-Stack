# StoreFlow — Frontend Security Headers & CSP

The SPA is served as static assets. The **authoritative** security controls below
are HTTP **response headers** set by whatever serves `web/dist` (CDN, nginx,
Netlify/Cloudflare Pages, or the API gateway). A `<meta>` CSP is deliberately
**not** used: it cannot express `frame-ancestors`, cannot be report-only, and
breaks the Vite dev server (HMR uses inline bootstrap + a WebSocket).

A ready-to-deploy `web/public/_headers` file is included for Netlify/Cloudflare
Pages. Equivalents for nginx are below. **Replace `API_ORIGIN` with your real
API origin** (currently `UNSPECIFIED` — see the audit report).

## Content-Security-Policy

```
default-src 'self';
base-uri 'self';
object-src 'none';
frame-ancestors 'none';
img-src 'self' data: https:;
font-src 'self' https://fonts.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
script-src 'self';
connect-src 'self' https://API_ORIGIN;
form-action 'self';
upgrade-insecure-requests
```

Notes / follow-ups:
- `style-src 'unsafe-inline'` is required today because the app styles elements
  with inline `style={...}` throughout. **Migration:** move styling to CSS
  modules / a stylesheet, then drop `'unsafe-inline'` and add a nonce/hash. Until
  then, `script-src 'self'` (no `'unsafe-inline'`) still blocks the primary XSS
  execution vector — inline styles alone cannot run script.
- `img-src` allows `https:` broadly so user-supplied product image URLs render.
  These URLs are additionally validated client-side by
  `src/lib/security/url.ts` (`safeImageUrl`), which strips `javascript:`,
  `data:`, and control-character payloads.
- Ship as `Content-Security-Policy-Report-Only` first with a `report-uri`/
  `report-to` endpoint, confirm zero violations on real traffic, then enforce.

## Other required headers

| Header | Value | Why |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | Force HTTPS |
| `X-Content-Type-Options` | `nosniff` | Stop MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Don't leak `returnTo`/paths |
| `X-Frame-Options` | `DENY` | Clickjacking (legacy backstop for `frame-ancestors`) |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` | Least privilege |
| `Cross-Origin-Opener-Policy` | `same-origin` | Cross-origin isolation |

## nginx example

```nginx
add_header Content-Security-Policy "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self' https://API_ORIGIN; form-action 'self'; upgrade-insecure-requests" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header X-Frame-Options "DENY" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()" always;
add_header Cross-Origin-Opener-Policy "same-origin" always;
```

## Third-party assets & SRI

The only third-party assets are Google Fonts (`fonts.googleapis.com` CSS +
`fonts.gstatic.com` files). Subresource Integrity (SRI) is **not applicable** to
the Google Fonts stylesheet because Google serves versioned, rotating CSS whose
hash changes — an SRI hash would break on rotation. Two safer options:

1. **Self-host the fonts** (recommended): download the WOFF2 files into
   `web/public/fonts`, serve from origin, and tighten CSP to `font-src 'self'`
   and `style-src 'self'` (removing the Google hosts). This also removes a
   third-party dependency and improves privacy/performance.
2. If any *script* CDN is ever added, it **must** carry `integrity` + `crossorigin`
   attributes (SRI). No third-party scripts are loaded today.

## Backend dependencies (auth is cookie-refresh based)

The refresh token lives in an **HttpOnly** cookie (JS never reads it). The
backend must set it with:

- `HttpOnly; Secure; SameSite=Lax` (or `Strict`) on `/auth/*` responses.
- Because cookies are sent automatically, **CSRF protection is required** on
  every state-changing request. Prefer the double-submit cookie or a
  per-session synchroniser token; with `SameSite=Lax` and a custom
  `Authorization: Bearer` header on API calls (already sent by `src/lib/axios.ts`),
  cross-site form posts cannot forge the header, but any cookie-authenticated
  endpoint still needs an explicit anti-CSRF check.
- `/auth/refresh` must rotate the refresh token and detect reuse.
```
