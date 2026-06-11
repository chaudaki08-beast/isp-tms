import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { haversineMeters } from '@/lib/utils';

// Live technician locations for the admin map (polled every 30s by the UI).
export const GET = handle(async () => {
  const me = await requireAtLeast(Role.TEAM_LEADER);

  const technicians = await prisma.user.findMany({
    where: {
      role: Role.TECHNICIAN,
      status: 'ACTIVE',
      deletedAt: null,
      ...(me.role === Role.TEAM_LEADER ? { teamLeaderId: me.id } : {}),
    },
    select: {
      id: true,
      name: true,
      profilePhoto: true,
      gpsLogs: { take: 30, orderBy: { recordedAt: 'desc' }, select: { lat: true, lng: true, recordedAt: true } },
    },
  });

  const FRESH_MS = 5 * 60 * 1000; // online if a ping arrived in the last 5 min
  const now = Date.now();

  const result = technicians
    .map((t) => {
      const logs = t.gpsLogs;
      if (logs.length === 0) {
        return { id: t.id, name: t.name, profilePhoto: t.profilePhoto, active: false, location: null, lastUpdated: null, distanceTravelled: 0 };
      }
      const latest = logs[0];
      // Distance over the recent window (logs are newest-first).
      let distance = 0;
      for (let i = 0; i < logs.length - 1; i++) {
        distance += haversineMeters(logs[i].lat, logs[i].lng, logs[i + 1].lat, logs[i + 1].lng);
      }
      return {
        id: t.id,
        name: t.name,
        profilePhoto: t.profilePhoto,
        active: now - new Date(latest.recordedAt).getTime() < FRESH_MS,
        location: { lat: latest.lat, lng: latest.lng },
        lastUpdated: latest.recordedAt,
        distanceTravelled: Math.round(distance),
      };
    });

  return ok({ technicians: result, refreshSeconds: 30 });
});
