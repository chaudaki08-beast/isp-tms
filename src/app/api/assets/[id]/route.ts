import { AssetStatus, CustomerEventType } from '@prisma/client';
import { handle, ok, fail } from '@/lib/api';
import { requireUser, isManager } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { updateAssetSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

// Assign/return/flag an asset. Assigning to a customer records a timeline event.
export const PATCH = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  if (!isManager(me.role)) return fail(403, 'Not permitted.');
  const { id } = await params;
  const body = updateAssetSchema.parse(await req.json());

  const before = await prisma.asset.findUniqueOrThrow({ where: { id } });

  // Determine status: explicit, or inferred from (un)assignment.
  let status = body.status ?? before.status;
  const assigningTo = body.assignedCustomerId;
  if (assigningTo !== undefined) {
    status = assigningTo ? AssetStatus.ASSIGNED : (body.status ?? AssetStatus.AVAILABLE);
  }

  const asset = await prisma.asset.update({
    where: { id },
    data: {
      status,
      macAddress: body.macAddress,
      model: body.model,
      notes: body.notes,
      ...(assigningTo !== undefined
        ? { assignedCustomerId: assigningTo || null, assignedAt: assigningTo ? new Date() : null }
        : {}),
    },
  });

  if (assigningTo) {
    await prisma.customerEvent.create({
      data: { customerId: assigningTo, type: CustomerEventType.EQUIPMENT, title: `${before.type} assigned (SN: ${before.serialNo ?? '—'})`, actorId: me.id },
    });
  }

  await logActivity({ userId: me.id, action: 'asset.update', entityType: 'Asset', entityId: id });
  return ok(asset);
});
