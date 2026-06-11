import { Role } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser, ApiError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { signatureSchema } from '@/lib/validators';
import { uploadDataUrl } from '@/lib/uploads';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

// Capture the customer's signature as completion proof for a task.
export const POST = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireUser();
  const { id } = await params;
  const body = signatureSchema.parse(await req.json());

  const task = await prisma.task.findFirstOrThrow({ where: { id, deletedAt: null } });
  if (me.role === Role.TECHNICIAN && task.assignedToId !== me.id) {
    throw new ApiError(403, 'This task is not assigned to you.');
  }

  const signatureUrl = await uploadDataUrl(body.signature, `signatures`, `task-${id}`);

  const signature = await prisma.customerSignature.upsert({
    where: { taskId: id },
    update: { customerName: body.customerName, signatureUrl, signedAt: new Date() },
    create: { taskId: id, customerName: body.customerName, signatureUrl },
  });

  await logActivity({ userId: me.id, action: 'task.signature', entityType: 'Task', entityId: id });
  return ok(signature, 201);
});

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const signature = await prisma.customerSignature.findUnique({ where: { taskId: id } });
  return ok(signature);
});
