import { handle, ok } from '@/lib/api';
import { requireUser, ApiError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { checkOutSchema } from '@/lib/validators';
import { uploadDataUrl } from '@/lib/uploads';
import { minutesBetween } from '@/lib/utils';
import { logActivity } from '@/lib/activity';

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const body = checkOutSchema.parse(await req.json());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const record = await prisma.attendance.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  });
  if (!record?.checkInAt) {
    throw new ApiError(409, 'You must check in before checking out.');
  }
  if (record.checkOutAt) {
    throw new ApiError(409, 'You have already checked out today.');
  }

  let selfieUrl: string | undefined;
  if (body.selfie?.startsWith('data:')) {
    selfieUrl = await uploadDataUrl(body.selfie, 'attendance', `${user.id}-out`);
  }

  const now = new Date();
  const workedMinutes = minutesBetween(record.checkInAt, now);

  const updated = await prisma.attendance.update({
    where: { id: record.id },
    data: {
      checkOutAt: now,
      checkOutLat: body.lat,
      checkOutLng: body.lng,
      checkOutSelfie: selfieUrl,
      workedMinutes,
      status: workedMinutes < 240 ? 'HALF_DAY' : 'PRESENT',
    },
  });

  await logActivity({ userId: user.id, action: 'attendance.check_out', entityType: 'Attendance', entityId: record.id });
  return ok({ ...updated, workedHours: (workedMinutes / 60).toFixed(2) });
});
