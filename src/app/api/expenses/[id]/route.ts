import { Role, NotificationType } from '@prisma/client';
import { handle, ok } from '@/lib/api';
import { requireUser, requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { reviewExpenseSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';
import { notify } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await requireUser();
  const { id } = await params;
  const expense = await prisma.expense.findFirstOrThrow({
    where: { id, deletedAt: null },
    include: { user: { select: { id: true, name: true } }, reviewedBy: { select: { id: true, name: true } } },
  });
  return ok(expense);
});

// Manager approves or rejects an expense.
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const { id } = await params;
  const body = reviewExpenseSchema.parse(await req.json());

  const expense = await prisma.expense.update({
    where: { id },
    data: {
      status: body.status,
      reviewComment: body.reviewComment,
      reviewedById: me.id,
      reviewedAt: new Date(),
    },
  });

  await logActivity({ userId: me.id, action: `expense.${body.status.toLowerCase()}`, entityType: 'Expense', entityId: id });

  await notify({
    userId: expense.userId,
    type: NotificationType.EXPENSE_APPROVAL,
    title: `Expense ${body.status.toLowerCase()}`,
    body: body.reviewComment || `Your expense was ${body.status.toLowerCase()}.`,
    data: { expenseId: expense.id },
  });

  return ok(expense);
});
