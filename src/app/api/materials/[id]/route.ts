import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser, requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createMaterialSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const material = await prisma.material.findFirstOrThrow({
    where: { id, deletedAt: null },
    include: {
      assignments: { include: { technician: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  });
  const assigned = material.assignments.reduce((s, a) => s + a.assignedQty, 0);
  const used = material.assignments.reduce((s, a) => s + a.usedQty, 0);
  return ok({ ...material, assignedQty: assigned, usedQty: used, balanceQty: material.totalStock - (assigned - used) });
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const { id } = await params;
  const body = createMaterialSchema.partial().parse(await req.json());
  const material = await prisma.material.update({ where: { id }, data: body });
  await logActivity({ userId: me.id, action: 'material.update', entityType: 'Material', entityId: id });
  return ok(material);
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireAtLeast(Role.SUPER_ADMIN);
  const { id } = await params;
  await prisma.material.update({ where: { id }, data: { deletedAt: new Date() } });
  await logActivity({ userId: me.id, action: 'material.delete', entityType: 'Material', entityId: id });
  return ok({ message: 'Material removed.' });
});
