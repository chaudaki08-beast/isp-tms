import { Prisma } from '@prisma/client';
import { handle, ok, fail, parseListQuery, paginated } from '@/lib/api';
import { requireUser, isManager } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createAssetSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

export const GET = handle(async (req: Request) => {
  await requireUser();
  const { search, status, skip, take, page, perPage } = parseListQuery(req.url);
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type');

  const where: Prisma.AssetWhereInput = {
    deletedAt: null,
    ...(status ? { status: status as never } : {}),
    ...(type ? { type: type as never } : {}),
    ...(search
      ? {
          OR: [
            { serialNo: { contains: search, mode: 'insensitive' } },
            { macAddress: { contains: search, mode: 'insensitive' } },
            { model: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [items, total, byStatus] = await Promise.all([
    prisma.asset.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: { assignedCustomer: { select: { id: true, code: true, name: true } } },
    }),
    prisma.asset.count({ where }),
    prisma.asset.groupBy({ by: ['status'], _count: true, where: { deletedAt: null } }),
  ]);

  return ok({ ...paginated(items, total, page, perPage), summary: Object.fromEntries(byStatus.map((s) => [s.status, s._count])) });
});

// Add inventory (stock-in) — Super Admin / Admin / Team Leader.
export const POST = handle(async (req: Request) => {
  const me = await requireUser();
  if (!isManager(me.role)) return fail(403, 'Not permitted.');
  const body = createAssetSchema.parse(await req.json());

  const asset = await prisma.asset.create({
    data: {
      type: body.type,
      serialNo: body.serialNo || null,
      macAddress: body.macAddress,
      model: body.model,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      notes: body.notes,
    },
  });

  await logActivity({ userId: me.id, action: 'asset.create', entityType: 'Asset', entityId: asset.id, meta: { type: body.type } });
  return ok(asset, 201);
});
