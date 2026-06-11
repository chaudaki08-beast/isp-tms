import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

// Lightweight active-technician list for assignment dropdowns.
export const GET = handle(async () => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const technicians = await prisma.user.findMany({
    where: {
      role: Role.TECHNICIAN,
      status: 'ACTIVE',
      deletedAt: null,
      ...(me.role === Role.TEAM_LEADER ? { teamLeaderId: me.id } : {}),
    },
    select: { id: true, name: true, employeeCode: true, profilePhoto: true },
    orderBy: { name: 'asc' },
  });
  return ok(technicians);
});
