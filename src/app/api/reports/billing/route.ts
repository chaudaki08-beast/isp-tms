import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { csvResponse } from '@/lib/reports';

// Billing / collection summary report. ?format=csv to download.
export const GET = handle(async (req: Request) => {
  await requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.ACCOUNTANT);
  const format = new URL(req.url).searchParams.get('format');

  const [byStatus, totals, collected] = await Promise.all([
    prisma.invoice.groupBy({ by: ['status'], _count: true, _sum: { total: true, amountPaid: true }, where: { deletedAt: null } }),
    prisma.invoice.aggregate({ where: { deletedAt: null }, _sum: { total: true, amountPaid: true } }),
    prisma.payment.aggregate({ _sum: { amount: true } }),
  ]);

  const billed = Number(totals._sum.total ?? 0);
  const paid = Number(totals._sum.amountPaid ?? 0);

  const rows = byStatus.map((g) => ({
    status: g.status,
    invoices: g._count,
    billed: Number(g._sum.total ?? 0).toFixed(2),
    collected: Number(g._sum.amountPaid ?? 0).toFixed(2),
  }));

  if (format === 'csv') return csvResponse(rows, 'billing-report.csv');

  return ok({
    generatedAt: new Date(),
    summary: {
      totalBilled: billed,
      totalCollected: Number(collected._sum.amount ?? 0),
      outstanding: billed - paid,
      collectionRate: billed > 0 ? Math.round((paid / billed) * 100) : 0,
    },
    byStatus: rows,
  });
});
