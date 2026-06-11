import { Prisma, Role } from '@prisma/client';
import { handle, ok, parseListQuery, paginated } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// List attendance records. Technicians see only their own; managers see their scope.
export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const { skip, take, page, perPage } = parseListQuery(req.url);
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const userId = searchParams.get('userId');

  const where: Prisma.AttendanceWhereInput = {
    ...(me.role === Role.TECHNICIAN
      ? { userId: me.id }
      : me.role === Role.TEAM_LEADER
      ? { user: { teamLeaderId: me.id } }
      : {}),
    ...(userId && me.role !== Role.TECHNICIAN ? { userId } : {}),
    ...(from || to
      ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      skip,
      take,
      orderBy: { date: 'desc' },
      include: { user: { select: { id: true, name: true, employeeCode: true } } },
    }),
    prisma.attendance.count({ where }),
  ]);

  return ok(paginated(items, total, page, perPage));
});
