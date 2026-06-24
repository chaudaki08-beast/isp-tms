import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

/** Count weekdays (Mon–Fri) in [start, endExclusive). */
function workingDaysBetween(start: Date, endExclusive: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d < endExclusive) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

// Monthly attendance summary per staff member. ?month=YYYY-MM (defaults to current).
export const GET = handle(async (req: Request) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const { searchParams } = new URL(req.url);

  const now = new Date();
  const month = searchParams.get('month') || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1)); // exclusive (first day of next month)

  // Working days counted only up to "today" for the current/ongoing month.
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const effectiveEnd = end < todayUtc ? end : new Date(todayUtc.getTime() + 86400000); // include today
  const workingDays = workingDaysBetween(start, effectiveEnd);

  // Staff in scope (Team Leader → own team; managers → all active staff).
  const staff = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      ...(me.role === Role.TEAM_LEADER ? { OR: [{ teamLeaderId: me.id }, { id: me.id }] } : {}),
    },
    select: { id: true, name: true, employeeCode: true, role: true },
    orderBy: { name: 'asc' },
  });

  const records = await prisma.attendance.findMany({
    where: { date: { gte: start, lt: end }, userId: { in: staff.map((s) => s.id) } },
    select: { userId: true, status: true, lateMinutes: true, workedMinutes: true },
  });

  const rows = staff.map((s) => {
    const mine = records.filter((r) => r.userId === s.id);
    const present = mine.filter((r) => r.status === 'PRESENT').length;
    const halfDay = mine.filter((r) => r.status === 'HALF_DAY').length;
    const leave = mine.filter((r) => r.status === 'ON_LEAVE').length;
    const late = mine.filter((r) => r.lateMinutes > 0).length;
    const workedHours = +(mine.reduce((sum, r) => sum + r.workedMinutes, 0) / 60).toFixed(1);
    const accounted = present + halfDay + leave;
    const absent = Math.max(0, workingDays - accounted);
    const percentage = workingDays > 0 ? Math.round(((present + halfDay * 0.5) / workingDays) * 100) : 0;
    return { id: s.id, name: s.name, employeeCode: s.employeeCode, role: s.role, present, halfDay, leave, absent, late, workedHours, percentage };
  });

  return ok({ month, workingDays, staff: rows });
});
