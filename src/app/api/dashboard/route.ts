import { Role, TaskStatus, ComplaintStatus, TaskType } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

/** Turn a Prisma groupBy result into a { STATUS: count } map. */
function statusMap(groups: { status: string; _count: number }[]): Record<string, number> {
  return Object.fromEntries(groups.map((g) => [g.status, g._count]));
}

export const GET = handle(async () => {
  const me = await requireUser();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Technicians scope: a Team Leader only sees their own team.
  const techScope =
    me.role === Role.TEAM_LEADER ? { teamLeaderId: me.id } : {};
  const assigneeScope =
    me.role === Role.TECHNICIAN
      ? { assignedToId: me.id }
      : me.role === Role.TEAM_LEADER
      ? { assignedTo: { teamLeaderId: me.id } }
      : {};

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Run in two bounded batches rather than one big fan-out, so the dashboard
  // never needs more than ~7 DB connections at once (resilient to a low
  // connection_limit). pendingJobs / pendingComplaints are derived from the
  // status groups below instead of separate count queries.
  const [
    todaysInstallations,
    todaysComplaints,
    completedJobs,
    activeTechnicians,
    presentToday,
    taskStatusGroups,
    complaintStatusGroups,
  ] = await Promise.all([
    prisma.task.count({
      where: { ...assigneeScope, deletedAt: null, type: TaskType.NEW_INSTALLATION, createdAt: { gte: today, lt: tomorrow } },
    }),
    prisma.complaint.count({
      where: { deletedAt: null, openedAt: { gte: today, lt: tomorrow } },
    }),
    prisma.task.count({
      where: { ...assigneeScope, status: TaskStatus.COMPLETED, completedAt: { gte: today, lt: tomorrow } },
    }),
    prisma.user.count({
      where: { role: Role.TECHNICIAN, status: 'ACTIVE', deletedAt: null, ...techScope },
    }),
    prisma.attendance.count({
      where: { date: today, status: 'PRESENT', user: { role: Role.TECHNICIAN, ...techScope } },
    }),
    prisma.task.groupBy({ by: ['status'], _count: true, where: { ...assigneeScope, deletedAt: null } }),
    prisma.complaint.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
  ]);

  const [
    recentActivities,
    technicianStatuses,
    totalCustomers,
    activeCustomers,
    activeOutages,
    monthPayments,
    monthInvoices,
    outstandingAgg,
  ] = await Promise.all([
    prisma.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, role: true } } },
    }),
    prisma.user.findMany({
      where: { role: Role.TECHNICIAN, status: 'ACTIVE', deletedAt: null, ...techScope },
      select: {
        id: true,
        name: true,
        profilePhoto: true,
        attendances: { where: { date: today }, select: { status: true, checkInAt: true, checkOutAt: true } },
        gpsLogs: { take: 1, orderBy: { recordedAt: 'desc' }, select: { lat: true, lng: true, recordedAt: true } },
        _count: { select: { assignedTasks: { where: { status: { in: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS] } } } } },
      },
    }),
    prisma.customer.count({ where: { deletedAt: null } }),
    prisma.customer.count({ where: { deletedAt: null, status: 'ACTIVE' } }),
    prisma.outage.count({ where: { status: 'ACTIVE' } }),
    prisma.payment.aggregate({ where: { paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.invoice.aggregate({ where: { deletedAt: null, issueDate: { gte: monthStart } }, _sum: { total: true } }),
    prisma.invoice.aggregate({ where: { deletedAt: null, status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } }, _sum: { total: true, amountPaid: true } }),
  ]);

  // Derived counts (no extra queries).
  const taskStatus = statusMap(taskStatusGroups as never);
  const complaintStatus = statusMap(complaintStatusGroups as never);
  const pendingJobs = (taskStatus.PENDING ?? 0) + (taskStatus.ASSIGNED ?? 0);
  const pendingComplaints =
    (complaintStatus.OPEN ?? 0) + (complaintStatus.ASSIGNED ?? 0) + (complaintStatus.IN_PROGRESS ?? 0);

  const monthRevenue = Number(monthPayments._sum.amount ?? 0);
  const monthBilled = Number(monthInvoices._sum.total ?? 0);
  const collectionRate = monthBilled > 0 ? Math.round((monthRevenue / monthBilled) * 100) : 0;
  const outstanding = Number(outstandingAgg._sum.total ?? 0) - Number(outstandingAgg._sum.amountPaid ?? 0);

  const absentToday = Math.max(0, activeTechnicians - presentToday);

  return ok({
    cards: {
      todaysInstallations,
      todaysComplaints,
      completedJobs,
      pendingJobs,
      presentTechnicians: presentToday,
      absentTechnicians: absentToday,
      activeTechnicians,
      revenue: monthRevenue,
    },
    crm: {
      totalCustomers,
      activeCustomers,
      pendingComplaints,
      activeOutages,
      monthRevenue,
      monthBilled,
      collectionRate,
      outstanding,
    },
    taskStatus,
    complaintStatus,
    attendanceSummary: {
      present: presentToday,
      absent: absentToday,
      total: activeTechnicians,
      percentage: activeTechnicians ? Math.round((presentToday / activeTechnicians) * 100) : 0,
    },
    technicianStatus: technicianStatuses.map((t) => ({
      id: t.id,
      name: t.name,
      profilePhoto: t.profilePhoto,
      attendance: t.attendances[0]?.status ?? 'ABSENT',
      checkedIn: !!t.attendances[0]?.checkInAt && !t.attendances[0]?.checkOutAt,
      activeTasks: t._count.assignedTasks,
      lastLocation: t.gpsLogs[0] ?? null,
    })),
    recentActivities: recentActivities.map((a) => ({
      id: a.id,
      action: a.action,
      user: a.user?.name ?? 'System',
      role: a.user?.role,
      at: a.createdAt,
      meta: a.meta,
    })),
  });
});
