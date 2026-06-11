import { Prisma, Role } from '@prisma/client';
import { handle, ok, parseListQuery, paginated } from '@/lib/api';
import { requireUser, requireAtLeast } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';
import { createMaterialSchema } from '@/lib/validators';
import { logActivity } from '@/lib/activity';

export const GET = handle(async (req: Request) => {
  await requireUser();
  const { search, skip, take, page, perPage } = parseListQuery(req.url);
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  const where: Prisma.MaterialWhereInput = {
    deletedAt: null,
    ...(category ? { category: category as never } : {}),
    ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.material.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
    prisma.material.count({ where }),
  ]);

  // Flag items at/under reorder level.
  const withFlags = items.map((m) => ({ ...m, lowStock: m.totalStock <= m.reorderLevel }));
  return ok(paginated(withFlags, total, page, perPage));
});

export const POST = handle(async (req: Request) => {
  const me = await requireAtLeast(Role.TEAM_LEADER);
  const body = createMaterialSchema.parse(await req.json());
  const material = await prisma.material.create({ data: body });
  await logActivity({ userId: me.id, action: 'material.create', entityType: 'Material', entityId: material.id });
  return ok(material, 201);
});
