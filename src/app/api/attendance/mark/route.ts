import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { markAttendanceSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

/**
 * Manager action: mark a staff member's attendance status for a date
 * (e.g. ON_LEAVE, HALF_DAY). "ABSENT" simply removes any existing record
 * for that day (absence = no attendance record).
 */
export const POST = handle(async (req: Request) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const body = markAttendanceSchema.parse(await req.json());

  const date = new Date(`${body.date}T00:00:00.000Z`);

  if (body.status === 'ABSENT') {
    await prisma.attendance.deleteMany({ where: { userId: body.userId, date } });
    await logActivity({ userId: me.id, action: 'attendance.mark.absent', entityType: 'User', entityId: body.userId, meta: { date: body.date } });
    return ok({ message: 'Marked absent (record cleared).' });
  }

  const record = await prisma.attendance.upsert({
    where: { userId_date: { userId: body.userId, date } },
    update: { status: body.status, note: body.note },
    create: { userId: body.userId, date, status: body.status, note: body.note },
  });

  await logActivity({ userId: me.id, action: `attendance.mark.${body.status.toLowerCase()}`, entityType: 'User', entityId: body.userId, meta: { date: body.date } });
  return ok(record);
});
