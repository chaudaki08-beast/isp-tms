import { Prisma } from '@prisma/client';
import { handle, ok, fail, parseListQuery, paginated } from '@/lib/api';
import { requireUser, isManager } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createOutageSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';
import { sendCustomerAlert } from '@/lib/messaging';

export const GET = handle(async (req: Request) => {
  await requireUser();
  const { status, skip, take, page, perPage } = parseListQuery(req.url);

  const where: Prisma.OutageWhereInput = { ...(status ? { status: status as never } : {}) };

  const [items, total, active, resolvedAgg] = await Promise.all([
    prisma.outage.findMany({ where, skip, take, orderBy: { startTime: 'desc' }, include: { createdBy: { select: { name: true } } } }),
    prisma.outage.count({ where }),
    prisma.outage.count({ where: { status: 'ACTIVE' } }),
    prisma.outage.findMany({ where: { status: 'RESOLVED', actualResolution: { not: null } }, select: { startTime: true, actualResolution: true } }),
  ]);

  // Average resolution time in minutes.
  const avgResolutionMins = resolvedAgg.length
    ? Math.round(
        resolvedAgg.reduce((s, o) => s + (o.actualResolution!.getTime() - o.startTime.getTime()) / 60000, 0) / resolvedAgg.length
      )
    : 0;

  return ok({ ...paginated(items, total, page, perPage), stats: { active, resolved: resolvedAgg.length, avgResolutionMins } });
});

// Declare an outage and alert affected customers (Module 6).
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  if (!isManager(me.role)) return fail(403, 'Not permitted.');
  const body = createOutageSchema.parse(await req.json());

  // Count affected active customers in the area.
  const affected = await prisma.customer.findMany({
    where: { deletedAt: null, status: 'ACTIVE', area: body.area },
    select: { id: true, mobile: true, email: true },
  });

  const outage = await prisma.outage.create({
    data: {
      area: body.area,
      reason: body.reason,
      description: body.description,
      expectedResolution: body.expectedResolution ? new Date(body.expectedResolution) : null,
      affectedCount: affected.length,
      notifiedChannels: body.notifyChannels,
      createdById: me.id,
    },
  });

  // Fire alerts via the configured channels (no-op stubs until configured).
  if (body.notifyChannels.length) {
    void sendCustomerAlert(
      affected,
      body.notifyChannels,
      `Service outage in ${body.area}: ${body.reason}. We are working to restore it.`
    ).catch((e) => console.error('[outage-alert]', e));
  }

  await logActivity({ userId: me.id, action: 'outage.create', entityType: 'Outage', entityId: outage.id, meta: { area: body.area, affected: affected.length } });
  return ok(outage, 201);
});
