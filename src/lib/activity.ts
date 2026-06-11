import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';

/**
 * Fire-and-forget audit log writer. Never throws into the request path —
 * a logging failure must not break the business action.
 */
export async function logActivity(params: {
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    const h = await headers();
    const ip =
      h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      h.get('x-real-ip') ||
      null;
    const userAgent = h.get('user-agent') || null;

    await prisma.activityLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        meta: params.meta as object | undefined,
        ip,
        userAgent,
      },
    });
  } catch (err) {
    console.error('[activity-log] failed:', err);
  }
}
