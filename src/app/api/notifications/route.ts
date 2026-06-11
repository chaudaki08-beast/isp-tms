import { handle, ok, parseListQuery, paginated } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// Current user's notifications (newest first) + unread count.
export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const { skip, take, page, perPage } = parseListQuery(req.url);

  const where = { userId: me.id };
  const [items, total, unread] = await Promise.all([
    prisma.notification.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId: me.id, readAt: null } }),
  ]);

  return ok({ ...paginated(items, total, page, perPage), unread });
});
