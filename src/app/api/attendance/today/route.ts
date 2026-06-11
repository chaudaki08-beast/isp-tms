import { handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// Current user's attendance state for today (drives the check-in/out button).
export const GET = handle(async () => {
  const me = await requireUser();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await prisma.attendance.findUnique({
    where: { userId_date: { userId: me.id, date: today } },
  });

  return ok({
    date: today,
    checkedIn: !!record?.checkInAt,
    checkedOut: !!record?.checkOutAt,
    record,
  });
});
