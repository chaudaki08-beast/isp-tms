import { handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { customerEventSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

// Append a timeline note/event to a customer.
export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const me = await requireUser();
  const { id } = await params;
  const body = customerEventSchema.parse(await req.json());

  const event = await prisma.customerEvent.create({
    data: { customerId: id, type: body.type, title: body.title, description: body.description, actorId: me.id },
  });

  await logActivity({ userId: me.id, action: 'customer.event', entityType: 'Customer', entityId: id });
  return ok(event, 201);
});
