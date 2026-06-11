import { NotificationType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Persist an in-app notification and (best-effort) push it via Firebase Cloud
 * Messaging if the recipient has an fcmToken and FCM is configured.
 */
export async function notify(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}) {
  const record = await prisma.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      data: params.data as object | undefined,
    },
  });

  // Best-effort push — never block the request on FCM.
  void sendFcm(params.userId, params.title, params.body, params.data).catch(
    (e) => console.error('[fcm] push failed:', e)
  );

  return record;
}

async function sendFcm(
  userId: string,
  title: string,
  body?: string,
  data?: Record<string, unknown>
) {
  const serverKey = process.env.FIREBASE_SERVER_KEY;
  if (!serverKey) return; // FCM not configured — no-op (future-ready).

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });
  if (!user?.fcmToken) return;

  await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${serverKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: user.fcmToken,
      notification: { title, body },
      data: data ?? {},
    }),
  });
}

/** Notify every active user holding one of the given roles. */
export async function notifyRoles(
  roles: ('SUPER_ADMIN' | 'TEAM_LEADER' | 'TECHNICIAN')[],
  payload: { type: NotificationType; title: string; body?: string; data?: Record<string, unknown> }
) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, status: 'ACTIVE', deletedAt: null },
    select: { id: true },
  });
  await Promise.all(users.map((u) => notify({ userId: u.id, ...payload })));
}
