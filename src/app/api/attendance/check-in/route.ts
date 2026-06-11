import { handle, ok } from '@/lib/api';
import { requireUser, ApiError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { checkInSchema } from '@/lib/validators';
import { uploadDataUrl } from '@/lib/uploads';
import { logActivity } from '@/lib/activity';

// Workday is considered "late" after 09:30 local.
const LATE_THRESHOLD = { hour: 9, minute: 30 };

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const body = checkInSchema.parse(await req.json());

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findUnique({
    where: { userId_date: { userId: user.id, date: today } },
  });
  if (existing?.checkInAt) {
    throw new ApiError(409, 'You have already checked in today.');
  }

  let selfieUrl: string | undefined;
  if (body.selfie?.startsWith('data:')) {
    selfieUrl = await uploadDataUrl(body.selfie, 'attendance', `${user.id}-in`);
  }

  const now = new Date();
  const lateCutoff = new Date(now);
  lateCutoff.setHours(LATE_THRESHOLD.hour, LATE_THRESHOLD.minute, 0, 0);
  const lateMinutes = now > lateCutoff ? Math.round((now.getTime() - lateCutoff.getTime()) / 60000) : 0;

  const record = await prisma.attendance.upsert({
    where: { userId_date: { userId: user.id, date: today } },
    update: {
      checkInAt: now,
      checkInLat: body.lat,
      checkInLng: body.lng,
      checkInSelfie: selfieUrl,
      lateMinutes,
      status: 'PRESENT',
    },
    create: {
      userId: user.id,
      date: today,
      checkInAt: now,
      checkInLat: body.lat,
      checkInLng: body.lng,
      checkInSelfie: selfieUrl,
      lateMinutes,
      status: 'PRESENT',
    },
  });

  await logActivity({ userId: user.id, action: 'attendance.check_in', entityType: 'Attendance', entityId: record.id });
  return ok(record, 201);
});
