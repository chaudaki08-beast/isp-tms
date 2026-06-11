import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser, ApiError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { uploadImageSchema } from '@/lib/validators';
import { uploadDataUrl } from '@/lib/uploads';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const images = await prisma.taskImage.findMany({
    where: { taskId: id },
    orderBy: { createdAt: 'asc' },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });
  return ok(images);
});

// Upload a before/after work photo for a task.
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireUser();
  const { id } = await params;
  const body = uploadImageSchema.parse(await req.json());

  const task = await prisma.task.findFirstOrThrow({ where: { id, deletedAt: null } });
  if (me.role === Role.TECHNICIAN && task.assignedToId !== me.id) {
    throw new ApiError(403, 'This task is not assigned to you.');
  }

  const url = await uploadDataUrl(body.image, `tasks/${id}`, body.type.toLowerCase());

  const image = await prisma.taskImage.create({
    data: { taskId: id, type: body.type, url, caption: body.caption, uploadedById: me.id },
  });

  await logActivity({ userId: me.id, action: 'task.image.upload', entityType: 'Task', entityId: id, meta: { type: body.type } });
  return ok(image, 201);
});
