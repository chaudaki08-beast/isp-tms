import { Role, TaskType, TaskStatus, ComplaintStatus } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

type MonthRow = { month: Date; count: bigint };

// Analytics dashboard data — six-month trends + performance distributions.
export const GET = handle(async () => {
  await requireAtLeast(Role.TEAM_LEADER);

  const [
    installTrend,
    complaintTrend,
    attendanceTrend,
    satisfaction,
    techPerformance,
  ] = await Promise.all([
    // Installations per month (last 6 months).
    prisma.$queryRaw<MonthRow[]>`
      SELECT date_trunc('month', "createdAt") AS month, COUNT(*)::bigint AS count
      FROM tasks
      WHERE type = ${TaskType.NEW_INSTALLATION}::"TaskType"
        AND "deletedAt" IS NULL
        AND "createdAt" >= now() - interval '6 months'
      GROUP BY 1 ORDER BY 1`,
    // Complaints per month.
    prisma.$queryRaw<MonthRow[]>`
      SELECT date_trunc('month', "openedAt") AS month, COUNT(*)::bigint AS count
      FROM complaints
      WHERE "deletedAt" IS NULL
        AND "openedAt" >= now() - interval '6 months'
      GROUP BY 1 ORDER BY 1`,
    // Present-attendance per month.
    prisma.$queryRaw<MonthRow[]>`
      SELECT date_trunc('month', "date") AS month, COUNT(*)::bigint AS count
      FROM attendance
      WHERE status = 'PRESENT'
        AND "date" >= now() - interval '6 months'
      GROUP BY 1 ORDER BY 1`,
    // Customer satisfaction (rating distribution).
    prisma.feedback.groupBy({ by: ['rating'], _count: true }),
    // Technician performance: completed tasks + average rating.
    prisma.user.findMany({
      where: { role: Role.TECHNICIAN, status: 'ACTIVE', deletedAt: null },
      select: {
        id: true,
        name: true,
        technicianProfile: { select: { ratingAvg: true, ratingCount: true } },
        _count: {
          select: {
            assignedTasks: { where: { status: TaskStatus.COMPLETED } },
            assignedComplaints: { where: { status: ComplaintStatus.CLOSED } },
          },
        },
      },
    }),
  ]);

  const toSeries = (rows: MonthRow[]) =>
    rows.map((r) => ({ month: new Date(r.month).toISOString().slice(0, 7), count: Number(r.count) }));

  return ok({
    installationTrend: toSeries(installTrend),
    complaintTrend: toSeries(complaintTrend),
    attendanceTrend: toSeries(attendanceTrend),
    satisfaction: satisfaction.map((s) => ({ rating: s.rating, count: s._count })),
    technicianPerformance: techPerformance.map((t) => ({
      id: t.id,
      name: t.name,
      completedTasks: t._count.assignedTasks,
      closedComplaints: t._count.assignedComplaints,
      ratingAvg: t.technicianProfile?.ratingAvg ?? 0,
      ratingCount: t.technicianProfile?.ratingCount ?? 0,
    })),
  });
});
