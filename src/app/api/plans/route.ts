import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser, requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createPlanSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

export const GET = handle(async () => {
  await requireUser();
  const plans = await prisma.plan.findMany({ where: { deletedAt: null }, orderBy: { monthlyCost: 'asc' } });
  return ok(plans);
});

export const POST = handle(async (req: Request) => {
  const me = await requireRole(Role.SUPER_ADMIN, Role.ADMIN);
  const body = createPlanSchema.parse(await req.json());
  const plan = await prisma.plan.create({ data: body });
  await logActivity({ userId: me.id, action: 'plan.create', entityType: 'Plan', entityId: plan.id });
  return ok(plan, 201);
});
