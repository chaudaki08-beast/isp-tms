import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// Monthly attendance summary per staff. ?month=YYYY-MM (defaults to current).
//
// Off-days are flexible: a staff member has a *default* weekly-off day, but any
// specific date can be overridden by an explicit attendance record (e.g. a
// WEEK_OFF or PRESENT record). This endpoint classifies every elapsed day so
// shifting an off-day for one week stays accurate.
export const GET = handle(async (req: Request) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const { searchParams } = new URL(req.url);

  const now = new Date();
  const month = searchParams.get('month') || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1)); // exclusive
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  // Last day to classify: today for the current month, full month if past, none if future.
  const isCurrentMonth = y === now.getUTCFullYear() && m - 1 === now.getUTCMonth();
  const isFuture = start > new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const lastDay = isFuture ? 0 : isCurrentMonth ? now.getUTCDate() : daysInMonth;

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
    select: { userId: true, date: true, status: true, lateMinutes: true, workedMinutes: true },
  });

  const rows = staff.map((s) => {
    const defaultOff = s.weekOff ?? 0; // Sunday default (6-day week)
    const byDay = new Map<number, { status: string; lateMinutes: number; workedMinutes: number }>();
    for (const r of records) {
      if (r.userId === s.id) byDay.set(new Date(r.date).getUTCDate(), r);
    }

    let present = 0, halfDay = 0, leave = 0, weekOff = 0, absent = 0, late = 0, workedMinutes = 0;
    for (let day = 1; day <= lastDay; day++) {
      const dow = new Date(Date.UTC(y, m - 1, day)).getUTCDay();
      const rec = byDay.get(day);
      // Explicit record wins; otherwise the default weekly-off applies.
      const status = rec ? rec.status : dow === defaultOff ? 'WEEK_OFF' : 'ABSENT';
      if (rec) { late += rec.lateMinutes > 0 ? 1 : 0; workedMinutes += rec.workedMinutes; }
      if (status === 'PRESENT') present++;
      else if (status === 'HALF_DAY') halfDay++;
      else if (status === 'ON_LEAVE') leave++;
      else if (status === 'WEEK_OFF') weekOff++;
      else absent++;
    }

    const workingDays = lastDay - weekOff; // every elapsed day except off-days
    const percentage = workingDays > 0 ? Math.round(((present + halfDay * 0.5) / workingDays) * 100) : 0;
    return { id: s.id, name: s.name, employeeCode: s.employeeCode, role: s.role, defaultWeekOff: defaultOff, workingDays, present, halfDay, leave, weekOff, absent, late, workedHours: +(workedMinutes / 60).toFixed(1), percentage };
  });

  return ok({ month, staff: rows });
});
