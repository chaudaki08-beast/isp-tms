import { Role, TaskStatus, NotificationType } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser, requireAtLeast, ApiError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { updateTaskSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';
import { notify } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireUser();
  const { id } = await params;

  const task = await prisma.task.findFirstOrThrow({
    where: { id, deletedAt: null },
    include: {
      assignedTo: { select: { id: true, name: true, profilePhoto: true, mobile: true } },
      createdBy: { select: { id: true, name: true } },
      images: { orderBy: { createdAt: 'asc' } },
      signature: true,
      feedback: true,
      materials: { include: { material: true } },
      expenses: true,
    },
  });

  // Technicians may only view their own tasks.
  if (me.role === Role.TECHNICIAN && task.assignedToId !== me.id) {
    throw new ApiError(403, 'This task is not assigned to you.');
  }

  return ok(task);
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const { id } = await params;
  const body = updateTaskSchema.parse(await req.json());

  const before = await prisma.task.findUniqueOrThrow({ where: { id } });

  const task = await prisma.task.update({
    where: { id },
    data: {
      customerName: body.customerName,
      customerMobile: body.customerMobile,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
      type: body.type,
      description: body.description,
      priority: body.priority,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      ...(body.assignedToId !== undefined
        ? {
            assignedToId: body.assignedToId || null,
            status: body.assignedToId && before.status === 'PENDING' ? TaskStatus.ASSIGNED : undefined,
            assignedDate: body.assignedToId && !before.assignedToId ? new Date() : undefined,
          }
        : {}),
    },
  });

  await logActivity({ userId: me.id, action: 'task.update', entityType: 'Task', entityId: id });

  // Notify a newly assigned technician.
  if (body.assignedToId && body.assignedToId !== before.assignedToId) {
    await notify({
      userId: body.assignedToId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'Task assigned to you',
      body: `${task.type.replaceAll('_', ' ')} for ${task.customerName}`,
      data: { taskId: task.id, code: task.code },
    });
  }

  return ok(task);
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const { id } = await params;
  await prisma.task.update({ where: { id }, data: { deletedAt: new Date(), status: 'CANCELLED' } });
  await logActivity({ userId: me.id, action: 'task.delete', entityType: 'Task', entityId: id });
  return ok({ message: 'Task cancelled.' });
});
