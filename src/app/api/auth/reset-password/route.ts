import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { handle, ok } from '@/lib/api';
import { ApiError } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { resetPasswordSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

export const POST = handle(async (req: Request) => {
  const { token, password } = resetPasswordSchema.parse(await req.json());

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ApiError(422, 'This reset link is invalid or has expired.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await logActivity({ userId: record.userId, action: 'password.reset' });
  return ok({ message: 'Password has been reset. You can now sign in.' });
});
