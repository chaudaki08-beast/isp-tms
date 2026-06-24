import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser, ApiError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// Day-by-day attendance calendar for one staff member for a month.
// ?userId=&month=YYYY-MM
export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') || me.id;

  // Technicians may only view their own calendar.
  if (me.role === Role.TECHNICIAN && userId !== me.id) {
    throw new ApiError(403, 'You can only view your own calendar.');
  }

  const now = new Date();
  const month = searchParams.get('month') || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, weekOff: true },
  });
  const weekOff = user.weekOff ?? 0;

  const records = await prisma.attendance.findMany({
    where: { userId, date: { gte: start, lt: end } },
    select: { date: true, status: true, lateMinutes: true },
  });
  const byDay = new Map<number, { status: string; lateMinutes: number }>();
  for (const r of records) {
    byDay.set(new Date(r.date).getUTCDate(), { status: r.status, lateMinutes: r.lateMinutes });
  }

  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const days = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(y, m - 1, day));
    const dow = date.getUTCDay();
    const rec = byDay.get(day);
    let status: string;
    if (rec) status = rec.status;
    else if (dow === weekOff) status = 'WEEK_OFF';
    else if (date > todayUtc) status = 'FUTURE';
    else status = 'ABSENT';
    days.push({ day, dow, status, late: rec?.lateMinutes ?? 0 });
  }

  return ok({ name: user.name, weekOff, month, firstDow: start.getUTCDay(), days });
});
