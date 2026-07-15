# StoreFlow Frontend — The Complete Guide

One file that explains how the whole frontend works: every folder, the data
flow, the patterns, and how to add things without breaking the rules the app
is built on. Read top to bottom once, then use it as a reference.

**Stack**: React 18 + TypeScript + Vite · React Router v6 · Zustand (state) ·
Axios (HTTP) · vitest + React Testing Library (tests) · Playwright (e2e).
No CSS framework — styling is inline styles + a few plain `.css` files using
CSS variables (`var(--ink)`, `var(--paper)`, …) for theming.

---

## 1. The 30-second mental model

```text
main.tsx
  └── App.tsx
        └── app/providers.tsx        ← wraps everything (SessionBootstrap, toasts)
              └── app/router.tsx     ← ALL routes, lazy-loaded pages
                    └── features/*   ← one folder per business area (pages + stores + services)

Data flow (workspace pages):
  login → store/session.ts holds the access token (memory only)
        → lib/api/hydrate.ts fills every feature store from the API
        → pages render from Zustand stores (useProducts(), useCustomers(), …)
        → lib/api/useLiveResource.ts refetches on page mount + window focus
        → mutations call lib/api/resources.ts (apiCreateProduct, …) then update the store
```

Two modes, decided once in `src/features/auth/authService.ts` and
`src/lib/api/resources.ts`:

- **Connected mode** — `VITE_API_BASE_URL` is set (see `.env`): everything
  talks to the real backend, stores start **empty** and are hydrated from
  MongoDB.
- **Mock mode** — no API URL (or `MODE === 'test'`): stores are seeded from
  `src/data/*.json`, services return canned promises. This is what unit tests
  and the public demo use. Grep for `USE_MOCK` and `isConnected`.

---

## 2. Directory map

```text
src/
├── main.tsx                 entry: mounts <App/> into #root
├── App.tsx                  composes Providers + Router
│
├── app/                     application shell
│   ├── router.tsx           every route in the app (lazy imports, guards)
│   ├── providers.tsx        context providers + SessionBootstrap mount
│   ├── queryClient.ts       (present but the app standardises on Zustand)
│   └── navConfig.ts         sidebar/nav items per role + landingRouteForRole()
│
├── store/
│   └── session.ts           THE auth store: user, accessToken, status
│
├── lib/                     framework-free logic (import from anywhere)
│   ├── axios.ts             the `api` instance: baseURL, auth header, refresh
│   ├── api/
│   │   ├── resources.ts     every REST call (apiListProducts, apiCreateSale…)
│   │   ├── hydrate.ts       fills all feature stores after login
│   │   ├── useLiveResource.ts  refetch-on-mount/focus hook for owner pages
│   │   └── storeIdentity.ts store name/logo for headers & receipts
│   ├── contracts/types.ts   shared wire/domain types (BusinessType, …)
│   ├── http/errors.ts       errorMessage(err) — one way to show API errors
│   ├── jwt.ts               decode token claims (display only, never auth)
│   ├── money.ts / format.ts money(), formatNumber(), date helpers
│   ├── rbac.ts              role helpers used by guards
│   └── theme.ts             light/dark theme handling
│
├── config/
│   ├── roleMap.ts           role → allowed routes/nav (frontend mirror of RBAC)
│   └── StoreProfileContext.tsx  business-type profile (labels, units, features)
│
├── hooks/                   generic hooks (no business logic)
│   ├── useMediaQuery.ts / useBreakpoint.ts   responsive rendering
│   ├── useDebounce.ts       debounced search inputs
│   ├── useFocusTrap.ts      modal accessibility
│   ├── useOfflineQueue.ts   queue POS sales while offline
│   └── useRouteTelemetry.ts page-view logging
│
├── components/
│   ├── ui/                  the design system — USE THESE, don't reinvent
│   │   Button, Input, Modal, ConfirmDialog, DataTable, Badge, Card,
│   │   Toast (toast.success/error), Skeleton, Spinner, SearchField,
│   │   MoneyInput, QuantityInput, Switch, ProgressBar, Logo, …
│   └── access/
│       ├── PlanFeatureGate.tsx   hides UI behind a plan feature (display only!)
│       └── PlanLimitBanner.tsx   "62 of 50 products" warning banners
│
├── features/                one folder per business area
│   ├── auth/        LoginPage, RegisterPage (wizard), SessionBootstrap,
│   │                authService (login/register/refresh/deleteAccount), schemas (zod)
│   ├── home/        HomePage — the public landing page (pricing fetched from DB)
│   ├── pricing/     PricingPage — public /pricing, DB-driven plan cards
│   ├── billing/     CheckoutCompletePage (webhook-polling), DemoCheckoutPage,
│   │                InvoicesPage, CancelSubscriptionPage, billingService
│   ├── subscriptions/ subscriptionService (v1 billing API), usePlanLimits
│   ├── settings/    StoreSettingsPage, BillingPage (plan mgmt), DangerZoneCard
│   ├── products/    ProductsPage + productsStore
│   ├── categories/  categoriesStore (+ UI inside products)
│   ├── customers/   CustomersPage + customersStore
│   ├── suppliers/   SuppliersPage, PurchaseOrdersPage + supplyStore
│   ├── sales/       SalesPage, ReceiptPage + salesStore
│   ├── inventory/   InventoryPage + inventoryStore (stock adjustments)
│   ├── pos/         PosPage — the register (cart, checkout, offline queue)
│   ├── employees/   EmployeesPage + employeesStore (invites, roles)
│   ├── dashboard/   DashboardPage (KPIs)
│   ├── reports/     ReportsPage (plan-gated behind `analytics`)
│   ├── admin/       platform-admin pages (tenants, plans, security, billing)
│   ├── import/      CSV import wizard
│   └── legal/, dispense/  static/plumbing pages
│
├── mocks/ + data/*.json     demo seed data for mock mode ONLY
└── test/                    vitest unit/component tests (31 files)
e2e/                         Playwright specs (auth, a11y)
```

---

## 3. Authentication — how a session actually works

The **access token lives only in memory** (`store/session.ts`, deliberately no
`persist` middleware — tokens must never touch localStorage). The **refresh
token is an HttpOnly cookie** scoped to `/api/auth`; JS can't read it.

```text
LoginPage → authService.login()
  → POST /api/auth/login            (sets refresh cookie, returns accessToken)
  → useSession.setState({ user, accessToken, status: 'authenticated' })

Every request: lib/axios.ts request interceptor
  → adds Authorization: Bearer <accessToken>

Token expires: axios response interceptor catches 401
  → POST /api/auth/refresh (cookie flows automatically)
  → retries the original request with the new token
  → if refresh fails → session cleared → redirected to /login

Page reload: SessionBootstrap (mounted in providers.tsx)
  → tries a silent refresh so the session survives F5
  → importing it also activates lib/api/hydrate.ts (see §4)
```

Rules that must never be broken:

1. Never store tokens in localStorage/sessionStorage.
2. Never treat a decoded JWT claim as authorization — `lib/jwt.ts` is for
   display only. The backend re-checks everything.
3. Role checks in the UI (`RequireRole` in router.tsx, `roleMap.ts`,
   `PlanFeatureGate`) are **usability**, not security. Hiding a button does
   not protect the API — the backend middleware does.

---

## 4. Workspace data — the store + hydrate + live-refresh pattern

Each feature owns a small Zustand store (`productsStore.ts`,
`customersStore.ts`, `supplyStore.ts`, …) shaped like:

```ts
export const useProducts = create<ProductsState>((set, get) => ({
  products: SEED,          // [] when connected, demo JSON in mock mode
  hydrate: (rows) => set({ products: rows }),
  add:    async (input) => { if (isConnected) { const p = await apiCreateProduct(...); set(...) } ... },
  update: async (id, patch) => { ... },
  remove: async (id) => { ... },
}));
```

Three layers keep them honest:

- **`lib/api/resources.ts`** — the ONLY place that knows the REST wire format.
  Every endpoint call lives here (`apiListProducts`, `apiInviteEmployee`,
  `apiVoidSale`…). Each `map*` function normalises a Mongo document into the
  typed domain object the UI uses. If the backend changes a field name, this
  is the single file to touch.
- **`lib/api/hydrate.ts`** — after login (and on silent refresh) it fills
  every store from the API. Each resource loads independently: one failing
  endpoint logs a warning and keeps whatever the store had — it never blanks
  the rest of the app. It also exposes `refreshProducts()`, `refreshSales()`,
  … used by:
- **`lib/api/useLiveResource.ts`** — called at the top of every owner page:

  ```ts
  export default function ProductsPage() {
    useLiveResource('products');   // refetch on mount + window focus (15s throttle)
    const products = useProducts((s) => s.products);
    ...
  ```

  Pages keep rendering the last good data while refreshing — no spinners on
  revisit, no flicker, and stale data self-heals when the tab regains focus.

**Mutation pattern**: call the `resources.ts` function, then update the store
with the server's response (source of truth), then `toast.success(...)`. On
error: `toast.error(errorMessage(err))` — always through
`lib/http/errors.ts` so messages are consistent.

---

## 5. Routing & guards (`app/router.tsx`)

Every page is lazy-loaded (`const X = lazy(() => import('@/features/...'))`)
so the first paint only ships the shell. Route groups:

```text
Public:        /  /pricing  /login  /register  /reset-password  /accept-invite
Billing flow:  /billing/checkout/complete   (polls until webhook confirms)
               /billing/checkout/demo       (simulated checkout, mock provider only)
Workspace:     /dashboard /pos /products /customers /suppliers /purchase-orders
               /inventory /sales /reports /employees /settings ...
               → wrapped in auth guard + <RequireRole roles={[...]}>
Settings:      /settings  /settings/billing  /settings/billing/invoices
               /settings/billing/cancel     (owner-only)
Admin:         /admin/*   (platform_admin only)
```

`app/navConfig.ts` drives the sidebar per role; `landingRouteForRole()` sends
each role to its home page after login (cashier → POS, owner → dashboard…).

---

## 6. Billing & plans on the frontend

The golden rule: **the database is the single source of truth for plans**
(seeded by `backend/src/scripts/seedPlans.ts` — Free $0 / Pro $49 / Enterprise
$99). No page hardcodes plan data:

- `HomePage` and `PricingPage` fetch `GET /api/v1/billing/plans` (HomePage
  keeps a static fallback only for when the API is unreachable).
- `RegisterPage` offers the same plans; paid plans redirect to checkout, and
  **the store is only created after the payment webhook confirms** —
  `CheckoutCompletePage` polls `GET /v1/billing/checkout-sessions/:id/status`
  and only shows success when the backend says `active`/`trialing`. A redirect
  or URL param can never activate anything.
- `settings/BillingPage` reads live subscription state from
  `GET /v1/billing/limits` (status, amount, interval, renewal date,
  cancelAtPeriodEnd, per-store usage counts) and switches plans via
  `POST /v1/billing/change-plan`. After a switch it refetches — features and
  limits change immediately everywhere because every gate reads the same
  entitlements.
- `PlanFeatureGate feature="supplierManagement"` / `"analytics"` and
  `PlanLimitBanner limitKey="productsPerStore"` mirror exactly what the
  backend enforces (same keys). Frontend gating is UX; backend rejects too.
- Limits use `-1` (or `null` from the entitlements endpoint) to mean
  **Unlimited** — always render with that in mind.

---

## 7. Conventions & style

- **Path alias**: `@/` → `src/` (see `vite.config.ts`).
- **Types**: no `any` in feature code; wire-shape normalisation is confined
  to `resources.ts`. Shared domain types live in `lib/contracts/types.ts`.
- **Styling**: inline style objects with CSS variables; responsive via
  `useMediaQuery('(max-width: 768px)')` passed down as `isMobile`. Reuse
  `components/ui` primitives before writing new markup.
- **Forms**: react-hook-form + zod (`features/auth/schemas.ts` is the model).
- **Money**: integer minor units from the API; render with `money(minor/100)`.
  Never do float arithmetic on prices.
- **Errors**: `toast.error(errorMessage(err))` — never `err.message` raw.
- **Accessibility**: modals use `role="dialog"` + `useFocusTrap`; inputs get
  real `<label htmlFor>`; keep visible focus states (the e2e a11y spec checks).

---

## 8. Testing

- **Unit/component**: `npm test` (vitest + RTL + jsdom, `src/test/*.test.ts*`,
  currently 214 tests). Tests run in mock mode automatically
  (`MODE === 'test'` forces `USE_MOCK`), so they never need a server.
- **E2E**: `npx playwright test` (`e2e/*.spec.ts`) against a running app.
- **Typecheck**: `npx tsc --noEmit` — CI-blocking; keep it clean.

## 9. Running it

```bash
# Backend (from backend/): real DB per .env
npm run dev                # port 5050

# Frontend (from frontend/web/): VITE_API_BASE_URL in .env → http://localhost:5050/api
npm run dev                # port 5175

# Full billing demo without Stripe keys (in-memory DB, mock provider):
cd backend && npm run demo:billing          # port 5178
cd frontend/web && VITE_API_BASE_URL=http://localhost:5178/api npm run dev -- --port 5176 --strictPort
```

## 10. How to add a new owner-page feature (checklist)

1. **Types**: add the domain type where it belongs (feature store file or
   `lib/contracts/types.ts` if shared).
2. **API**: add `apiListX/apiCreateX/...` + `mapX()` in `lib/api/resources.ts`.
3. **Store**: create `features/x/xStore.ts` following `productsStore.ts`
   (SEED empty when `isConnected`, `hydrate`, async mutations).
4. **Hydrate**: register a `refreshX()` in `lib/api/hydrate.ts` and call it in
   the post-login load; add the resource to `useLiveResource.ts`'s map.
5. **Page**: `features/x/XPage.tsx` — `useLiveResource('x')` at the top,
   render from the store, mutate through it, `components/ui` for widgets.
6. **Route + nav**: lazy route in `app/router.tsx` (with `RequireRole`),
   entry in `app/navConfig.ts`, role mapping in `config/roleMap.ts`.
7. **Gate it** (if plan-limited): `PlanFeatureGate`/`PlanLimitBanner` on the
   page — and make sure the backend enforces the same key.
8. **Test**: add `src/test/x.test.ts` (mock mode gives you seed data free).
