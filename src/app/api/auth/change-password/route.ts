import bcrypt from 'bcryptjs';
import { handle, ok } from '@/lib/api';
import { requireUser, ApiError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { changePasswordSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const body = changePasswordSchema.parse(await req.json());

  const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const valid = await bcrypt.compare(body.currentPassword, dbUser.passwordHash);
  if (!valid) {
    throw new ApiError(422, 'Current password is incorrect.');
  }

  const passwordHash = await bcrypt.hash(body.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  await logActivity({ userId: user.id, action: 'password.change' });
  return ok({ message: 'Password updated successfully.' });
});
