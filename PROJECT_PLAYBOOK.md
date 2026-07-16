# MERN Project Playbook

A reusable plan for **any MERN project** (MongoDB + Express + React + Node).
Distilled from building and shipping a production app — every rule exists
because skipping it actually broke something (the stories are in
[PROJECT_EXPERIENCE.md](PROJECT_EXPERIENCE.md)).

The numbered phases apply to every project. The **optional modules** at the
end (multi-tenancy, billing, admin panel) are add-ons — pull them in only
when the project calls for them.

---

## Phase 0 — Repo setup (day one, before any feature)

- [ ] Monorepo: `backend/` + `frontend/web/`, each with its own `package.json`.
- [ ] TypeScript everywhere; `tsc --noEmit` must pass before every commit.
- [ ] `.gitignore` from the start: `node_modules`, `dist`, `.env`, `*.log`,
      `*.tsbuildinfo`, `test-results/`, `playwright-report/`, `.DS_Store`.
      *(Build artifacts keep sneaking into commits until ignored.)*
- [ ] `.env.example` for both apps, updated the moment a new var appears.
      Real `.env` never committed — verify with `git ls-files | grep .env`.
- [ ] Scripts that must exist: `dev`, `build`, `start`, `test`, `lint`,
      `typecheck`. Add a `dev:memory` script (in-memory MongoDB via
      `mongodb-memory-server`) — it's how you rehearse "fresh production
      boot" locally and it pays for itself immediately.
- [ ] Commit style: explain **why** in the body. Never force-push over remote
      commits — `git pull --rebase` first.

## Phase 1 — Backend foundation (Express + Mongoose)

- [ ] **Fail-fast env validation at boot** (`validateEnv()`): missing
      `MONGO_URI`, weak/placeholder JWT secret, missing frontend URL in
      production → refuse to start with a human-readable message. Also clean
      pasted connection strings (quotes, line breaks) and fail with a clear
      hint on DNS/SRV errors.
- [ ] `app.set("trust proxy", 1)` — behind any TLS-terminating host (Render,
      Railway, Fly, Heroku), `req.secure` is false without it and Secure
      cookies silently break.
- [ ] `/api/health` JSON endpoint for uptime checks — never bare `/`
      (it collides with serving the frontend later).
- [ ] **Single-service mode built in from day one**: serve the frontend build
      (`express.static` + SPA catch-all that skips `/api`) when it exists.
      One origin = first-party cookies = no third-party-cookie death.
      Note: Express 5 removed `app.get('*')` — use a plain middleware.
- [ ] All routes under `/api/...`; consistent JSON envelope; a global error
      handler that never leaks stack traces; 404 JSON for unknown API routes.
- [ ] Rate-limit auth and OTP endpoints specifically (short codes are
      guessable); a general limiter for the rest.
- [ ] Numeric correctness wherever money/quantities appear: the **server is
      the authoritative calculator**. Round to the smallest unit (cents)
      per line, then sum. Never compare client-sent floats to computed values
      before rounding (`0.1 + 0.2 > 0.3` will reject legitimate requests).
- [ ] Any webhook needing signature verification mounts **before**
      `express.json()` (raw body).
- [ ] **Boot-time seeding** (`ensureSeedData()`): any reference data a core
      flow depends on auto-seeds on an empty database. Conservative rules:
      seed a collection only when empty; per-document `$setOnInsert` upserts —
      restarts must never clobber data edited in the app.
- [ ] Security basics before launch: helmet, no mass assignment (whitelist
      updatable fields), sanitize/validate every id (`ObjectId.isValid`),
      no open redirects, ownership checks on every resource read/write
      (IDOR), NoSQL-injection-safe queries (never spread raw query objects).

## Phase 2 — Auth (this recipe transfers to any app)

- [ ] Flow: register → **email OTP** (6-digit, stored hashed, ~10-min TTL,
      single-use) → login. Add approval/verification gates only if the
      product needs them.
- [ ] Access token (JWT, ~15 min) in **memory only**; refresh token in an
      **HttpOnly cookie** (`SameSite=None; Secure` over HTTPS keyed off
      `req.secure`, `Lax` on plain HTTP for dev), rotated on every refresh,
      reuse detection revokes the whole session family.
- [ ] **Every path must reach the OTP/verification step.** Any detour
      (payment, external OAuth, an interruption) must stash pending state and
      resume the step on return — a skipped verification step permanently
      locks users out.
- [ ] Login errors route users to the fix, never a dead-end toast:
      unverified → resend page with email prefilled; locked → clear time
      message. Lockout after N failed attempts.
- [ ] Password reset = the same OTP experience as registration.
- [ ] Email sending: on free/cheap hosts SMTP ports are blocked — use an
      HTTPS mail API (e.g. Gmail API with OAuth). Publish the OAuth consent
      screen or refresh tokens expire in 7 days. **Always log codes to the
      console as a fallback** — it also makes automated smoke tests possible.
- [ ] Account deletion: if anything bills or holds external state, cancel it
      FIRST and abort on failure; delete in an order where every step is
      retryable; the login record goes last.

## Phase 3 — Validation (where most "bugs" live)

- [ ] **No character whitelists on human names or free-text display fields.**
      Length limits only — regexes rejected "José", digits, and non-Latin
      scripts repeatedly.
- [ ] Mirror server rules client-side (formats, lengths) so errors appear
      inline before any request.
- [ ] Error responses carry a field-level `errors` array; the frontend HTTP
      interceptor surfaces the **first field message** — never a bare
      "Validation failed".
- [ ] **Optimistic-id races**: if the UI creates rows optimistically with
      local placeholder ids and swaps in server ids async, anything that
      *sends* such an id must guard: check `^[0-9a-fA-F]{24}$`, wait briefly
      for the swap, then either create the referenced record server-side or
      block with a clear message.
- [ ] Validate through middleware that replaces `req.body` with the parsed
      result (Zod `safeParse` → strips unknown keys → also your
      mass-assignment defense).

## Phase 4 — Frontend architecture (React + Vite)

- [ ] State: small per-feature stores (Zustand or similar). Local state is
      what pages render; connected mode mirrors mutations to the API, rolls
      back on failure, and reconciles from server truth after conflicts.
- [ ] **Mock mode**: with no API URL configured the app runs fully on
      built-in mocks. This gives you a zero-setup demo AND a deterministic
      e2e target. Convention: unset API URL = mocks; `/api` = same-origin
      real API (single-service deploys — **not** unset, that ships demo
      mode!); absolute URL = split deploy (avoid; see Phase 6).
- [ ] One axios/fetch instance: auth header injection, one silent-refresh
      retry on 401, normalized error shape for the whole app.
- [ ] React foot-guns to avoid: never define a component inside another
      component (inputs lose focus every keystroke — happened three times);
      key remounts intentionally; hoist stable definitions.
- [ ] Session bootstrap: silent refresh on load; a periodic session check
      that routes to `/login?reason=session-ended` — and skips itself in
      mock mode.

## Phase 5 — Mobile & design (check at 375px, always)

- [ ] Anything fixed-width overflows a phone: step indicators, code-input
      rows, multi-column grids. Media query at ~520–640px: tighten paddings,
      stack 2-col grids, let fixed boxes flex (`flex: 1 1 0; min-width: 0`).
- [ ] Inputs ≥16px font on touch widths or iOS zoom-jumps on focus.
- [ ] **Safe centering**: `margin: auto` on the card, not flex
      `align-items: center` — flex-centering clips the top of content taller
      than the viewport and makes it unreachable.
- [ ] Never blanket-hide buttons on mobile (one shared-class `display:none`
      removed a nav button AND unrelated CTAs). Compact instead.
- [ ] If a visible label is hidden on mobile, the control still needs a name
      (`aria-label`) — axe's `button-name` will catch it.
- [ ] Center single-column phone stacks (headings, quotes, CTAs); keep forms
      and label/value tables left-aligned.
- [ ] WCAG AA contrast on **shared color tokens**: compute the lightest value
      passing 4.5:1 against the darkest background in use; fix the token once,
      fix the app.
- [ ] The nav brand/logo must do something on the page it lives on (scroll to
      top when already home).

## Phase 6 — Deployment (the expensive lessons)

- [ ] **One origin, always.** Frontend and API on different `*.onrender.com` /
      `*.vercel.app` subdomains are different *sites* (public-suffix list):
      the auth cookie becomes third-party and Safari/incognito/modern Chrome
      silently drop it — login "works", then the session dies seconds later.
      Preferred: one service builds and serves both (blueprint/build command
      does `backend build && frontend build with API URL=/api`). If hosts
      must split: proxy `/api/*` through the frontend's origin.
- [ ] SPA fallback per host — each ignores the others' format: `vercel.json`
      rewrites (Vercel), `_redirects` (Netlify/Cloudflare), dashboard rules
      (Render static), Express catch-all (self-served). Without it every
      refresh/deep link 404s.
- [ ] Security headers on every serving path (helmet CSP server-side AND the
      static-host config): tune CSP for your fonts, `https:` images, and
      `data:` URIs before it silently blocks them.
- [ ] Anything with third-party keys (payments, mail) sits behind an
      interface with a **mock implementation** when keys are absent — the
      app must run and demo without secrets.
- [ ] Write `DEPLOY.md` **as you deploy**, including the traps and why. Keep
      a blueprint file (e.g. `render.yaml`) so deploys are one-click and env
      vars are documented in place.
- [ ] Free-tier realities: services sleep (~30s cold start), SMTP blocked,
      no fixed IPs (open Atlas network access accordingly).

## Phase 7 — Testing (what actually keeps it shippable)

- [ ] Three layers: backend tests (vitest + in-memory Mongo replica set —
      transactions need a replset), frontend unit (vitest, runs on mocks),
      e2e + a11y (Playwright, desktop + mobile projects).
- [ ] **Keep e2e runnable**: its own pinned port (`--strictPort`) and forced
      mock env **inside the Playwright config** — a silent port drift once
      disabled an entire suite for weeks while everyone assumed it passed.
- [ ] Playwright rules learned the hard way:
      - `waitForLoadState('load')`, never `networkidle`, on pages that
        animate or poll forever.
      - `emulateMedia({ reducedMotion: 'reduce' })` + a settle delay before
        axe scans (mid-transition opacity reads as low contrast).
      - Role-based locators (`getByRole('textbox', { name })`) — label-text
        matching includes aria-hidden marks and collides with toggles.
      - Alert assertions filter by text — toasts are `role=alert` too.
      - Exclude genuinely decorative text from axe with a documented
        WCAG-exception comment; never weaken the whole scan.
- [ ] Responsive regression spec: `scrollWidth <= clientWidth` at 375px on
      every step of the critical flows.
- [ ] **Prove a new test fails against the old code** (stash fix → run →
      unstash) — otherwise it's decoration.
- [ ] Before calling anything deploy-ready: full-flow smoke against a fresh
      in-memory DB **in production mode** — boot → auto-seed → register →
      OTP from logs → login → one core transaction end to end.
- [ ] A flaky test is a real bug (in test or app). Fix it the same day; trust
      green only after 2–3 consecutive full runs.

## Phase 8 — Seed & demo data

- [ ] Reusable, parameterized seeders (`seedDemoData.ts <key>`): **additive +
      idempotent** — skip existing keys, never modify or delete, safe against
      live data, re-runs add nothing.
- [ ] Validate external image URLs (HTTP 200) *before* seeding them.
- [ ] Derived numbers must agree: seed the transactions first, then compute
      aggregates **from** them — never invent totals that contradict history.
- [ ] Realistic details sell the demo: local phone formats, business-hour
      timestamps spread over weeks, mixed enum values, the app's real
      document formats (e.g. invoice numbering).

---

## Optional modules (add only when the project needs them)

### Multi-tenancy
- A `tenantFilter(req)` on **every** query — no exceptions.
- Any client-supplied reference id must be verified to belong to the same
  tenant before use (cross-tenant injection).
- Role chain per route group: authenticate → tenant-scope → load parent →
  membership → entitlement → per-resource permission; platform admins bypass
  the tenant part explicitly, not accidentally.
- Uniqueness is per-tenant (compound indexes like `{ tenantId, sku }`), not
  global.

### Billing / subscriptions
- One plan catalog as the single source of truth for marketing pages,
  signup, AND entitlement enforcement — copy and authorization must never
  disagree.
- Provider behind an interface + mock provider without keys.
- Webhooks: raw body, signature check, idempotent handlers.
- Deletion cancels at the provider first; keep invoices/audit for compliance.

### Admin panel
- Approval queues with live refresh; audit log on every mutation
  (who/what/when); session listing with forced logout; admin-editable email
  templates (then boot-seeding must use `$setOnInsert` so edits survive).

---

## Launch checklist (copy per release)

1. `tsc` + lint + unit suites green on both apps.
2. e2e suite green **3× consecutively** (desktop + mobile projects).
3. Fresh-DB production-mode smoke: register → OTP → login → core flow.
4. `git ls-files` shows no secrets, no build artifacts.
5. Host env vars set: DB URI, JWT secret (32+ chars), frontend URL, mail
   credentials; third-party keys present or mock mode accepted consciously.
6. One-origin check: open the deployed site, log in, **wait 10 seconds** —
   still logged in? (Catches the third-party-cookie trap in one move.)
7. Hard-refresh a deep link on the deployed site — no 404.
8. Phone pass at 375px: signup, login, nav buttons, core screens.
9. Seed demo data if the deployment is a demo.
10. Tag the deploy; update DEPLOY.md if anything surprised you.
