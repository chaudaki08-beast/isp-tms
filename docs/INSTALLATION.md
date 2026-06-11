# Installation Guide

This guide gets the ISP Technician Management System running locally.

## Prerequisites

- **Node.js 20+** and npm
- A **Supabase** account (free) — provides Postgres **and** file storage
- (Optional) A **Google Maps** API key for the live tracking map
- (Optional) **Firebase** project for push notifications

---

## 1. Create a Supabase project

1. Go to <https://supabase.com> → **New project**. Pick a name and a strong database password.
2. Wait for provisioning (~2 min).

### 1a. Get the database connection strings

Supabase Dashboard → **Project Settings → Database → Connection string**:

- **Connection pooling** (Transaction mode, port `6543`) → use for `DATABASE_URL`
  Append `?pgbouncer=true&connection_limit=1`.
- **Direct connection** (port `5432`) → use for `DIRECT_URL` (Prisma migrations need a direct connection).

### 1b. Get the API keys

Supabase Dashboard → **Project Settings → API**:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` *(server only — keep secret)*

### 1c. Create the storage bucket

Supabase Dashboard → **Storage → New bucket**:

- Name: `isp-uploads`
- **Public bucket: ON** (so uploaded photos/signatures get public URLs)

> The app uploads with the service-role key, so RLS policies are not required for it to work. If you keep the bucket private instead, switch to signed URLs in `src/lib/supabase.ts`.

---

## 2. Clone & configure

```bash
npm install        # add --legacy-peer-deps if npm complains about React 19 peers
cp .env.example .env
```

Fill in `.env`:

```env
DATABASE_URL="postgresql://...pooler...:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://...:5432/postgres"

AUTH_SECRET="<run: openssl rand -base64 32>"
AUTH_URL="http://localhost:3000"
NEXTAUTH_URL="http://localhost:3000"

NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_STORAGE_BUCKET="isp-uploads"

NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="..."   # optional
```

Generate `AUTH_SECRET`:

```bash
openssl rand -base64 32
# Windows PowerShell alternative:
# [Convert]::ToBase64String((1..32 | % { Get-Random -Max 256 }))
```

---

## 3. Create the schema & seed data

```bash
npm run db:push     # pushes prisma/schema.prisma to Supabase Postgres
npm run db:seed     # creates demo users + sample tasks/complaints/etc.
```

> Use `npm run db:migrate` instead of `db:push` if you want versioned migration files.

Inspect the data any time with:

```bash
npm run db:studio   # opens Prisma Studio
```

---

## 4. Run

```bash
npm run dev
```

Open <http://localhost:3000> and sign in with a demo account:

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@isp-tms.local` | `password123` |
| Team Leader | `leader@isp-tms.local` | `password123` |
| Technician | `tech1@isp-tms.local` | `password123` |

---

## 5. Optional integrations

### Google Maps (live tracking)
Create a key in Google Cloud Console with **Maps JavaScript API** enabled, restrict it to your domain, and set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`.

### Firebase Cloud Messaging (push)
Create a Firebase project, enable Cloud Messaging, and set the `NEXT_PUBLIC_FIREBASE_*` + `FIREBASE_SERVER_KEY` vars. The service worker (`public/sw.js`) already handles `push` and `notificationclick` events.

### WhatsApp (future-ready)
`WHATSAPP_*` vars are wired into config for a future provider integration in `src/lib/notify.ts`.

---

## Troubleshooting

- **`Can't reach database server`** — check `DIRECT_URL`/`DATABASE_URL` and that your IP isn't blocked. Supabase pooler host differs from the direct host.
- **`PrismaClientInitializationError` on Vercel** — make sure `prisma generate` runs in the build (`npm run build` already does this).
- **Camera/GPS not working** — browsers require **HTTPS** (or `localhost`) for `getUserMedia`/Geolocation. Vercel is HTTPS by default.
- **npm peer-dep errors** — run `npm install --legacy-peer-deps` (React 19 is newer than some libraries' declared peers).
