import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createPlanSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireRole(Role.SUPER_ADMIN, Role.ADMIN);
  const { id } = await params;
  const body = createPlanSchema.partial().parse(await req.json());
  const plan = await prisma.plan.update({ where: { id }, data: body });
  await logActivity({ userId: me.id, action: 'plan.update', entityType: 'Plan', entityId: id });
  return ok(plan);
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireRole(Role.SUPER_ADMIN, Role.ADMIN);
  const { id } = await params;
  await prisma.plan.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  await logActivity({ userId: me.id, action: 'plan.delete', entityType: 'Plan', entityId: id });
  return ok({ message: 'Plan removed.' });
});
