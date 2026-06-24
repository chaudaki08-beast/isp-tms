import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

/** Count working days in [start, endExclusive), excluding the given weekly-off day (0=Sun..6=Sat). */
function workingDaysExcl(start: Date, endExclusive: Date, weekOff: number): number {
  let count = 0;
  const d = new Date(start);
  while (d < endExclusive) {
    if (d.getUTCDay() !== weekOff) count++;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return count;
}

// Monthly attendance summary per staff. ?month=YYYY-MM (defaults to current).
export const GET = handle(async (req: Request) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const { searchParams } = new URL(req.url);

  const now = new Date();
  const month = searchParams.get('month') || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1)); // exclusive

  // For the current/ongoing month, only count working days up to (and incl.) today.
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const effectiveEnd = end < todayUtc ? end : new Date(todayUtc.getTime() + 86400000);

  const staff = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      deletedAt: null,
      ...(me.role === Role.TEAM_LEADER ? { OR: [{ teamLeaderId: me.id }, { id: me.id }] } : {}),
    },
    select: { id: true, name: true, employeeCode: true, role: true, weekOff: true },
    orderBy: { name: 'asc' },
  });

  const records = await prisma.attendance.findMany({
    where: { date: { gte: start, lt: end }, userId: { in: staff.map((s) => s.id) } },
    select: { userId: true, status: true, lateMinutes: true, workedMinutes: true },
  });

  const rows = staff.map((s) => {
    const weekOff = s.weekOff ?? 0; // default Sunday off (6-day week)
    const workingDays = workingDaysExcl(start, effectiveEnd, weekOff);
    const mine = records.filter((r) => r.userId === s.id);
    const present = mine.filter((r) => r.status === 'PRESENT').length;
    const halfDay = mine.filter((r) => r.status === 'HALF_DAY').length;
    const leave = mine.filter((r) => r.status === 'ON_LEAVE').length;
    const late = mine.filter((r) => r.lateMinutes > 0).length;
    const workedHours = +(mine.reduce((sum, r) => sum + r.workedMinutes, 0) / 60).toFixed(1);
    const absent = Math.max(0, workingDays - (present + halfDay + leave));
    const percentage = workingDays > 0 ? Math.round(((present + halfDay * 0.5) / workingDays) * 100) : 0;
    return { id: s.id, name: s.name, employeeCode: s.employeeCode, role: s.role, weekOff, workingDays, present, halfDay, leave, absent, late, workedHours, percentage };
  });

  return ok({ month, staff: rows });
});
