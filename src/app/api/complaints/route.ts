import { Prisma, Role, ComplaintStatus, NotificationType } from '@prisma/client';
import { handle, ok, parseListQuery, paginated } from '@/lib/api';
import { requireUser, requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createComplaintSchema } from '@/lib/validators';
import { generateCode } from '@/lib/utils';
import { logActivity } from '@/lib/activity';
import { notify } from '@/lib/notify';

export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const { search, status, skip, take, page, perPage } = parseListQuery(req.url);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  const where: Prisma.ComplaintWhereInput = {
    deletedAt: null,
    ...(me.role === Role.TECHNICIAN
      ? { assignedToId: me.id }
      : me.role === Role.TEAM_LEADER
      ? { OR: [{ assignedTo: { teamLeaderId: me.id } }, { createdById: me.id }] }
      : {}),
    ...(status ? { status: status as ComplaintStatus } : {}),
    ...(category ? { category: category as never } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { customerName: { contains: search, mode: 'insensitive' } },
            { customerMobile: { contains: search } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.complaint.findMany({
      where,
      skip,
      take,
      orderBy: { openedAt: 'desc' },
      include: { assignedTo: { select: { id: true, name: true } }, _count: { select: { repeats: true } } },
    }),
    prisma.complaint.count({ where }),
  ]);

  return ok(paginated(items, total, page, perPage));
});

export const POST = handle(async (req: Request) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const body = createComplaintSchema.parse(await req.json());

  // Repeat-complaint detection: same mobile + category in the last 30 days.
  const since = new Date();
  since.setDate(since.getDate() - 30);
  const prior = await prisma.complaint.findFirst({
    where: { customerMobile: body.customerMobile, category: body.category, openedAt: { gte: since }, deletedAt: null },
    orderBy: { openedAt: 'desc' },
  });

  const complaint = await prisma.complaint.create({
    data: {
      code: generateCode('CMP'),
      customerName: body.customerName,
      customerMobile: body.customerMobile,
      address: body.address,
      category: body.category,
      description: body.description,
      assignedToId: body.assignedToId || null,
      createdById: me.id,
      status: body.assignedToId ? ComplaintStatus.ASSIGNED : ComplaintStatus.OPEN,
      isRepeat: !!prior,
      parentComplaintId: prior?.id ?? null,
    },
  });

  await logActivity({ userId: me.id, action: 'complaint.create', entityType: 'Complaint', entityId: complaint.id, meta: { code: complaint.code, repeat: !!prior } });

  if (complaint.assignedToId) {
    await notify({
      userId: complaint.assignedToId,
      type: NotificationType.COMPLAINT_ASSIGNED,
      title: 'New complaint assigned',
      body: `${complaint.category.replaceAll('_', ' ')} — ${complaint.customerName}`,
      data: { complaintId: complaint.id, code: complaint.code },
    });
  }

  return ok(complaint, 201);
});
