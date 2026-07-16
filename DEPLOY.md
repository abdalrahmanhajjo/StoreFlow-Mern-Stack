# Deploying StoreFlow (one real website for everyone)

Right now the app only runs on a laptop. This guide puts it online at a real
URL so anyone — you, your staff, real customers — opens the same site from any
device, and admin approvals work across all of them because there is **one
backend and one database**.

**Architecture after deploy — ONE Render service serves everything**

```
Everyone's browser ──▶ Render web service (frontend + /api)  ──▶  MongoDB Atlas
   one public URL        one server, one origin                   one database
```

You need two free accounts: **GitHub** and **Render**. The `backend/render.yaml`
blueprint builds the frontend and the API into a single service — the server
serves the app's files and answers `/api` on the same URL.

> **Why one service, not a separate frontend host?** The login session lives in
> an HttpOnly refresh cookie. If the frontend and API sit on different
> `*.onrender.com` / `*.vercel.app` subdomains, those are **different sites**
> (public-suffix domains), so the cookie counts as third-party — and Safari,
> incognito windows, and increasingly Chrome silently refuse it. Login appears
> to work, then a few seconds later the app kicks you back to
> `/login?reason=session-ended`. One origin makes the cookie first-party and
> immune to all of that. If you must split hosts anyway (e.g. Vercel), put a
> proxy rewrite from the frontend's `/api/*` to the backend so requests stay
> same-origin from the browser's point of view.

---

## 0. Prerequisites (5 min)

1. **Push the code to GitHub.** Both hosts deploy from GitHub.
   ```bash
   cd ~/storeflow
   git push origin project-setup
   ```
   If it asks for a password, paste a GitHub **Personal Access Token**
   (Settings → Developer settings → Personal access tokens → Fine-grained →
   give it Contents: Read/write on this repo).

2. **Open Atlas to the internet.** cloud.mongodb.com → your cluster →
   **Network Access** → Add IP Address → **Allow access from anywhere
   (0.0.0.0/0)** → Confirm. (Render/Vercel don't have fixed IPs.)

---

## 1. Deploy the whole site to Render (10 min)

1. Go to **render.com** → sign in with GitHub → **New + → Blueprint**.
2. Pick this repository. Render reads `backend/render.yaml` automatically —
   it builds the API **and** the frontend into one service.
3. It will ask for the secret env vars — fill in:
   - `MONGO_URI` → your Atlas **standard** connection string (the long
     `mongodb://...` one, same as your local `backend/.env`).
   - `JWT_ACCESS_SECRET` → any long random string (keep it secret).
   - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`,
     `GMAIL_SENDER` → email credentials. **Do section 1a below first** to get
     these; you can leave them blank for now (the app still runs — codes just
     print to the Render logs — and you can fill them in later).
   - `CLIENT_APP_URL` → leave a placeholder for now (e.g. `https://example.com`);
     right after the first deploy, set it to the service's **own URL**
     (e.g. `https://storeflow.onrender.com`, no trailing slash) and save.
4. Click **Apply**. Wait for the build to go green.
5. Open the service URL — you should see **the StoreFlow app itself** (the
   API answers on the same URL under `/api`, e.g. `/api/health`).

> Free Render services sleep after 15 min idle and take ~30s to wake on the
> first request. Fine for a demo; upgrade the plan to keep it always-on.

---

## 1a. Email: Gmail API credentials (10 min, one time)

The app sends verification & password-reset codes **from your own Gmail using
the Gmail API over HTTPS** — not SMTP. This matters: Render's free plan blocks
outbound SMTP ports, so `smtp.gmail.com` can never send from there. The Gmail
API uses port 443 (like any website), so it works.

You need four values: `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`,
`GMAIL_REFRESH_TOKEN`, and `GMAIL_SENDER` (your Gmail address).

1. **Create a project + enable the API.** Go to
   [console.cloud.google.com](https://console.cloud.google.com) → create a new
   project → search **"Gmail API"** → **Enable**.

2. **Configure the consent screen** (Google's newer "Google Auth Platform" UI
   splits this across pages). APIs & Services → **OAuth consent screen** →
   **Get started** → App name + support email → **Audience: External** →
   contact email → Create. You'll get a left menu: Branding / Audience /
   Data access / Clients.
   - **Add the scope:** left menu → **Data access** → **Add or remove scopes**
     → paste `https://www.googleapis.com/auth/gmail.send` in the manual box →
     **Add to table** → **Update** → **Save**.
   - **Publish:** left menu → **Audience** → click **Publish app** → Confirm.
     Status goes from *Testing* to *In production*. (Do **not** click "Prepare
     for verification" — not needed for your own account.)
   ⚠️ If you leave it in **Testing**, Google expires the refresh token after
   **7 days** and email silently stops. Publishing gives a long-lived token.

3. **Create an OAuth client ID.** Left menu → **Clients** → **Create client**
   → Application type **Web application** → under **Authorized redirect URIs**
   add `https://developers.google.com/oauthplayground` → Create. Copy the
   **Client ID** and **Client secret**.

4. **Mint the refresh token** with the OAuth Playground:
   - Open [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
   - Click the ⚙️ (top right) → check **"Use your own OAuth credentials"** →
     paste your Client ID + secret.
   - In the left "Input your own scopes" box, enter
     `https://www.googleapis.com/auth/gmail.send` → **Authorize APIs** → sign in
     with the Gmail you want to send from → allow (click past the "unverified"
     warning).
   - Click **Exchange authorization code for tokens** → copy the
     **Refresh token** (starts with `1//`).

5. **Put them in Render.** Your service → **Environment** → set:
   - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
   - `GMAIL_SENDER` = the Gmail address you authorized in step 4
   Save → Render redeploys. In the **Logs** you should see
   `[mail] Gmail API ready (sending as you@gmail.com).`
   - `Gmail API auth FAILED: ...invalid_grant` → the refresh token expired
     (app still in Testing — redo step 2's publish, then re-mint in step 4).
   - `Gmail API auth FAILED: ...invalid_client` → wrong client id/secret.
   - `Gmail API not configured` → the env vars didn't save.

Gmail's free send limit is ~500/day — plenty for verification codes.

---

## 2. (Optional) Separate frontend host — read the warning first

You do **not** need this; step 1 already serves the whole site. If you still
want the frontend on its own host (Vercel, a Render *static site*, …), the
browser will treat the login cookie as third-party and many browsers will
drop it — you get bounced to `/login?reason=session-ended` right after
signing in. To make a split setup work you MUST proxy the API through the
frontend's own origin:

- **Render static site:** Redirects/Rewrites → add TWO rules, in this order:
  1. **Rewrite** `/api/*` → `https://<your-api-service>.onrender.com/api/*`
  2. **Rewrite** `/*` → `/index.html`  (SPA fallback — fixes 404 on refresh)
- **Vercel:** the repo's `frontend/web/vercel.json` already has the SPA
  fallback; add a rewrite of `/api/(.*)` to your API URL before it.
- Build the frontend with `VITE_API_BASE_URL=/api` (relative!) so requests go
  to the frontend's own origin and get proxied — never to the API's domain
  directly.
- Set the backend's `CLIENT_APP_URL` to the **frontend's** URL
  (no trailing slash).

That's it. Open your service URL from any device.

---

## 3. First login

The platform admin already lives in your Atlas database:

- **admin@storeflow.app** / **Admin!Flow2026**

(If you ever start from a fresh database, seed it once locally:
`cd backend && MONGO_URI="<atlas>" npm run seed:admin`.)

---

## 4. Verify it's really shared

- On your phone, open your site URL → **Register** a store.
- On your laptop, open the same URL → sign in as admin → **Store approvals** →
  the phone's registration is there → **Approve**.
- Different devices, one database. Done.

---

## Notes

- **Change your Gmail app password** was shared in chat during setup — rotate
  it (Google Account → App passwords) and update `EMAIL_PASS` on Render.
- For real email deliverability at scale, swap Gmail SMTP for a transactional
  provider (SendGrid/Postmark/SES) — just change the `EMAIL_*` vars on Render.
- Custom domain: add it in Vercel (frontend) and update `CLIENT_APP_URL` on
  Render to match.
