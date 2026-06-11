import { handle, ok, parseListQuery, paginated } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { Role, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { createFeedbackSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const { skip, take, page, perPage } = parseListQuery(req.url);
  const { searchParams } = new URL(req.url);
  const technicianId = searchParams.get('technicianId');

  const where: Prisma.FeedbackWhereInput = {
    ...(me.role === Role.TECHNICIAN ? { technicianId: me.id } : technicianId ? { technicianId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { technician: { select: { id: true, name: true } }, task: { select: { id: true, code: true } } },
    }),
    prisma.feedback.count({ where }),
  ]);

  return ok(paginated(items, total, page, perPage));
});

/**
 * Submit customer feedback (rating 1-5). Recalculates the technician's
 * rolling average rating. Public-facing flows can call this without auth in
 * future; for now it is authenticated (technician captures it on-site).
 */
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const body = createFeedbackSchema.parse(await req.json());

  const feedback = await prisma.$transaction(async (tx) => {
    const created = await tx.feedback.create({
      data: {
        taskId: body.taskId || null,
        complaintId: body.complaintId || null,
        technicianId: body.technicianId,
        customerName: body.customerName,
        rating: body.rating,
        comment: body.comment,
      },
    });

    // Recompute rolling average for the technician profile.
    const agg = await tx.feedback.aggregate({
      where: { technicianId: body.technicianId },
      _avg: { rating: true },
      _count: true,
    });
    await tx.technicianProfile.updateMany({
      where: { userId: body.technicianId },
      data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
    });

    return created;
  });

  await logActivity({ userId: me.id, action: 'feedback.create', entityType: 'Feedback', entityId: feedback.id, meta: { rating: body.rating } });
  return ok(feedback, 201);
});
