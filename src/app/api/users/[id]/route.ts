import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { updateUserSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await requireRole(Role.SUPER_ADMIN, Role.TEAM_LEADER);
  const { id } = await params;
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      id: true, employeeCode: true, name: true, email: true, mobile: true,
      role: true, status: true, profilePhoto: true, address: true,
      teamLeaderId: true, technicianProfile: true, createdAt: true,
    },
  });
  return ok(user);
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireRole(Role.SUPER_ADMIN);
  const { id } = await params;
  const body = updateUserSchema.parse(await req.json());

  const data: Record<string, unknown> = {
    name: body.name,
    mobile: body.mobile,
    role: body.role,
    status: body.status,
    employeeCode: body.employeeCode,
    address: body.address,
    teamLeaderId: body.teamLeaderId === undefined ? undefined : body.teamLeaderId || null,
  };
  if (body.email) data.email = body.email.toLowerCase();
  if (body.password) data.passwordHash = await bcrypt.hash(body.password, 10);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, status: true },
  });

  await logActivity({ userId: me.id, action: 'user.update', entityType: 'User', entityId: id });
  return ok(user);
});

// Soft delete.
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireRole(Role.SUPER_ADMIN);
  const { id } = await params;

  await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date(), status: 'INACTIVE' },
  });

  await logActivity({ userId: me.id, action: 'user.delete', entityType: 'User', entityId: id });
  return ok({ message: 'User deactivated.' });
});
