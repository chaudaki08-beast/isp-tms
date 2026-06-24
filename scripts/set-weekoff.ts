import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
// 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu,5=Fri,6=Sat
const map: Record<string, number> = {
  'priti@isp.com': 1,   // Monday
  'nikita@isp.com': 2,  // Tuesday
  'haji@isp.com': 3,    // Wednesday
};
async function main() {
  for (const [email, weekOff] of Object.entries(map)) {
    const u = await prisma.user.updateMany({ where: { email }, data: { weekOff } });
    console.log(`${email} -> weekOff ${weekOff} (${u.count} updated)`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
