/**
 * Database seeder — creates demo accounts and sample operational data.
 * Run with:  npm run db:seed
 *
 * Demo credentials (all password: "password123"):
 *   Super Admin   → admin@isp-tms.local
 *   Team Leader   → leader@isp-tms.local
 *   Technician    → tech1@isp-tms.local / tech2@isp-tms.local / tech3@isp-tms.local
 */
import {
  PrismaClient,
  Role,
  MaterialCategory,
  TaskType,
  TaskStatus,
  Priority,
  ComplaintCategory,
  ComplaintStatus,
  ExpenseType,
  ApprovalStatus,
  AttendanceStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Users ──────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: 'admin@isp-tms.local' },
    update: {},
    create: {
      employeeCode: 'EMP-0001',
      name: 'Super Admin',
      email: 'admin@isp-tms.local',
      mobile: '+919000000001',
      passwordHash,
      role: Role.SUPER_ADMIN,
      address: 'HQ, Bengaluru',
    },
  });

  const leader = await prisma.user.upsert({
    where: { email: 'leader@isp-tms.local' },
    update: {},
    create: {
      employeeCode: 'EMP-0002',
      name: 'Ravi Kumar',
      email: 'leader@isp-tms.local',
      mobile: '+919000000002',
      passwordHash,
      role: Role.TEAM_LEADER,
      address: 'Zone North',
    },
  });

  const techSeed = [
    { code: 'EMP-1001', name: 'Amit Sharma', email: 'tech1@isp-tms.local', mobile: '+919000001001' },
    { code: 'EMP-1002', name: 'Sunil Verma', email: 'tech2@isp-tms.local', mobile: '+919000001002' },
    { code: 'EMP-1003', name: 'Priya Nair', email: 'tech3@isp-tms.local', mobile: '+919000001003' },
  ];

  const technicians = [];
  for (const t of techSeed) {
    const tech = await prisma.user.upsert({
      where: { email: t.email },
      update: {},
      create: {
        employeeCode: t.code,
        name: t.name,
        email: t.email,
        mobile: t.mobile,
        passwordHash,
        role: Role.TECHNICIAN,
        teamLeaderId: leader.id,
        technicianProfile: {
          create: {
            skillSet: 'Fiber, Router, Cabling',
            vehicleNo: 'KA-01-AB-' + Math.floor(1000 + Math.random() * 8999),
            baseLat: 12.9716,
            baseLng: 77.5946,
            joiningDate: new Date('2024-01-15'),
          },
        },
      },
    });
    technicians.push(tech);
  }

  // ── Materials ──────────────────────────────────────────────────────────
  const materials = [
    { name: 'Dual-band WiFi Router', sku: 'RTR-001', category: MaterialCategory.ROUTER, totalStock: 120, reorderLevel: 20 },
    { name: 'GPON ONU Device', sku: 'ONU-001', category: MaterialCategory.ONU, totalStock: 90, reorderLevel: 15 },
    { name: 'Single-mode Fiber Cable (mtr)', sku: 'FBR-001', category: MaterialCategory.FIBER_CABLE, unit: 'mtr', totalStock: 5000, reorderLevel: 500 },
    { name: 'RJ45 Connector', sku: 'RJ45-001', category: MaterialCategory.RJ45_CONNECTOR, totalStock: 2000, reorderLevel: 200 },
    { name: '12V Power Adapter', sku: 'PWR-001', category: MaterialCategory.POWER_ADAPTER, totalStock: 150, reorderLevel: 25 },
  ];
  for (const m of materials) {
    await prisma.material.upsert({
      where: { sku: m.sku },
      update: {},
      create: m,
    });
  }
  const routerMaterial = await prisma.material.findUnique({ where: { sku: 'RTR-001' } });

  // ── Material assignment ────────────────────────────────────────────────
  if (routerMaterial) {
    await prisma.materialAssignment.create({
      data: {
        materialId: routerMaterial.id,
        technicianId: technicians[0].id,
        assignedById: leader.id,
        assignedQty: 5,
        usedQty: 2,
      },
    });
  }

  // ── Tasks ──────────────────────────────────────────────────────────────
  await prisma.task.createMany({
    data: [
      {
        code: 'TSK-1001',
        customerName: 'Meena Iyer',
        customerMobile: '+919812345678',
        address: '14, MG Road, Indiranagar, Bengaluru',
        lat: 12.9719,
        lng: 77.6412,
        type: TaskType.NEW_INSTALLATION,
        description: 'New 100Mbps fiber connection install.',
        priority: Priority.HIGH,
        status: TaskStatus.ASSIGNED,
        assignedToId: technicians[0].id,
        createdById: admin.id,
        assignedDate: new Date(),
      },
      {
        code: 'TSK-1002',
        customerName: 'Karthik Rao',
        customerMobile: '+919898989898',
        address: '7, Jayanagar 4th Block, Bengaluru',
        lat: 12.925,
        lng: 77.5938,
        type: TaskType.ROUTER_REPLACEMENT,
        description: 'Replace faulty router.',
        priority: Priority.MEDIUM,
        status: TaskStatus.IN_PROGRESS,
        assignedToId: technicians[1].id,
        createdById: leader.id,
        assignedDate: new Date(),
        startedAt: new Date(),
      },
      {
        code: 'TSK-1003',
        customerName: 'Anita Desai',
        customerMobile: '+919777777777',
        address: '22, Koramangala 5th Block, Bengaluru',
        type: TaskType.SITE_SURVEY,
        description: 'Feasibility survey for new building.',
        priority: Priority.LOW,
        status: TaskStatus.PENDING,
        createdById: admin.id,
      },
    ],
    skipDuplicates: true,
  });

  // ── Complaints ─────────────────────────────────────────────────────────
  await prisma.complaint.createMany({
    data: [
      {
        code: 'CMP-2001',
        customerName: 'Rohit Gupta',
        customerMobile: '+919765432100',
        address: '5, HSR Layout Sector 2, Bengaluru',
        category: ComplaintCategory.NO_INTERNET,
        description: 'Complete outage since morning.',
        status: ComplaintStatus.ASSIGNED,
        assignedToId: technicians[2].id,
        createdById: admin.id,
      },
      {
        code: 'CMP-2002',
        customerName: 'Sneha Pillai',
        customerMobile: '+919711111111',
        address: '9, Whitefield, Bengaluru',
        category: ComplaintCategory.SLOW_SPEED,
        description: 'Speed dropped to 5Mbps on 100Mbps plan.',
        status: ComplaintStatus.OPEN,
        createdById: leader.id,
      },
    ],
    skipDuplicates: true,
  });

  // ── Attendance (today, for tech1) ──────────────────────────────────────
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  await prisma.attendance.upsert({
    where: { userId_date: { userId: technicians[0].id, date: today } },
    update: {},
    create: {
      userId: technicians[0].id,
      date: today,
      checkInAt: new Date(),
      checkInLat: 12.9716,
      checkInLng: 77.5946,
      status: AttendanceStatus.PRESENT,
      lateMinutes: 0,
    },
  });

  // ── Expenses ───────────────────────────────────────────────────────────
  await prisma.expense.create({
    data: {
      userId: technicians[0].id,
      type: ExpenseType.FUEL,
      amount: 350.0,
      description: 'Fuel for field visits',
      expenseDate: today,
      status: ApprovalStatus.PENDING,
    },
  });

  // ── Feedback ───────────────────────────────────────────────────────────
  await prisma.feedback.create({
    data: {
      technicianId: technicians[1].id,
      customerName: 'Karthik Rao',
      rating: 5,
      comment: 'Quick and professional service.',
    },
  });
  // Reflect rating on the technician profile.
  await prisma.technicianProfile.updateMany({
    where: { userId: technicians[1].id },
    data: { ratingAvg: 5, ratingCount: 1 },
  });

  console.log('✅ Seed complete.');
  console.log('   Super Admin: admin@isp-tms.local / password123');
  console.log('   Team Leader: leader@isp-tms.local / password123');
  console.log('   Technician:  tech1@isp-tms.local / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
