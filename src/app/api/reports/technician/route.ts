import { Role, TaskStatus, ComplaintStatus } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { csvResponse } from '@/lib/reports';

// Per-technician report: jobs assigned/completed, attendance, ratings,
// average resolution time. ?format=csv to download.
export const GET = handle(async (req: Request) => {
  await requireAtLeast(Role.TEAM_LEADER);
  const format = new URL(req.url).searchParams.get('format');

  const techs = await prisma.user.findMany({
    where: { role: Role.TECHNICIAN, deletedAt: null },
    select: {
      id: true,
      name: true,
      employeeCode: true,
      technicianProfile: { select: { ratingAvg: true, ratingCount: true } },
      _count: {
        select: {
          assignedTasks: true,
          attendances: { where: { status: 'PRESENT' } },
        },
      },
    },
  });

  // Completed counts + avg resolution per technician.
  const rows = await Promise.all(
    techs.map(async (t) => {
      const [completed, resolvedComplaints, avgRes] = await Promise.all([
        prisma.task.count({ where: { assignedToId: t.id, status: TaskStatus.COMPLETED } }),
        prisma.complaint.count({ where: { assignedToId: t.id, status: ComplaintStatus.CLOSED } }),
        prisma.complaint.aggregate({ where: { assignedToId: t.id, resolutionMinutes: { not: null } }, _avg: { resolutionMinutes: true } }),
      ]);
      return {
        technician: t.name,
        employeeCode: t.employeeCode ?? '',
        jobsAssigned: t._count.assignedTasks,
        jobsCompleted: completed,
        complaintsClosed: resolvedComplaints,
        daysPresent: t._count.attendances,
        avgRating: Number(t.technicianProfile?.ratingAvg ?? 0).toFixed(2),
        ratingCount: t.technicianProfile?.ratingCount ?? 0,
        avgResolutionMins: Math.round(avgRes._avg.resolutionMinutes ?? 0),
      };
    })
  );

  if (format === 'csv') return csvResponse(rows, 'technician-report.csv');
  return ok({ generatedAt: new Date(), rows });
});
