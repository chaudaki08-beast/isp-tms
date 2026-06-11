import { OutageStatus } from '@prisma/client';
import { handle, ok, fail } from '@/lib/api';
import { requireUser, isManager } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { resolveOutageSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

// Resolve / reopen an outage.
export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  if (!isManager(me.role)) return fail(403, 'Not permitted.');
  const { id } = await params;
  const { status } = resolveOutageSchema.parse(await req.json());

  const outage = await prisma.outage.update({
    where: { id },
    data: {
      status,
      actualResolution: status === OutageStatus.RESOLVED ? new Date() : null,
    },
  });

  await logActivity({ userId: me.id, action: `outage.${status.toLowerCase()}`, entityType: 'Outage', entityId: id });
  return ok(outage);
});
