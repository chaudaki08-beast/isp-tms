import { handle, ok, fail } from '@/lib/api';
import { requireUser, canBill } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { bulkInvoiceSchema } from '@/lib/validators';
import { nextInvoiceNumber, deriveStatus } from '@/lib/billing';
import { logActivity } from '@/lib/activity';

/**
 * Bulk-generate one invoice per active customer based on their active
 * subscription's monthly amount. Optionally scoped to an area.
 */
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  if (!canBill(me.role)) return fail(403, 'You do not have permission to generate bills.');
  const body = bulkInvoiceSchema.parse(await req.json());

  const dueDate = new Date(body.dueDate);
  const customers = await prisma.customer.findMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      ...(body.area ? { area: body.area } : {}),
      subscriptions: { some: { status: 'ACTIVE' } },
    },
    include: { subscriptions: { where: { status: 'ACTIVE' }, take: 1 } },
  });

  let created = 0;
  const year = new Date().getFullYear();

  // Sequential to keep invoice numbers unique and ordered.
  for (const c of customers) {
    const amount = Number(c.subscriptions[0]?.monthlyAmount ?? 0);
    if (amount <= 0) continue;
    const subtotal = amount;
    const tax = +(subtotal * (body.taxPercent / 100)).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    await prisma.$transaction(async (tx) => {
      const number = await nextInvoiceNumber(tx, year);
      await tx.invoice.create({
        data: {
          number,
          customerId: c.id,
          dueDate,
          subtotal,
          tax,
          total,
          status: deriveStatus(total, 0, dueDate),
          createdById: me.id,
          items: { create: [{ description: 'Monthly subscription', quantity: 1, unitPrice: subtotal, amount: subtotal }] },
        },
      });
    });
    created++;
  }

  await logActivity({ userId: me.id, action: 'invoice.bulk', meta: { created, area: body.area ?? 'ALL' } });
  return ok({ created, customers: customers.length });
});
