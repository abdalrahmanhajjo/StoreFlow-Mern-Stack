# Project Playbook

A reusable plan for every new project, distilled from building and shipping
StoreFlow — every rule below exists because something actually broke without it.

---

## Phase 0 — Repo setup (day one, before features)

- [ ] Monorepo: `backend/` + `frontend/web/`, each with its own `package.json`.
- [ ] TypeScript everywhere; `tsc --noEmit` must pass before every commit.
- [ ] `.gitignore` from the start: `node_modules`, `dist`, `.env`, `*.log`,
      `*.tsbuildinfo`, `test-results/`, `playwright-report/`, `.DS_Store`.
      *(Build artifacts kept sneaking into commits until ignored.)*
- [ ] `.env.example` for both apps, updated the moment a new var appears.
      Real `.env` never committed — check `git ls-files | grep .env` early.
- [ ] Scripts that must exist: `dev`, `build`, `start`, `test`, `lint`,
      `typecheck`. A `dev:memory` script (in-memory DB) pays for itself
      instantly — it's how you smoke-test "fresh production boot" locally.
- [ ] Commit style: explain **why** in the body, not just what. Never force-push
      over remote commits — `git pull --rebase` first.

## Phase 1 — Backend architecture

- [ ] **Fail-fast env validation at boot** (`validateEnv()`): missing DB URI,
      weak/placeholder JWT secret, missing frontend URL in production →
      refuse to start with a human-readable message.
- [ ] `app.set("trust proxy", 1)` — behind Render/Railway/Fly TLS proxies,
      `req.secure` is false without it and Secure cookies silently break.
- [ ] `/api/health` JSON endpoint for load-balancer checks (never bare `/` —
      it collides with serving the frontend later).
- [ ] **Single-service mode from day one**: the server serves the frontend
      build (`express.static` + SPA catch-all that skips `/api`) when it
      exists. One origin = first-party cookies = no third-party-cookie death.
- [ ] Multi-tenancy: a `tenantFilter(req)` on **every** query, and any
      client-supplied reference id (categoryId, customerId…) must be verified
      to belong to the same tenant before use.
- [ ] Money: server is the **authoritative calculator**. Round each line to
      cents, then sum. Never trust client totals; recompute and compare
      **after** rounding (`0.1 + 0.2 > 0.3` rejected a legitimate discount).
- [ ] Webhooks needing signature verification mount **before** `express.json()`
      (raw body).
- [ ] Rate-limit OTP/auth endpoints specifically (6-digit codes are guessable).
- [ ] **Boot-time seeding** (`ensureSeedData()`): anything registration or core
      flows depend on (plans, email templates) auto-seeds on an empty database.
      Conservative rules: seed collections only when empty; upsert with
      `$setOnInsert` so restarts never clobber admin edits.

## Phase 2 — Auth (copy this flow)

- [ ] Register → **email OTP** (6-digit, hashed at rest, 10-min TTL) →
      approval gate if applicable → login.
- [ ] Access token in memory only; refresh token in an **HttpOnly cookie**
      (`SameSite=None; Secure` over HTTPS via `req.secure`, `Lax` in dev),
      rotated on every refresh, reuse detection revokes all sessions.
- [ ] **Every path must reach the OTP step.** The bug: paid plans detoured to
      checkout and dropped users back at a blank register page — code emailed,
      never entered, login forever blocked. Stash pending state
      (sessionStorage) before any redirect and resume the step on return.
- [ ] Login errors route users to the fix: unverified → verification page with
      email prefilled; pending approval → status page. Never a dead-end toast.
- [ ] Account deletion: cancel billing at the provider FIRST (abort if it
      fails), delete tenant data, owner login last — every step retryable.

## Phase 3 — Validation (where most "bugs" lived)

- [ ] **No character whitelists on human names.** `[A-Za-z\s.'-]` rejected
      "José", "Cashier 1", Arabic names — three separate incidents. Length
      limits only. This applies to any display-string field.
- [ ] Mirror server rules client-side (phone format, lengths) so errors show
      inline before the request.
- [ ] Error responses carry a field-level `errors` array; the frontend HTTP
      interceptor surfaces the **first field message**, never a bare
      "Validation failed".
- [ ] **Optimistic-id races**: local-first stores create rows with placeholder
      ids and swap in the server ObjectId async. Anything that *sends* such an
      id must guard: wait briefly for the swap, then either create the
      referenced thing server-side (product→category) or block with a clear
      message (sale→customer). Regex-check `^[0-9a-fA-F]{24}$` before sending.
- [ ] Zod schemas: validate through a middleware that replaces `req.body` with
      the parsed result (strips unknown keys).

## Phase 4 — Frontend architecture

- [ ] Local-first Zustand stores; connected mode mirrors mutations to the API,
      rolls back on failure, reconciles from server truth after conflicts.
- [ ] Mock mode when no API URL is configured — the whole app must be
      demo-able without a backend, and e2e tests run against the mocks.
- [ ] One axios instance: auth header + tenant header injection, silent-refresh
      retry on 401 (once), normalized error shape for the whole app.
- [ ] `VITE_API_BASE_URL` semantics: unset = mocks; `/api` = same-origin
      real API (single-service deploys — **not** unset, that ships demo mode!);
      absolute URL = split deploy (avoid; see Phase 6).

## Phase 5 — Mobile & design (check at 375px, always)

- [ ] Anything fixed-width overflows a phone: step indicators, OTP box rows,
      multi-column grids. Media query at ~520–640px: tighten card padding,
      stack 2-col grids, let fixed boxes flex (`flex: 1 1 0; min-width: 0`).
- [ ] Inputs ≥16px font on touch widths or iOS zoom-jumps on focus.
- [ ] **Safe centering**: `margin: auto` on the card, not flex `align-items:
      center` — flex-centering clips the top of content taller than the
      viewport and it becomes unreachable.
- [ ] Never blanket-hide buttons on mobile (`display:none` on a shared button
      class removed both the nav Sign-in AND plan-card CTAs). Compact instead.
- [ ] If you hide a visible label on mobile, the control still needs a name —
      add `aria-label` (axe `button-name` catches this).
- [ ] Center single-column phone stacks (headings, quotes, CTAs); keep forms
      and label/value tables left-aligned.
- [ ] WCAG AA contrast on the **shared color tokens** — compute the lightest
      passing value against the darkest background in use, fix the token once.
- [ ] Brand/logo in the nav must do something on the page it lives on
      (scroll to top when already home).

## Phase 6 — Deployment (the expensive lessons)

- [ ] **One origin.** `*.onrender.com` / `*.vercel.app` subdomains are
      different *sites* (public-suffix list) — a refresh cookie across them is
      third-party and Safari/incognito/modern Chrome drop it: login works,
      then "session ended" seconds later. Either the backend serves the
      frontend (preferred; blueprint builds both), or the frontend host
      proxies `/api/*` to the backend so the browser only ever sees one origin.
- [ ] SPA fallback per host: `vercel.json` rewrites for Vercel, `_redirects`
      for Netlify/Cloudflare, dashboard rules for Render static — each host
      ignores the others' files. Without it every refresh/deep link 404s.
- [ ] Security headers mirrored in every serving path (helmet CSP on the
      server AND the static-host config): tune CSP for Google Fonts, https
      images, data: URIs before it silently blocks them.
- [ ] Email on free hosts: SMTP ports are blocked — use an HTTPS mail API
      (Gmail API). Publish the OAuth consent screen or refresh tokens die in
      7 days.
- [ ] Payment provider behind an interface with a **mock provider** fallback
      when keys are absent — demos work without Stripe.
- [ ] Write `DEPLOY.md` as you deploy, including *why* (the next person will
      hit the same walls). Blueprint file (`render.yaml`) so deploys are
      one-click and env vars are documented in-place.

## Phase 7 — Testing (what actually kept it shippable)

- [ ] Three layers: backend unit/integration (vitest), frontend unit (vitest),
      e2e + a11y (Playwright, desktop + mobile projects).
- [ ] **Keep e2e runnable**: pin its own port (`--strictPort`) + forced mock
      env **in the config** — a port drift silently disabled the whole suite
      for weeks and it rotted.
- [ ] Playwright rules learned the hard way:
      - `waitForLoadState('load')`, never `networkidle`, on pages that animate
        or poll forever.
      - `emulateMedia({ reducedMotion: 'reduce' })` + settle delay before axe
        scans (mid-transition opacity reads as low contrast).
      - Role-based locators (`getByRole('textbox', { name })`) — label-text
        matching includes aria-hidden marks and collides with toggle buttons.
      - Alert assertions must filter by text — toasts are `role=alert` too.
      - Exclude genuinely decorative text from axe with a WCAG-exception
        comment; don't weaken the whole scan.
- [ ] Responsive regression spec: assert `scrollWidth <= clientWidth` at 375px
      on every step of critical flows.
- [ ] **Prove a new test fails against the old code** (stash the fix, run,
      unstash) — otherwise it's decoration.
- [ ] Full-flow smoke against a fresh in-memory DB in production mode before
      calling anything deploy-ready: boot → auto-seed → register → OTP from
      logs → approve → login → one core transaction end-to-end.
- [ ] Flaky test = real bug in the test or the app. Fix it same day; run the
      suite 2–3× consecutively before trusting green.

## Phase 8 — Demo data

- [ ] Reusable, parameterized seeders (`seedStoreDemoData.ts <owner-email>`):
      **additive + idempotent** — skip existing keys, never modify or delete,
      safe to run against live data.
- [ ] Validate external image URLs (HTTP 200) *before* seeding them.
- [ ] Derived numbers must agree: seed orders first, then compute customer
      spend/points/tiers **from** the orders — never invent aggregates that
      contradict the history.
- [ ] Realistic details sell it: local phone formats, business-hour
      timestamps spread over weeks, mixed payment methods, real invoice format.

## Launch checklist (copy per release)

1. `tsc` + lint + unit suites green on both apps.
2. e2e suite green **3× consecutively** (desktop + mobile projects).
3. Fresh-DB production-mode smoke: register → OTP → login → core flow.
4. `git ls-files` shows no secrets, no build artifacts.
5. Env vars set on host: DB URI, JWT secret (32+ chars), frontend URL,
   mail credentials; payment keys or mock-mode accepted consciously.
6. One-origin check: open the deployed site, log in, wait 10 seconds —
   still logged in? (This exact check catches the cookie trap.)
7. Hard-refresh a deep link on the deployed site — no 404.
8. Phone pass at 375px: register flow, login, nav buttons, core screens.
9. Seed demo data if the deployment is a demo.
10. Tag/note the deploy; update DEPLOY.md if anything surprised you.
