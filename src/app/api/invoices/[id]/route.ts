import { InvoiceStatus } from '@prisma/client';
import { handle, ok, fail } from '@/lib/api';
import { requireUser, canBill } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const invoice = await prisma.invoice.findFirstOrThrow({
    where: { id, deletedAt: null },
    include: {
      items: true,
      payments: { orderBy: { paidAt: 'desc' } },
      customer: true,
      createdBy: { select: { name: true } },
    },
  });
  return ok({ ...invoice, balance: Number(invoice.total) - Number(invoice.amountPaid) });
});

// Cancel an invoice (billing roles only).
export const PATCH = handle(async (_req: Request, { params }: Ctx) => {
  const me = await requireUser();
  if (!canBill(me.role)) return fail(403, 'Not permitted.');
  const { id } = await params;
  const invoice = await prisma.invoice.update({ where: { id }, data: { status: InvoiceStatus.CANCELLED } });
  await logActivity({ userId: me.id, action: 'invoice.cancel', entityType: 'Invoice', entityId: id });
  return ok(invoice);
});
