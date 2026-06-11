import bcrypt from 'bcryptjs';
import { Prisma, Role } from '@prisma/client';
import { handle, ok, parseListQuery, paginated } from '@/lib/api';
import { requireRole, requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createUserSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

const SAFE_SELECT = {
  id: true,
  employeeCode: true,
  name: true,
  email: true,
  mobile: true,
  role: true,
  status: true,
  profilePhoto: true,
  teamLeaderId: true,
  teamLeader: { select: { id: true, name: true } },
  createdAt: true,
} satisfies Prisma.UserSelect;

// List users — Team Leaders see their own team; Super Admin sees everyone.
export const GET = handle(async (req: Request) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const { search, status, skip, take, page, perPage } = parseListQuery(req.url);
  const { searchParams } = new URL(req.url);
  const role = searchParams.get('role') as Role | null;

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(me.role === Role.TEAM_LEADER ? { teamLeaderId: me.id } : {}),
    ...(role ? { role } : {}),
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } },
            { employeeCode: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.user.findMany({ where, select: SAFE_SELECT, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  return ok(paginated(items, total, page, perPage));
});

// Create a user — Super Admin only.
export const POST = handle(async (req: Request) => {
  const me = await requireRole(Role.SUPER_ADMIN);
  const body = createUserSchema.parse(await req.json());

  const passwordHash = await bcrypt.hash(body.password, 10);
  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email.toLowerCase(),
      mobile: body.mobile,
      passwordHash,
      role: body.role,
      employeeCode: body.employeeCode,
      teamLeaderId: body.teamLeaderId || null,
      address: body.address,
      ...(body.role === Role.TECHNICIAN
        ? { technicianProfile: { create: {} } }
        : {}),
    },
    select: SAFE_SELECT,
  });

  await logActivity({
    userId: me.id,
    action: 'user.create',
    entityType: 'User',
    entityId: user.id,
    meta: { role: user.role },
  });
  return ok(user, 201);
});
