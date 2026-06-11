import crypto from 'crypto';
import { handle, ok } from '@/lib/api';
import { prisma } from '@/lib/prisma';
import { forgotPasswordSchema } from '@/lib/validators';

/**
 * Issues a password-reset token. To avoid account enumeration we always return
 * the same response. In production the token would be emailed; here we also
 * return it in dev so it can be tested without a mail server.
 */
export const POST = handle(async (req: Request) => {
  const { email } = forgotPasswordSchema.parse(await req.json());

  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null },
  });

  let devToken: string | undefined;

  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // TODO: send `token` via email (or WhatsApp) with a reset link.
    if (process.env.NODE_ENV !== 'production') {
      devToken = token;
    }
  }

  return ok({
    message: 'If an account exists, a reset link has been sent.',
    ...(devToken ? { devToken } : {}),
  });
});
