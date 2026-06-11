import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { csvResponse } from '@/lib/reports';

type AreaRow = { area: string | null; customers: bigint; revenue: number | null; complaints: bigint };

// Revenue + complaints by area / zone (Module 9 Area Reports).
export const GET = handle(async (req: Request) => {
  await requireRole(Role.SUPER_ADMIN, Role.ADMIN, Role.TEAM_LEADER, Role.ACCOUNTANT);
  const format = new URL(req.url).searchParams.get('format');

  // Aggregate per area: customer count, collected revenue, complaint count.
  const rows = await prisma.$queryRaw<AreaRow[]>`
    SELECT c.area AS area,
           COUNT(DISTINCT c.id)::bigint AS customers,
           COALESCE(SUM(p.amount), 0)::float AS revenue,
           COUNT(DISTINCT cm.id)::bigint AS complaints
    FROM customers c
    LEFT JOIN payments p ON p."customerId" = c.id
    LEFT JOIN complaints cm ON cm."customerId" = c.id AND cm."deletedAt" IS NULL
    WHERE c."deletedAt" IS NULL
    GROUP BY c.area
    ORDER BY revenue DESC`;

  const data = rows.map((r) => ({
    area: r.area ?? 'Unassigned',
    customers: Number(r.customers),
    revenue: Number(r.revenue ?? 0).toFixed(2),
    complaints: Number(r.complaints),
  }));

  if (format === 'csv') return csvResponse(data, 'area-report.csv');
  return ok({ generatedAt: new Date(), rows: data });
});
