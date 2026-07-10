# StoreFlow — Frontend

Multi-tenant retail SaaS (POS · inventory · loyalty · platform admin). **Frontend only** — the backend/API is delivered by a separate teammate and will be integrated later.

- `web/` — React + Vite + TypeScript (React Query, Zustand, React Router, React Hook Form + Zod).

## Run
```
cd web && npm install
npm run dev        # http://localhost:5173
npm test           # unit/integration (Vitest)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run build      # production build
npm run test:e2e   # Playwright + axe (needs: npx playwright install --with-deps)
npm run audit:ci   # fail on high/critical vulns in production deps
```

## Security & accessibility
- Access token is held **in memory only** (never web storage); refresh via an
  HttpOnly cookie. See `src/store/session.ts` / `src/features/auth/`.
- Shared validation lives in `src/lib/validation/`; URL/scheme guards in
  `src/lib/security/`; normalised HTTP errors in `src/lib/http/`.
- Security headers / CSP are **response-header** controls — see
  `web/public/_headers` and [`docs/security-headers.md`](docs/security-headers.md).
- Full frontend audit + prioritised backlog:
  [`docs/frontend-audit-storeflow.md`](docs/frontend-audit-storeflow.md)
  (CSV: `docs/frontend-audit-storeflow.csv`).

## Demo logins (mock auth)
The email encodes **role** (prefix) and **business type** (domain):
`<role>@<businessType>.com`, e.g. `owner@pharmacy.com`.

**Role** (from the prefix): `admin@` → Platform Admin · `owner@` → Store Owner ·
`manager@` → Manager · `cashier@` → Cashier.

**Business type** (from the domain label): one login per store template —

| Business type | Login (owner) | Locale / currency | Notes |
|---|---|---|---|
| Supermarket | `owner@supermarket.com` | en-GB · GBP | weighed goods, age-restricted |
| Pharmacy | `owner@pharmacy.com` | ar-EG · EGP · **RTL** | regulated, online-only dispensing |
| Restaurant | `owner@restaurant.com` | fr-FR · EUR | table service, kitchen tickets |
| Boutique | `owner@boutique.com` | it-IT · EUR | clienteling |
| Convenience | `owner@convenience.com` | en-US · USD | quick sell, age checks |
| Electronics | `owner@electronics.com` | de-DE · EUR | serials, warranties |

Swap the prefix for other roles, e.g. `cashier@restaurant.com`, `manager@pharmacy.com`.
Unrecognised domains (e.g. the legacy `owner@x.com`) fall back to **supermarket**.
`admin@…` is a cross-tenant Platform Admin (no single store).

Any password works; password `fail` shows the error state.

## Backend integration (later)
All data lives in client-side stores (`src/features/*/…Store.ts`) and a mock `authService`.
Each is written so it can be swapped for the teammate's REST API via `src/lib/axios.ts`
(`VITE_API_BASE_URL`) with React Query hooks — no UI changes required.

## Progress (per Jira)
- **Sprint 0** — foundation + design system
- **Sprint 1** — auth (login/register/reset), RBAC guards, app shell + role nav
- **Sprint 2** — POS + loyalty (search/scan, cart, redeem, checkout, receipt)
- **Sprint 3** — customers + catalog (products/categories CRUD, profiles)
- **Sprint 4** — inventory, sales list, employees (owner/manager rules)
- **Sprint 5** — platform admin: overview, tenants, approvals, users
- **Sprint 6** — platform admin: plans, security, audit, system settings
