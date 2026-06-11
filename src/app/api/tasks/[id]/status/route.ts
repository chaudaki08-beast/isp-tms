import { Role, TaskStatus, NotificationType } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser, ApiError, isManager } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { updateTaskStatusSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';
import { notify } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

// Allowed forward transitions for technicians.
const TECH_TRANSITIONS: Record<string, TaskStatus[]> = {
  ASSIGNED: [TaskStatus.IN_PROGRESS],
  IN_PROGRESS: [TaskStatus.RESOLVED],
};

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireUser();
  const { id } = await params;
  const { status } = updateTaskStatusSchema.parse(await req.json());

  const task = await prisma.task.findFirstOrThrow({ where: { id, deletedAt: null } });

  if (me.role === Role.TECHNICIAN) {
    if (task.assignedToId !== me.id) {
      throw new ApiError(403, 'This task is not assigned to you.');
    }
    const allowed = TECH_TRANSITIONS[task.status] ?? [];
    if (!allowed.includes(status)) {
      throw new ApiError(422, `You cannot move a ${task.status} task to ${status}.`);
    }
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      status,
      startedAt: status === TaskStatus.IN_PROGRESS && !task.startedAt ? new Date() : undefined,
      completedAt: status === TaskStatus.COMPLETED ? new Date() : undefined,
    },
  });

  await logActivity({
    userId: me.id,
    action: 'task.status',
    entityType: 'Task',
    entityId: id,
    meta: { from: task.status, to: status },
  });

  // Notify managers when a technician marks a task resolved (awaiting approval).
  if (status === TaskStatus.RESOLVED && task.createdById) {
    await notify({
      userId: task.createdById,
      type: NotificationType.TASK_UPDATED,
      title: 'Task awaiting approval',
      body: `${task.code} marked resolved by technician.`,
      data: { taskId: task.id },
    });
  }

  // When a manager completes a task, notify the technician.
  if (status === TaskStatus.COMPLETED && isManager(me.role) && task.assignedToId) {
    await notify({
      userId: task.assignedToId,
      type: NotificationType.TASK_UPDATED,
      title: 'Task approved & completed',
      body: `${task.code} has been approved.`,
      data: { taskId: task.id },
    });
  }

  return ok(updated);
});
