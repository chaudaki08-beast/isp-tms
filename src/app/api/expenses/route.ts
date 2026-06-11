import { Prisma, Role } from '@prisma/client';
import { handle, ok, parseListQuery, paginated } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createExpenseSchema } from '@/lib/validators';
import { uploadDataUrl } from '@/lib/uploads';
import { logActivity } from '@/lib/activity';

export const GET = handle(async (req: Request) => {
  const me = await requireUser();
  const { status, skip, take, page, perPage } = parseListQuery(req.url);

  const where: Prisma.ExpenseWhereInput = {
    deletedAt: null,
    ...(me.role === Role.TECHNICIAN
      ? { userId: me.id }
      : me.role === Role.TEAM_LEADER
      ? { user: { teamLeaderId: me.id } }
      : {}),
    ...(status ? { status: status as never } : {}),
  };

  const [items, total, totals] = await Promise.all([
    prisma.expense.findMany({
      where,
      skip,
      take,
      orderBy: { expenseDate: 'desc' },
      include: { user: { select: { id: true, name: true } }, task: { select: { id: true, code: true } } },
    }),
    prisma.expense.count({ where }),
    prisma.expense.groupBy({ by: ['status'], _sum: { amount: true }, where }),
  ]);

  return ok({
    ...paginated(items, total, page, perPage),
    summary: Object.fromEntries(totals.map((t) => [t.status, Number(t._sum.amount ?? 0)])),
  });
});

// Technician submits an expense with optional receipt image.
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  const body = createExpenseSchema.parse(await req.json());

  let receiptUrl: string | undefined;
  if (body.receipt?.startsWith('data:')) {
    receiptUrl = await uploadDataUrl(body.receipt, 'receipts', me.id);
  }

  const expense = await prisma.expense.create({
    data: {
      userId: me.id,
      type: body.type,
      amount: body.amount,
      description: body.description,
      expenseDate: new Date(body.expenseDate),
      receiptUrl,
      taskId: body.taskId || null,
    },
  });

  await logActivity({ userId: me.id, action: 'expense.create', entityType: 'Expense', entityId: expense.id, meta: { amount: body.amount } });
  return ok(expense, 201);
});
