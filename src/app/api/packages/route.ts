import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser, requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createPackageSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

export const GET = handle(async () => {
  await requireUser();
  const packages = await prisma.package.findMany({ where: { deletedAt: null }, orderBy: { price: 'asc' } });
  return ok(packages);
});

export const POST = handle(async (req: Request) => {
  const me = await requireRole(Role.SUPER_ADMIN, Role.ADMIN);
  const body = createPackageSchema.parse(await req.json());
  const pkg = await prisma.package.create({ data: body });
  await logActivity({ userId: me.id, action: 'package.create', entityType: 'Package', entityId: pkg.id });
  return ok(pkg, 201);
});
