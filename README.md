# ISP Technician Management System

A production-ready, mobile-first **field-operations platform** for Internet Service Providers — built to deploy with a single `git push` to **Vercel**.

Technicians check in with GPS + selfie, receive and update jobs, upload before/after photos, capture customer signatures, log materials and expenses — all from an installable PWA. Team Leaders assign and approve work; Super Admins manage everyone and watch the whole operation live.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 15** (App Router) + **TypeScript** |
| UI | **React 19**, **Tailwind CSS**, Alpine-style interactivity via React, **Chart.js** |
| API | Next.js **Route Handlers** (REST, JSON) |
| Database | **PostgreSQL** (Supabase) via **Prisma 6** |
| Auth | **Auth.js (NextAuth v5)** — credentials + JWT + role-based middleware |
| Storage | **Supabase Storage** (selfies, photos, signatures, receipts) |
| Maps | **Google Maps** + browser Geolocation |
| Push | **Firebase Cloud Messaging** (optional, future-ready) + service-worker push |
| PWA | manifest + service worker (offline shell, install, push) |
| Hosting | **Vercel** (zero server admin) |

## Roles

- **Super Admin** — manage users, all tasks/complaints/attendance/materials/expenses, reports, analytics, live tracking, audit logs.
- **Team Leader** — assign & approve work, monitor their team, view reports/analytics/tracking.
- **Technician** — check in/out, receive & progress tasks, upload photos & signatures, log materials & expenses, view ratings.

## Modules

Authentication · Dashboard · Attendance · Tasks · Complaints · GPS Tracking · Photo Verification · Customer Signature · Materials · Expenses · Feedback · Reports · Notifications · Analytics · PWA.

## Quick start

```bash
# 1. Install dependencies (React 19 peer deps: use legacy flag if needed)
npm install            # or: npm install --legacy-peer-deps

# 2. Configure environment
cp .env.example .env    # then fill in Supabase + Auth secrets (see docs/INSTALLATION.md)

# 3. Create the database schema & seed demo data
npm run db:push
npm run db:seed

# 4. Run it
npm run dev             # http://localhost:3000
```

**Demo accounts** (password `password123`):
`admin@isp-tms.local` · `leader@isp-tms.local` · `tech1@isp-tms.local`

## Documentation

- [Installation guide](docs/INSTALLATION.md) — local setup, Supabase, env vars, storage bucket.
- [Deployment guide](docs/DEPLOYMENT.md) — push to Vercel + Supabase production.
- [API reference](docs/API.md) — every endpoint, auth, payloads.
- [Testing guide](docs/TESTING.md) — manual flows + automated test approach.

## Project structure

```
prisma/
  schema.prisma         # all 15 entities, enums, relations, indexes
  seed.ts               # demo users + sample operational data
src/
  auth.ts               # NextAuth (node) — credentials provider
  auth.config.ts        # NextAuth (edge) — route protection
  middleware.ts         # RBAC gate
  lib/                  # prisma, supabase, rbac, api helpers, validators, notify…
  app/
    api/                # REST route handlers (one folder per resource)
    (dashboard)/        # authenticated app shell + every screen
    login, forgot-password, reset-password
  components/           # UI primitives, charts, camera, signature, shell
public/
  manifest.json, sw.js, offline.html, icons/
```

## Security

CSRF (Auth.js), XSS (React escaping), SQL-injection-safe (Prisma parameterised queries), input validation (Zod on every route), rate limiting (Next throttle middleware), role permissions (RBAC helpers + middleware), and an append-only **audit log** of sensitive actions.

## License

MIT
