import { Prisma, Role } from '@prisma/client';
import { handle, ok, parseListQuery, paginated } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// Technicians see their own assigned materials; managers see their scope.
export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const { skip, take, page, perPage } = parseListQuery(req.url);
  const { searchParams } = new URL(req.url);
  const technicianId = searchParams.get('technicianId');

  const where: Prisma.MaterialAssignmentWhereInput = {
    ...(me.role === Role.TECHNICIAN
      ? { technicianId: me.id }
      : me.role === Role.TEAM_LEADER
      ? { technician: { teamLeaderId: me.id } }
      : technicianId
      ? { technicianId }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.materialAssignment.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        material: { select: { id: true, name: true, unit: true, category: true } },
        technician: { select: { id: true, name: true } },
        task: { select: { id: true, code: true } },
      },
    }),
    prisma.materialAssignment.count({ where }),
  ]);

  const withBalance = items.map((a) => ({ ...a, balanceQty: a.assignedQty - a.usedQty }));
  return ok(paginated(withBalance, total, page, perPage));
});
