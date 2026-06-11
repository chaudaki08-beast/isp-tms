import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser, ApiError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { updateMaterialUsageSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

// Technician records material consumed on a job.
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireUser();
  const { id } = await params;
  const { usedQty } = updateMaterialUsageSchema.parse(await req.json());

  const assignment = await prisma.materialAssignment.findUniqueOrThrow({ where: { id } });
  if (me.role === Role.TECHNICIAN && assignment.technicianId !== me.id) {
    throw new ApiError(403, 'Not your assignment.');
  }
  if (usedQty > assignment.assignedQty) {
    throw new ApiError(422, `Used quantity cannot exceed assigned (${assignment.assignedQty}).`);
  }

  const updated = await prisma.materialAssignment.update({ where: { id }, data: { usedQty } });
  await logActivity({ userId: me.id, action: 'material.usage', entityType: 'MaterialAssignment', entityId: id, meta: { usedQty } });
  return ok({ ...updated, balanceQty: updated.assignedQty - updated.usedQty });
});
