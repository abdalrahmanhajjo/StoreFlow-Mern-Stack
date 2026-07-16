# StoreFlow — The Full Project Experience

The complete record of building, hardening, and shipping StoreFlow:
118 commits in 15 days (July 2–17, 2026), from `git init` to a live,
seeded, phone-polished SaaS on Render. The distilled rules live in
[PROJECT_PLAYBOOK.md](PROJECT_PLAYBOOK.md); this is the story they came from.

---

## What got built

A multi-tenant retail SaaS: every store owner registers, verifies by email
OTP, passes platform-admin approval, and runs their whole business from one
workspace.

**Storefront workspace** — POS register (cart, role-capped discounts, loyalty
redemption, receipt printing, parked sales), product catalog with photos and
categories, inventory with stock adjustments and reorder thresholds,
customers with loyalty points/tiers/purchase history, suppliers and purchase
orders (plan-gated), sales history with invoices, reports and dashboard
(plan-gated), store settings (identity, per-store tax), employee management
with email invites where new hires set their own password.

**Billing** — public plan catalog (Free / Pro / Enterprise) driving the
pricing page, registration, entitlement enforcement, and admin plan CRUD from
one source of truth; Stripe provider behind an interface with a full mock
provider (simulated card payments) when keys are absent; checkout sessions,
webhooks with raw-body signature verification, subscription lifecycle
(trial, upgrade, downgrade guards, cancellation), account deletion that
cancels billing first.

**Platform admin** — tenant approvals with live refresh, tenant drawer with
plan changes and real month-to-date revenue, user management, active-session
listing with forced logout, security views (login attempts, blocked IPs),
audit logs on every mutation, admin-editable email templates.

**Marketing site** — cinematic landing page (animated hero, storefront tour,
owner-quote spotlight, live-data pricing and reviews), legal pages, contact
form with the "message receipt" gimmick.

**The stack**: Express 5 + Mongoose + TypeScript, React 18 + Vite + Zustand +
React Query, Zod validation on both sides, vitest ×2 + Playwright, MongoDB
Atlas, Render (single service), Gmail API for mail.

---

## The chapters, as they actually happened

### 1. Foundation (July 2–5)
MERN TypeScript scaffold, models/controllers/routes, auth + authorization,
multi-step registration with OTP and pending-approval UX. The frontend was
built **local-first**: every feature fully usable on built-in mocks with no
backend — which later became the demo mode and the e2e test target.

### 2. The product build (July 5–8)
Full POS redesign, catalog/inventory/supplier/customer CRUD with role gating,
the complete admin feature set, and the cinematic landing page. Merge-conflict
pain from parallel branches taught the rebase-first habit early.

### 3. Connecting to reality (July 8–10)
The mock-first workspace was wired to the real API end to end — auth, catalog,
POS, CRM, purchasing, admin on real data. This phase surfaced the first
honest-401 and reset-flow bugs, fixed by an E2E pass. The API got locked
down: tenant isolation everywhere, rate limits, and later a dedicated
security audit (mass assignment, NoSQL injection, IDOR, open redirect).

### 4. Money and focus (July 10–11)
Two classic bug families in one stretch: money arithmetic moved to
integer-cent rounding so the register always equals the receipt; and three
separate "inputs drop focus on every keystroke" bugs (settings, modals, a
hoisted admin Switch) — the React lesson that components defined inside
components get remounted on every render.

### 5. The email saga (July 11–12) — eight commits of pain
Verification codes have to reach real inboxes, and Render's free tier blocks
outbound SMTP. The history reads like a diary: Gmail SMTP → port 465 →
SendGrid → Brevo SMTP → Resend API → console-fallback → back to Gmail SMTP →
Brevo HTTPS API → finally **the Gmail API over HTTPS (port 443)** with OAuth
refresh tokens — plus the discovery that an unpublished OAuth consent screen
expires refresh tokens after 7 days. Codes also always log to the console as
a fallback, which later made automated smoke-testing possible.

### 6. First deployment attempts (July 12–13)
Cross-domain deploy preparation, SPA-refresh 404s fixed by serving the
frontend build from Express (finding out Express 5 removed `app.get('*')`
along the way), CORS trailing-slash traps, malformed-API-URL crash guards,
and the first "session-ended" symptoms — patched, but not yet understood.

### 7. Billing overhaul (July 13–15)
Simulated card payments, unified plan catalog, tenant/membership self-heal,
downgrade guards, subscription-endpoint 500 (a Mongoose populate-path
collision), admin revenue numbers, email templates as an admin feature.

### 8. Hardening week (July 15–17) — the assisted sprint
Everything from here was verified by tests or live probes before shipping:

- **OTP everywhere**: paid-plan registration detoured to checkout and dropped
  users at a blank register page — the emailed code was never entered and
  login stayed blocked forever. The wizard now resumes at the Verify step
  after payment, and unverified logins route to a prefilled resend page.
- **POS "Validation failed" hunt**: four distinct causes — a cashier-name
  regex that rejected digits and accented letters (registration allowed any
  name), float noise pushing `discount` past the subtotal (`0.1 + 0.2`),
  just-created customers still carrying local placeholder ids, and an axios
  interceptor that threw away the server's field-level errors. All four
  fixed; the POS also gained a proper name+phone inline form for new
  customers.
- **Fresh-database boot**: a new deployment couldn't register anyone (no
  plans seeded) and templated emails silently no-oped. `ensureSeedData()` now
  seeds plans (only when empty) and templates (`$setOnInsert`) at boot.
- **The e2e resurrection**: the Playwright suite had been dead for weeks — it
  waited on port 5173 while Vite ran on 5175. Once revived on its own pinned
  port with mock mode forced, it immediately caught real bugs: WCAG AA
  contrast failures on shared color tokens (fixed by computing the lightest
  passing values), login labels with baked-in asterisks, nameless buttons.
  Flakes were hunted to zero: reduced motion for axe scans, `load` instead of
  `networkidle` on the always-animating home page, role-based locators,
  toast-vs-alert races.
- **The "session ended" mystery, solved for real**: the deployed frontend and
  API lived on two different `*.onrender.com` subdomains — which the
  public-suffix list makes *different sites*, so the refresh cookie was
  third-party and modern browsers silently dropped it. Login worked; three
  seconds later the session poll got a 401. Fix: one Render service builds
  and serves both frontend and API on one origin (blueprint updated,
  `/api/health`, CSP tuned for fonts/images), with proxy-rewrite instructions
  for anyone who insists on splitting hosts.
- **Demo data with a story**: additive, idempotent seeders gave the demo
  store 8 categories, 26 products with verified real photos, 8 customers with
  Lebanese phone numbers — then 39 historical orders over 60 days whose
  totals *drive* each customer's spend, points, tier, and purchase history,
  so every number on every screen agrees.
- **Phone polish**: the signup wizard overflowed 375px (step dots, OTP boxes,
  two-column grids) — now it flexes, stacks, uses 16px inputs (iOS zoom), and
  safe-centers with auto margins; a blanket mobile rule that hid the nav
  Sign-in button *and* plan-card CTAs was replaced with compact buttons;
  pricing/reviews/contact sections centered on phones; the nav brand scrolls
  to top. A responsive e2e spec (proven to fail against the old layout)
  guards it all.

---

## The war-story index (symptom → root cause)

| Symptom | Root cause |
| --- | --- |
| "Session ended" seconds after login | Third-party cookie across two public-suffix subdomains |
| Every POS sale: "Validation failed" | Cashier-name regex rejecting digits/accents |
| Full discount rejected | `0.1 + 0.2 > 0.3` — compare before cent-rounding |
| New customer breaks checkout | Optimistic local id sent before the server swap |
| Fresh deploy can't register anyone | Plans never seeded; no boot-time safety net |
| Verification emails never arrive on Render | Free hosts block SMTP; only HTTPS mail APIs work |
| Refresh token dies after a week | Unpublished Google OAuth consent screen |
| Deep links 404 on the deployed site | Each host wants its own SPA-rewrite format |
| E2E suite "passes" by never running | Config port drifted from the dev server port |
| A11y tests flaky | Axe scanning mid-animation; `networkidle` never settles |
| Inputs lose focus per keystroke | Component defined inside a component |
| Paid signups can never log in | Checkout detour skipped the OTP step |
| Sign-in button missing on phones | Blanket `display:none` on a shared button class |

---

## Final numbers

- **118 commits**, July 2 → July 17, 2026
- **Tests**: 42 backend, 214 frontend unit (31 files), 22 Playwright e2e/a11y
  across desktop + mobile projects — all green 3× consecutively
- **~22 API route groups**, 4 roles (platform admin / owner / manager /
  cashier), 4 business types, 3 plans
- **Live**: single Render service + MongoDB Atlas, seeded demo store with
  40 orders of consistent history
- **Docs**: DEPLOY.md (the real path, with the traps), PROJECT_PLAYBOOK.md
  (the rules), this file (the reasons)

The lasting shape of the experience: **most "features" took hours; most days
went to the seams** — auth flows that detour, cookies that cross sites, money
that rounds, ids that race, hosts that block ports, tests that rot. The
playbook exists so the next project spends those days on features instead.
