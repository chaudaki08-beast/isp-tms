import { Role } from '@prisma/client';
import { handle, ok, parseListQuery, paginated } from '@/lib/api';
import { requireRole } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// Audit trail — Super Admin only.
export const GET = handle(async (req: Request) => {
  await requireRole(Role.SUPER_ADMIN);
  const { skip, take, page, perPage, search } = parseListQuery(req.url);

  const where = search
    ? { OR: [{ action: { contains: search, mode: 'insensitive' as const } }, { entityType: { contains: search, mode: 'insensitive' as const } }] }
    : {};

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, role: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);

  return ok(paginated(items, total, page, perPage));
});
