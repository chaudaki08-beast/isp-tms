import { Role, ComplaintStatus, NotificationType } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser, ApiError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { updateComplaintSchema } from '@/lib/validators';
import { minutesBetween } from '@/lib/utils';
import { logActivity } from '@/lib/activity';
import { notify } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireUser();
  const { id } = await params;
  const complaint = await prisma.complaint.findFirstOrThrow({
    where: { id, deletedAt: null },
    include: {
      assignedTo: { select: { id: true, name: true, mobile: true } },
      createdBy: { select: { id: true, name: true } },
      parentComplaint: { select: { id: true, code: true, openedAt: true } },
      repeats: { select: { id: true, code: true, openedAt: true } },
      task: { select: { id: true, code: true, status: true } },
      feedback: true,
    },
  });

  if (me.role === Role.TECHNICIAN && complaint.assignedToId !== me.id) {
    throw new ApiError(403, 'This complaint is not assigned to you.');
  }
  return ok(complaint);
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireUser();
  const { id } = await params;
  const body = updateComplaintSchema.parse(await req.json());

  const before = await prisma.complaint.findFirstOrThrow({ where: { id, deletedAt: null } });

  // Technicians can only progress complaints assigned to them.
  if (me.role === Role.TECHNICIAN) {
    if (before.assignedToId !== me.id) throw new ApiError(403, 'Not your complaint.');
    if (body.assignedToId !== undefined) throw new ApiError(403, 'Technicians cannot reassign complaints.');
  }

  const status = body.status ?? before.status;
  const resolvedNow = status === ComplaintStatus.RESOLVED && before.status !== ComplaintStatus.RESOLVED;
  const closedNow = status === ComplaintStatus.CLOSED && before.status !== ComplaintStatus.CLOSED;

  const complaint = await prisma.complaint.update({
    where: { id },
    data: {
      status: body.status,
      description: body.description,
      assignedToId: me.role === Role.TECHNICIAN ? undefined : body.assignedToId === undefined ? undefined : body.assignedToId || null,
      ...(body.assignedToId && status === ComplaintStatus.OPEN ? { status: ComplaintStatus.ASSIGNED } : {}),
      resolvedAt: resolvedNow ? new Date() : undefined,
      closedAt: closedNow ? new Date() : undefined,
      resolutionMinutes: resolvedNow ? minutesBetween(before.openedAt, new Date()) : undefined,
    },
  });

  await logActivity({ userId: me.id, action: 'complaint.update', entityType: 'Complaint', entityId: id, meta: { from: before.status, to: status } });

  if (body.assignedToId && body.assignedToId !== before.assignedToId) {
    await notify({
      userId: body.assignedToId,
      type: NotificationType.COMPLAINT_ASSIGNED,
      title: 'Complaint assigned to you',
      body: `${complaint.code} — ${complaint.customerName}`,
      data: { complaintId: complaint.id },
    });
  }

  return ok(complaint);
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireUser();
  if (me.role === Role.TECHNICIAN) throw new ApiError(403, 'Forbidden.');
  const { id } = await params;
  await prisma.complaint.update({ where: { id }, data: { deletedAt: new Date() } });
  await logActivity({ userId: me.id, action: 'complaint.delete', entityType: 'Complaint', entityId: id });
  return ok({ message: 'Complaint removed.' });
});
