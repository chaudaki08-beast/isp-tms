# Testing Guide

## 1. Manual smoke test (recommended first pass)

After `npm run db:seed && npm run dev`, walk these flows:

### Super Admin (`admin@isp-tms.local`)
- [ ] Dashboard loads with cards, charts, technician status, recent activity.
- [ ] **Users** → add a Team Leader and a Technician.
- [ ] **Tasks** → create a task, assign it to a technician.
- [ ] **Materials** → add a material, assign quantity to a technician (stock decrements).
- [ ] **Reports** → download the Technician CSV.
- [ ] **Analytics** → six-month charts render.
- [ ] **Audit Logs** → your actions appear.

### Team Leader (`leader@isp-tms.local`)
- [ ] Sees only their own team in Users/Tasks/Tracking.
- [ ] **Live Map** → technician markers (after a technician pings GPS).
- [ ] **Expenses** → approve/reject a pending expense.

### Technician (`tech1@isp-tms.local`)
- [ ] **Attendance** → Check In (GPS + selfie captured), then Check Out; hours computed.
- [ ] **Tasks** → open assigned task → mark *In Progress* → upload before/after photos → capture customer signature → mark *Resolved*.
- [ ] **Materials** → record used quantity (balance updates).
- [ ] **Expenses** → submit a fuel expense with a receipt image.
- [ ] Cannot see other technicians' data (RBAC).

### PWA
- [ ] On Android Chrome, open the site → **Install app** / Add to Home Screen.
- [ ] Toggle airplane mode → cached pages still open; `/offline.html` shows for uncached navigations.

> Camera & GPS require HTTPS or `localhost`. Use a phone over your LAN with `next dev --hostname 0.0.0.0` behind an HTTPS tunnel (e.g. `ngrok`) to test on-device.

---

## 2. API testing with curl / Postman

Sign in via the browser first and copy the `authjs.session-token` cookie, or script the credentials callback. Example authenticated call:

```bash
curl -s http://localhost:3000/api/dashboard \
  -H "Cookie: authjs.session-token=<token>" | jq
```

Create a task:

```bash
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: authjs.session-token=<token>" \
  -d '{"customerName":"Test","customerMobile":"+910000000000","address":"Somewhere","type":"NEW_INSTALLATION","priority":"HIGH"}' | jq
```

Expect `401` with no cookie, `403` if a technician posts to a manager-only route, `422` for invalid bodies.

---

## 3. Automated tests (suggested setup)

The project ships without a test runner to keep the install lean. To add one:

```bash
npm i -D vitest @vitest/coverage-v8
```

Create `vitest.config.ts` and unit-test the pure helpers first — they need no database:

```ts
// tests/utils.test.ts
import { describe, it, expect } from 'vitest';
import { haversineMeters, minutesBetween, generateCode } from '../src/lib/utils';

describe('utils', () => {
  it('computes distance between two points', () => {
    const d = haversineMeters(12.9716, 77.5946, 12.9352, 77.6245);
    expect(d).toBeGreaterThan(4000);
    expect(d).toBeLessThan(6000);
  });

  it('computes minutes between dates', () => {
    const a = new Date('2025-01-01T09:00:00Z');
    const b = new Date('2025-01-01T17:30:00Z');
    expect(minutesBetween(a, b)).toBe(510);
  });

  it('generates prefixed codes', () => {
    expect(generateCode('TSK')).toMatch(/^TSK-[A-Z0-9]{6}$/);
  });
});
```

Run with `npx vitest`.

### Integration / E2E
For full-stack flows use **Playwright** against a seeded test database:

```bash
npm i -D @playwright/test
npx playwright install
```

Write specs that log in via the UI and assert the RBAC boundaries (e.g. a technician navigating to `/users` is redirected or sees a forbidden state). Point `DATABASE_URL` at a disposable Supabase branch or a local Postgres so tests don't touch production.

---

## 4. What to verify in CI before deploy

- `npm run build` succeeds (runs `prisma generate` + `next build`).
- `npx prisma validate` passes.
- Lint: `npm run lint`.
