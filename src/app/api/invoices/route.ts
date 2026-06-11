import { Prisma } from '@prisma/client';
import { handle, ok, fail, parseListQuery, paginated } from '@/lib/api';
import { requireUser, canBill } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createInvoiceSchema } from '@/lib/validators';
import { nextInvoiceNumber, deriveStatus } from '@/lib/billing';
import { logActivity } from '@/lib/activity';

export const GET = handle(async (req: Request) => {
  await requireUser();
  const { search, status, skip, take, page, perPage } = parseListQuery(req.url);
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get('customerId');

  const where: Prisma.InvoiceWhereInput = {
    deletedAt: null,
    ...(customerId ? { customerId } : {}),
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { number: { contains: search, mode: 'insensitive' } },
            { customer: { name: { contains: search, mode: 'insensitive' } } },
            { customer: { mobile: { contains: search } } },
          ],
        }
      : {}),
  };

  const [items, total, sums] = await Promise.all([
    prisma.invoice.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { id: true, code: true, name: true, mobile: true } } },
    }),
    prisma.invoice.count({ where }),
    prisma.invoice.groupBy({ by: ['status'], _sum: { total: true, amountPaid: true }, where }),
  ]);

  const summary = {
    billed: sums.reduce((s, g) => s + Number(g._sum.total ?? 0), 0),
    collected: sums.reduce((s, g) => s + Number(g._sum.amountPaid ?? 0), 0),
  };

  return ok({ ...paginated(items, total, page, perPage), summary });
});

// Create a single invoice with line items — billing roles only.
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  if (!canBill(me.role)) return fail(403, 'You do not have permission to create invoices.');
  const body = createInvoiceSchema.parse(await req.json());

  const subtotal = body.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax = +(subtotal * (body.taxPercent / 100)).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);
  const dueDate = new Date(body.dueDate);

  const invoice = await prisma.$transaction(async (tx) => {
    const number = await nextInvoiceNumber(tx, new Date().getFullYear());
    return tx.invoice.create({
      data: {
        number,
        customerId: body.customerId,
        dueDate,
        periodStart: body.periodStart ? new Date(body.periodStart) : null,
        periodEnd: body.periodEnd ? new Date(body.periodEnd) : null,
        subtotal,
        tax,
        total,
        status: deriveStatus(total, 0, dueDate),
        notes: body.notes,
        createdById: me.id,
        items: { create: body.items.map((i) => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, amount: i.quantity * i.unitPrice })) },
      },
      include: { items: true, customer: { select: { name: true, code: true } } },
    });
  });

  await prisma.customerEvent.create({
    data: { customerId: body.customerId, type: 'PAYMENT', title: `Invoice ${invoice.number} raised (₹${total})`, actorId: me.id },
  });
  await logActivity({ userId: me.id, action: 'invoice.create', entityType: 'Invoice', entityId: invoice.id, meta: { total } });
  return ok(invoice, 201);
});
