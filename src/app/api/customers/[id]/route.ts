import { CustomerEventType } from '@prisma/client';
import { handle, ok, fail } from '@/lib/api';
import { requireUser, requireRole, canManageCustomers } from '@/lib/rbac';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { updateCustomerSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

// Full customer profile + 360° history (timeline, services, invoices, assets).
export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const customer = await prisma.customer.findFirstOrThrow({
    where: { id, deletedAt: null },
    include: {
      createdBy: { select: { id: true, name: true } },
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        include: { plan: true, package: true },
      },
      invoices: { orderBy: { createdAt: 'desc' }, take: 20 },
      payments: { orderBy: { paidAt: 'desc' }, take: 20 },
      assets: true,
      tickets: { orderBy: { openedAt: 'desc' }, take: 20, select: { id: true, code: true, category: true, status: true, openedAt: true } },
      tasks: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, code: true, type: true, status: true } },
      events: { orderBy: { createdAt: 'desc' }, take: 50, include: { actor: { select: { name: true } } } },
    },
  });

  // Outstanding balance across unpaid invoices.
  const outstanding = customer.invoices
    .filter((i) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(i.status))
    .reduce((s, i) => s + (Number(i.total) - Number(i.amountPaid)), 0);

  return ok({ ...customer, outstanding });
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireUser();
  if (!canManageCustomers(me.role)) return fail(403, 'Not permitted.');
  const { id } = await params;
  const body = updateCustomerSchema.parse(await req.json());

  const before = await prisma.customer.findUniqueOrThrow({ where: { id } });

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: body.name,
      mobile: body.mobile,
      altMobile: body.altMobile,
      email: body.email === '' ? null : body.email,
      address: body.address,
      area: body.area,
      lat: body.lat,
      lng: body.lng,
      connectionType: body.connectionType,
      status: body.status,
      installationDate: body.installationDate ? new Date(body.installationDate) : undefined,
      activationDate: body.activationDate ? new Date(body.activationDate) : undefined,
    },
  });

  // Record a status-change event on the timeline.
  if (body.status && body.status !== before.status) {
    await prisma.customerEvent.create({
      data: {
        customerId: id,
        type: CustomerEventType.STATUS_CHANGE,
        title: `Status changed: ${before.status} → ${body.status}`,
        actorId: me.id,
      },
    });
  }

  await logActivity({ userId: me.id, action: 'customer.update', entityType: 'Customer', entityId: id });
  return ok(customer);
});

// Soft delete — Super Admin / Admin only.
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireRole(Role.SUPER_ADMIN, Role.ADMIN);
  const { id } = await params;
  await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });
  await logActivity({ userId: me.id, action: 'customer.delete', entityType: 'Customer', entityId: id });
  return ok({ message: 'Customer removed.' });
});
