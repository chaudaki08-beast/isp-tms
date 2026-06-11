# ISP & Cable Operator Management System

A production-ready, mobile-first **ISP CRM + Billing + Operations platform** for Internet Service Providers and Cable TV operators — built to deploy with a single `git push` to **Vercel**.

Manage customers (CRM with KYC & 360° timeline), plans & packages, billing & payments (invoices, bulk generation, PDF, collection tracking), tickets/complaints, installations & field work, area outages, and serialized inventory (ONT/router/STB with serial + MAC) — plus the original field-ops toolkit: technician attendance with GPS + selfie, live tracking, photo verification, customer signatures, materials, expenses and feedback. All from an installable PWA with role-based access for five+ roles.

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

## Roles (RBAC)

- **Super Admin** — full access to every module + user/role management & audit logs.
- **Admin** — customers, tickets, billing, plans, inventory, outages, staff assignments, reports.
- **Accountant** — billing, invoices, payments, collection reports.
- **Call Center** — create customers & tickets, view customer history.
- **Team Leader** — assign & approve field work, monitor their team, outages, tracking. *(bonus role)*
- **Technician** — check in/out, receive & progress jobs, upload photos & signatures, log materials & expenses.

## Modules

**ISP CRM & Operations:** Customer Management (CRM + KYC + timeline) · Ticket & Complaint Management · Billing & Payments (invoices, bulk, PDF, reminders-ready) · Plans & Packages · Installation / Field Work · Outage & Maintenance · Inventory & Serialized Assets · Notifications & Alerts (email/SMS/WhatsApp-ready) · Reports & Analytics (billing, area, collection) · User & Role Management.

**Field-ops toolkit (bonus):** Attendance (GPS + selfie) · Live GPS Tracking · Photo Verification · Customer Signature · Materials · Expenses · Feedback · PWA (offline, install, push).

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

| Role | Email |
|---|---|
| Super Admin | `admin@isp-tms.local` |
| Admin | `manager@isp-tms.local` |
| Accountant | `accounts@isp-tms.local` |
| Call Center | `callcenter@isp-tms.local` |
| Team Leader | `leader@isp-tms.local` |
| Technician | `tech1@isp-tms.local` |

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
