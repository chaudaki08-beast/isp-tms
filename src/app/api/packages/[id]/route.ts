import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createPackageSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireRole(Role.SUPER_ADMIN, Role.ADMIN);
  const { id } = await params;
  const body = createPackageSchema.partial().parse(await req.json());
  const pkg = await prisma.package.update({ where: { id }, data: body });
  await logActivity({ userId: me.id, action: 'package.update', entityType: 'Package', entityId: id });
  return ok(pkg);
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireRole(Role.SUPER_ADMIN, Role.ADMIN);
  const { id } = await params;
  await prisma.package.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  await logActivity({ userId: me.id, action: 'package.delete', entityType: 'Package', entityId: id });
  return ok({ message: 'Package removed.' });
});
