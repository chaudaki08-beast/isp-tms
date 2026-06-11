import { Prisma, Role, TaskStatus, NotificationType } from '@prisma/client';
import { handle, ok, parseListQuery, paginated } from '@/lib/api';
import { requireUser, requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createTaskSchema } from '@/lib/validators';
import { generateCode } from '@/lib/utils';
import { logActivity } from '@/lib/activity';
import { notify } from '@/lib/notify';

// List tasks scoped by role.
export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const { search, status, skip, take, page, perPage } = parseListQuery(req.url);
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');
  const assignedToId = searchParams.get('assignedToId');

  const where: Prisma.TaskWhereInput = {
    deletedAt: null,
    ...(me.role === Role.TECHNICIAN
      ? { assignedToId: me.id }
      : me.role === Role.TEAM_LEADER
      ? { OR: [{ assignedTo: { teamLeaderId: me.id } }, { createdById: me.id }] }
      : {}),
    ...(status ? { status: status as TaskStatus } : {}),
    ...(type ? { type: type as never } : {}),
    ...(assignedToId && me.role !== Role.TECHNICIAN ? { assignedToId } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerMobile: { contains: search } },
            { address: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      skip,
      take,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: {
        assignedTo: { select: { id: true, name: true, profilePhoto: true } },
        _count: { select: { images: true } },
      },
    }),
    prisma.task.count({ where }),
  ]);

  return ok(paginated(items, total, page, perPage));
});

// Create a task — Super Admin or Team Leader.
export const POST = handle(async (req: Request) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const body = createTaskSchema.parse(await req.json());

  const task = await prisma.task.create({
    data: {
      code: generateCode('TSK'),
      customerName: body.customerName,
      customerMobile: body.customerMobile,
      address: body.address,
      lat: body.lat,
      lng: body.lng,
      type: body.type,
      description: body.description,
      priority: body.priority,
      assignedToId: body.assignedToId || null,
      createdById: me.id,
      status: body.assignedToId ? TaskStatus.ASSIGNED : TaskStatus.PENDING,
      assignedDate: body.assignedToId ? new Date() : null,
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    },
    include: { assignedTo: { select: { id: true, name: true } } },
  });

  await logActivity({ userId: me.id, action: 'task.create', entityType: 'Task', entityId: task.id, meta: { code: task.code } });

  if (task.assignedToId) {
    await notify({
      userId: task.assignedToId,
      type: NotificationType.TASK_ASSIGNED,
      title: 'New task assigned',
      body: `${task.type.replaceAll('_', ' ')} for ${task.customerName}`,
      data: { taskId: task.id, code: task.code },
    });
  }

  return ok(task, 201);
});
