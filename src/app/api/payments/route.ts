import { Prisma } from '@prisma/client';
import { handle, ok, fail, parseListQuery, paginated } from '@/lib/api';
import { requireUser, canBill } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createPaymentSchema } from '@/lib/validators';
import { deriveStatus } from '@/lib/billing';
import { logActivity } from '@/lib/activity';

export const GET = handle(async (req: Request) => {
  await requireUser();
  const { skip, take, page, perPage } = parseListQuery(req.url);
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId');

  const where: Prisma.PaymentWhereInput = { ...(customerId ? { customerId } : {}) };

  const [items, total, sum] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take,
      orderBy: { paidAt: 'desc' },
      include: { customer: { select: { id: true, code: true, name: true } }, invoice: { select: { number: true } }, receivedBy: { select: { name: true } } },
    }),
    prisma.payment.count({ where }),
    prisma.payment.aggregate({ where, _sum: { amount: true } }),
  ]);

  return ok({ ...paginated(items, total, page, perPage), totalCollected: Number(sum._sum.amount ?? 0) });
});

/**
 * Record a payment. If linked to an invoice, updates the invoice's amountPaid
 * and recomputes its status atomically.
 */
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  if (!canBill(me.role)) return fail(403, 'You do not have permission to record payments.');
  const body = createPaymentSchema.parse(await req.json());

  const payment = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        customerId: body.customerId,
        invoiceId: body.invoiceId || null,
        amount: body.amount,
        method: body.method,
        reference: body.reference,
        note: body.note,
        receivedById: me.id,
      },
    });

    if (body.invoiceId) {
      const inv = await tx.invoice.findUniqueOrThrow({ where: { id: body.invoiceId } });
      const newPaid = Number(inv.amountPaid) + body.amount;
      await tx.invoice.update({
        where: { id: body.invoiceId },
        data: { amountPaid: newPaid, status: deriveStatus(Number(inv.total), newPaid, inv.dueDate) },
      });
    }

    await tx.customerEvent.create({
      data: { customerId: body.customerId, type: 'PAYMENT', title: `Payment received ₹${body.amount} (${body.method})`, actorId: me.id },
    });

    return created;
  });

  await logActivity({ userId: me.id, action: 'payment.create', entityType: 'Payment', entityId: payment.id, meta: { amount: body.amount } });
  return ok(payment, 201);
});
