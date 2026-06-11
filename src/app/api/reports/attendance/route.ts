import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { csvResponse } from '@/lib/reports';

// Attendance report for a date range (daily / weekly / monthly via from-to).
export const GET = handle(async (req: Request) => {
  await requireAtLeast(Role.TEAM_LEADER);
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const where = {
    ...(from || to
      ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
      : {}),
  };

  const records = await prisma.attendance.findMany({
    where,
    orderBy: { date: 'desc' },
    include: { user: { select: { name: true, employeeCode: true } } },
  });

  const rows = records.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    technician: r.user.name,
    employeeCode: r.user.employeeCode ?? '',
    status: r.status,
    checkIn: r.checkInAt?.toISOString() ?? '',
    checkOut: r.checkOutAt?.toISOString() ?? '',
    workedHours: (r.workedMinutes / 60).toFixed(2),
    lateMinutes: r.lateMinutes,
  }));

  if (format === 'csv') return csvResponse(rows, 'attendance-report.csv');
  return ok({ generatedAt: new Date(), count: rows.length, rows });
});
