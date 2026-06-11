import { handle, ok } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { profileSchema } from '@/lib/validators';
import { uploadDataUrl } from '@/lib/uploads';
import { logActivity } from '@/lib/activity';

export const GET = handle(async () => {
  const user = await requireUser();
  const profile = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      address: true,
      role: true,
      status: true,
      profilePhoto: true,
      employeeCode: true,
      technicianProfile: true,
      teamLeader: { select: { id: true, name: true } },
    },
  });
  return ok(profile);
});

export const PUT = handle(async (req: Request) => {
  const user = await requireUser();
  const body = profileSchema.parse(await req.json());

  let profilePhoto = body.profilePhoto;
  if (profilePhoto?.startsWith('data:')) {
    profilePhoto = await uploadDataUrl(profilePhoto, 'profiles', user.id);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: body.name,
      mobile: body.mobile,
      address: body.address,
      fcmToken: body.fcmToken,
      ...(profilePhoto ? { profilePhoto } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      mobile: true,
      address: true,
      profilePhoto: true,
    },
  });

  await logActivity({ userId: user.id, action: 'profile.update' });
  return ok(updated);
});
