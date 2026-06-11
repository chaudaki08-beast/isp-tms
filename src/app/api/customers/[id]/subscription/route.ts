import { CustomerEventType, SubscriptionStatus } from '@prisma/client';
import { handle, ok, fail } from '@/lib/api';
import { requireUser, canManageCustomers } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { changeSubscriptionSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

// Change a customer's plan/package. Closes the current active subscription
// (status CHANGED) and opens a new one, recording a PLAN_CHANGE timeline event.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  if (!canManageCustomers(me.role)) return fail(403, 'Not permitted.');
  const { id } = await params;
  const body = changeSubscriptionSchema.parse(await req.json());

  const subscription = await prisma.$transaction(async (tx) => {
    await tx.subscription.updateMany({
      where: { customerId: id, status: SubscriptionStatus.ACTIVE },
      data: { status: SubscriptionStatus.CHANGED, endDate: new Date() },
    });

    const created = await tx.subscription.create({
      data: {
        customerId: id,
        planId: body.planId || null,
        packageId: body.packageId || null,
        monthlyAmount: body.monthlyAmount,
      },
      include: { plan: true, package: true },
    });

    await tx.customerEvent.create({
      data: {
        customerId: id,
        type: CustomerEventType.PLAN_CHANGE,
        title: `Plan changed to ${created.plan?.name ?? '—'}${created.package ? ' + ' + created.package.name : ''}`,
        actorId: me.id,
      },
    });

    return created;
  });

  await logActivity({ userId: me.id, action: 'customer.subscription.change', entityType: 'Customer', entityId: id });
  return ok(subscription, 201);
});
