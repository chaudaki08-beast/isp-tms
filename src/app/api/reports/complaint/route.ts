import { Role, ComplaintStatus } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { csvResponse } from '@/lib/reports';

// Complaint report: open / closed / repeat counts (+ per-category breakdown).
export const GET = handle(async (req: Request) => {
  await requireAtLeast(Role.TEAM_LEADER);
  const format = new URL(req.url).searchParams.get('format');

  const [open, closed, repeats, byCategory] = await Promise.all([
    prisma.complaint.count({ where: { deletedAt: null, status: { in: [ComplaintStatus.OPEN, ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS] } } }),
    prisma.complaint.count({ where: { deletedAt: null, status: ComplaintStatus.CLOSED } }),
    prisma.complaint.count({ where: { deletedAt: null, isRepeat: true } }),
    prisma.complaint.groupBy({ by: ['category', 'status'], _count: true, where: { deletedAt: null } }),
  ]);

  const summary = { openComplaints: open, closedComplaints: closed, repeatComplaints: repeats };

  if (format === 'csv') {
    const rows = byCategory.map((c) => ({ category: c.category, status: c.status, count: c._count }));
    return csvResponse(rows, 'complaint-report.csv');
  }

  return ok({ generatedAt: new Date(), summary, byCategory: byCategory.map((c) => ({ category: c.category, status: c.status, count: c._count })) });
});
