import { Prisma, CustomerEventType } from '@prisma/client';
import { handle, ok, fail, parseListQuery, paginated } from '@/lib/api';
import { requireUser } from '@/lib/rbac';
import { canManageCustomers } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createCustomerSchema } from '@/lib/validators';
import { generateCode } from '@/lib/utils';
import { uploadDataUrl } from '@/lib/uploads';
import { logActivity } from '@/lib/activity';

export const GET = handle(async (req: Request) => {
  await requireUser();
  const { search, status, skip, take, page, perPage } = parseListQuery(req.url);
  const { searchParams } = new URL(req.url);
  const area = searchParams.get('area');
  const connectionType = searchParams.get('connectionType');

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
    ...(status ? { status: status as never } : {}),
    ...(area ? { area } : {}),
    ...(connectionType ? { connectionType: connectionType as never } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
            { area: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        subscriptions: {
          where: { status: 'ACTIVE' },
          take: 1,
          include: { plan: { select: { name: true } }, package: { select: { name: true } } },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return ok(paginated(items, total, page, perPage));
});

// Create a customer — Super Admin, Admin, or Call Center.
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  if (!canManageCustomers(me.role)) {
    return fail(403, 'You do not have permission to create customers.');
  }
  const body = createCustomerSchema.parse(await req.json());

  // Upload KYC images if provided as data URLs.
  const code = generateCode('CUST');
  const [aadhaarUrl, panUrl, photoUrl] = await Promise.all([
    body.aadhaar?.startsWith('data:') ? uploadDataUrl(body.aadhaar, `kyc/${code}`, 'aadhaar') : Promise.resolve(undefined),
    body.pan?.startsWith('data:') ? uploadDataUrl(body.pan, `kyc/${code}`, 'pan') : Promise.resolve(undefined),
    body.photo?.startsWith('data:') ? uploadDataUrl(body.photo, `kyc/${code}`, 'photo') : Promise.resolve(undefined),
  ]);

  const monthlyAmount = await computeMonthly(body.planId, body.packageId);

  const customer = await prisma.customer.create({
    data: {
      code,
      name: body.name,
      mobile: body.mobile,
      altMobile: body.altMobile,
      email: body.email || null,
      address: body.address,
      area: body.area,
      lat: body.lat,
      lng: body.lng,
      connectionType: body.connectionType,
      status: body.status,
      installationDate: body.installationDate ? new Date(body.installationDate) : null,
      activationDate: body.activationDate ? new Date(body.activationDate) : null,
      aadhaarUrl,
      panUrl,
      photo: photoUrl,
      createdById: me.id,
      ...(body.planId || body.packageId
        ? { subscriptions: { create: { planId: body.planId || null, packageId: body.packageId || null, monthlyAmount } } }
        : {}),
      events: { create: { type: CustomerEventType.CREATED, title: 'Customer created', actorId: me.id } },
    },
  });

  await logActivity({ userId: me.id, action: 'customer.create', entityType: 'Customer', entityId: customer.id, meta: { code } });
  return ok(customer, 201);
});

/** Sum the monthly cost of the chosen plan + package. */
async function computeMonthly(planId?: string | null, packageId?: string | null): Promise<number> {
  let total = 0;
  if (planId) {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    total += Number(plan?.monthlyCost ?? 0);
  }
  if (packageId) {
    const pkg = await prisma.package.findUnique({ where: { id: packageId } });
    total += Number(pkg?.price ?? 0);
  }
  return total;
}
