import { handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// Mark a single notification read (body: { id }) or all unread (no id).
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const body = await req.json().catch(() => ({}));

  if (body?.id) {
    await prisma.notification.updateMany({
      where: { id: body.id, userId: me.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: me.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  const unread = await prisma.notification.count({ where: { userId: me.id, readAt: null } });
  return ok({ unread });
});
