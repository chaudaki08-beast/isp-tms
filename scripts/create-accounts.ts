/**
 * One-off: create/upsert user accounts.
 * Run with:  npx tsx scripts/create-accounts.ts
 */
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const accounts: { name: string; email: string; role: Role }[] = [
  { name: 'Priti', email: 'priti@isp.com', role: Role.ADMIN },
  { name: 'Nikita', email: 'nikita@isp.com', role: Role.ADMIN },
  { name: 'Haji', email: 'haji@isp.com', role: Role.TECHNICIAN },
  { name: 'SBCable', email: 'sbcable@isp.com', role: Role.SUPER_ADMIN },
];

// Per-user default password: lowercase first name + "@246" (e.g. priti@246).
const passwordFor = (name: string) => `${name.toLowerCase()}@246`;

async function main() {
  for (const a of accounts) {
    const password = passwordFor(a.name);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { name: a.name, role: a.role, status: 'ACTIVE', passwordHash },
      create: {
        name: a.name,
        email: a.email.toLowerCase(),
        passwordHash,
        role: a.role,
        ...(a.role === Role.TECHNICIAN ? { technicianProfile: { create: {} } } : {}),
      },
    });
    console.log(`✅ ${a.role.padEnd(11)} ${a.email}  →  password: ${password}  (id: ${user.id})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
