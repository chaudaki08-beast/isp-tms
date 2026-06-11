# Deployment Guide — Vercel + Supabase

Deploying is a `git push`. No VPS, no Nginx, no PHP — Vercel builds and hosts the Next.js app, Supabase hosts the database and files.

---

## 1. Prepare Supabase (production)

Use the **same steps as the [Installation guide](INSTALLATION.md) §1** to create a project, get the two connection strings, the three API keys, and a public `isp-uploads` storage bucket. You can reuse your dev Supabase project, but a separate production project is recommended.

---

## 2. Push the repo to GitHub

```bash
git init
git add .
git commit -m "ISP Technician Management System"
git branch -M main
git remote add origin https://github.com/<you>/isp-tms.git
git push -u origin main
```

> `.env` is git-ignored — secrets are configured in Vercel, never committed.

---

## 3. Import into Vercel

1. <https://vercel.com> → **Add New → Project** → import your GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Leave build/output defaults — the `build` script already runs `prisma generate`.
3. **Environment Variables** — add all of these (Production + Preview):

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Supabase **pooler** URL (`...:6543/...?pgbouncer=true&connection_limit=1`) |
   | `DIRECT_URL` | Supabase **direct** URL (`...:5432/...`) |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `AUTH_URL` | `https://<your-app>.vercel.app` |
   | `NEXTAUTH_URL` | `https://<your-app>.vercel.app` |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service-role key |
   | `SUPABASE_STORAGE_BUCKET` | `isp-uploads` |
   | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | (optional) |
   | `FIREBASE_SERVER_KEY` + `NEXT_PUBLIC_FIREBASE_*` | (optional) |

4. Click **Deploy**.

> Tip: After the first deploy you get the real URL — update `AUTH_URL`/`NEXTAUTH_URL` to it and redeploy if needed. Auth.js also reads Vercel's `VERCEL_URL` automatically when `trustHost` is on (it is).

---

## 4. Initialise the production database

The schema isn't pushed automatically. Run it once from your machine, pointed at production:

```bash
# Use your production DIRECT_URL just for this command:
DATABASE_URL="<prod-direct-url>" DIRECT_URL="<prod-direct-url>" npx prisma db push

# (optional) seed an initial admin — edit prisma/seed.ts first to set real credentials:
DATABASE_URL="<prod-direct-url>" DIRECT_URL="<prod-direct-url>" npm run db:seed
```

> **Change the seeded admin password immediately** in production, or replace the seed with a single bootstrap admin of your own.

---

## 5. Verify

1. Visit `https://<your-app>.vercel.app` → you should be redirected to `/login`.
2. Sign in, open the dashboard, create a task, check the live map.
3. On a phone: open the URL → browser menu → **Add to Home Screen** to install the PWA. Camera + GPS work because Vercel serves HTTPS.

---

## Continuous deployment

Every push to `main` triggers a production deploy; pull requests get preview deployments automatically. Database migrations are **not** auto-run — run `prisma migrate deploy` (or `db push`) against production whenever the schema changes:

```bash
DATABASE_URL="<prod-direct-url>" DIRECT_URL="<prod-direct-url>" npx prisma migrate deploy
```

## Notes on serverless

- **No local disk** — all uploads go to Supabase Storage (already implemented in `src/lib/uploads.ts`).
- **Connection pooling** — always use the Supabase pooler URL for `DATABASE_URL` so serverless functions don't exhaust Postgres connections.
- **Cold starts** — the single shared `PrismaClient` in `src/lib/prisma.ts` keeps connections efficient.
