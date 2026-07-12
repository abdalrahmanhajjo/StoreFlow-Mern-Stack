# Deploying StoreFlow (one real website for everyone)

Right now the app only runs on a laptop. This guide puts it online at a real
URL so anyone — you, your staff, real customers — opens the same site from any
device, and admin approvals work across all of them because there is **one
backend and one database**.

**Architecture after deploy**

```
Everyone's browser ──▶ Frontend (Vercel)  ──▶  Backend API (Render)  ──▶  MongoDB Atlas
   one public URL         static site            one server                one database
```

You need three free accounts: **GitHub**, **Render** (backend), **Vercel**
(frontend). The code is already prepared for this — no code changes needed.

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

## 1. Deploy the backend to Render (10 min)

1. Go to **render.com** → sign in with GitHub → **New + → Blueprint**.
2. Pick this repository. Render reads `backend/render.yaml` automatically.
3. It will ask for the secret env vars — fill in:
   - `MONGO_URI` → your Atlas **standard** connection string (the long
     `mongodb://...` one, same as your local `backend/.env`).
   - `JWT_ACCESS_SECRET` → any long random string (keep it secret).
   - `EMAIL_USER` → `storeflow.noreply@gmail.com`
   - `EMAIL_PASS` → your Gmail app password.
   - `CLIENT_APP_URL` → leave a placeholder for now (e.g. `https://example.com`);
     you'll set the real value in step 3.
4. Click **Apply**. Wait for the build to go green.
5. Copy the service URL, e.g. `https://storeflow-api.onrender.com`. Open it —
   you should see **"StoreFlow API is running"**.

> Free Render services sleep after 15 min idle and take ~30s to wake on the
> first request. Fine for a demo; upgrade the plan to keep it always-on.

---

## 2. Deploy the frontend to Vercel (5 min)

1. Go to **vercel.com** → sign in with GitHub → **Add New → Project** → import
   this repo.
2. Set **Root Directory** to `frontend/web` (click Edit next to it).
3. Vercel auto-detects Vite. Under **Environment Variables**, add:
   - `VITE_API_BASE_URL` = your Render URL **+ `/api`**, e.g.
     `https://storeflow-api.onrender.com/api`
4. **Deploy.** When it's done, copy the site URL, e.g.
   `https://storeflow.vercel.app`.

---

## 3. Connect the two (2 min)

The backend must trust the frontend's domain (for CORS + login cookies):

1. Back in **Render** → your service → **Environment** → set
   `CLIENT_APP_URL` = your Vercel URL (e.g. `https://storeflow.vercel.app`,
   **no trailing slash**) → save. Render redeploys automatically.

That's it. Open your Vercel URL from any device.

---

## 4. First login

The platform admin already lives in your Atlas database:

- **admin@storeflow.app** / **Admin!Flow2026**

(If you ever start from a fresh database, seed it once locally:
`cd backend && MONGO_URI="<atlas>" npm run seed:admin`.)

---

## 5. Verify it's really shared

- On your phone, open the Vercel URL → **Register** a store.
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
