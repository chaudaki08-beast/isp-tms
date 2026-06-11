import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireAtLeast, ApiError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { assignMaterialSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

// Assign stock from inventory to a technician. Decrements the material's
// totalStock atomically to keep inventory accurate.
export const POST = handle(async (req: Request) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const body = assignMaterialSchema.parse(await req.json());

  const assignment = await prisma.$transaction(async (tx) => {
    const material = await tx.material.findUniqueOrThrow({ where: { id: body.materialId } });
    if (material.totalStock < body.assignedQty) {
      throw new ApiError(422, `Insufficient stock. Available: ${material.totalStock}.`);
    }

    await tx.material.update({
      where: { id: body.materialId },
      data: { totalStock: { decrement: body.assignedQty } },
    });

    return tx.materialAssignment.create({
      data: {
        materialId: body.materialId,
        technicianId: body.technicianId,
        taskId: body.taskId || null,
        assignedById: me.id,
        assignedQty: body.assignedQty,
      },
      include: { material: true, technician: { select: { id: true, name: true } } },
    });
  });

  await logActivity({ userId: me.id, action: 'material.assign', entityType: 'MaterialAssignment', entityId: assignment.id, meta: { qty: body.assignedQty } });
  return ok(assignment, 201);
});
