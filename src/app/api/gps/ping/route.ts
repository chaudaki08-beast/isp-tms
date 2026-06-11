import { handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { gpsPingSchema } from '@/lib/validators';

// Technician device posts its location here (every ~30s while on duty).
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const body = gpsPingSchema.parse(await req.json());

  const log = await prisma.gpsLog.create({
    data: {
      userId: me.id,
      lat: body.lat,
      lng: body.lng,
      accuracy: body.accuracy,
      speed: body.speed,
    },
  });

  return ok({ id: log.id, recordedAt: log.recordedAt }, 201);
});
