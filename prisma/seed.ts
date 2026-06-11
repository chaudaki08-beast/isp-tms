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
  ConnectionType,
  CustomerStatus,
  CustomerEventType,
  InvoiceStatus,
  PaymentMethod,
  OutageStatus,
  AssetType,
  AssetStatus,
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

  const adminUser = await prisma.user.upsert({
    where: { email: 'manager@isp-tms.local' },
    update: {},
    create: { employeeCode: 'EMP-0003', name: 'Anand Mehta', email: 'manager@isp-tms.local', mobile: '+919000000003', passwordHash, role: Role.ADMIN },
  });

  const accountant = await prisma.user.upsert({
    where: { email: 'accounts@isp-tms.local' },
    update: {},
    create: { employeeCode: 'EMP-0004', name: 'Pooja Shah', email: 'accounts@isp-tms.local', mobile: '+919000000004', passwordHash, role: Role.ACCOUNTANT },
  });

  const callCenter = await prisma.user.upsert({
    where: { email: 'callcenter@isp-tms.local' },
    update: {},
    create: { employeeCode: 'EMP-0005', name: 'Neha Gupta', email: 'callcenter@isp-tms.local', mobile: '+919000000005', passwordHash, role: Role.CALL_CENTER },
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

  // ── Plans & Packages ─────────────────────────────────────────────────────
  const planBasic = await prisma.plan.upsert({
    where: { id: 'seed-plan-basic' },
    update: {},
    create: { id: 'seed-plan-basic', name: 'Home 50 Mbps', speedMbps: 50, fup: 'Unlimited', monthlyCost: 499, validityDays: 30 },
  });
  const planPro = await prisma.plan.upsert({
    where: { id: 'seed-plan-pro' },
    update: {},
    create: { id: 'seed-plan-pro', name: 'Pro 200 Mbps', speedMbps: 200, fup: 'Unlimited', monthlyCost: 999, validityDays: 30 },
  });
  const packSports = await prisma.package.upsert({
    where: { id: 'seed-pack-sports' },
    update: {},
    create: { id: 'seed-pack-sports', name: 'Sports + Entertainment', channels: '250+ channels incl. sports & HD', price: 300 },
  });

  // ── Customers ────────────────────────────────────────────────────────────
  const cust1 = await prisma.customer.upsert({
    where: { code: 'CUST-0001' },
    update: {},
    create: {
      code: 'CUST-0001', name: 'Meena Iyer', mobile: '+919812345678', email: 'meena@example.com',
      address: '14, MG Road, Indiranagar, Bengaluru', area: 'Indiranagar', lat: 12.9719, lng: 77.6412,
      connectionType: ConnectionType.FIBER, status: CustomerStatus.ACTIVE,
      installationDate: new Date('2025-01-10'), activationDate: new Date('2025-01-11'),
      createdById: callCenter.id,
      subscriptions: { create: { planId: planPro.id, packageId: packSports.id, monthlyAmount: 1299 } },
      events: { create: [{ type: CustomerEventType.CREATED, title: 'Customer onboarded', actorId: callCenter.id }] },
    },
  });
  const cust2 = await prisma.customer.upsert({
    where: { code: 'CUST-0002' },
    update: {},
    create: {
      code: 'CUST-0002', name: 'Rohit Gupta', mobile: '+919765432100',
      address: '5, HSR Layout Sector 2, Bengaluru', area: 'HSR Layout',
      connectionType: ConnectionType.CABLE, status: CustomerStatus.ACTIVE,
      installationDate: new Date('2025-03-05'),
      createdById: adminUser.id,
      subscriptions: { create: { planId: planBasic.id, monthlyAmount: 499 } },
      events: { create: [{ type: CustomerEventType.CREATED, title: 'Customer onboarded', actorId: adminUser.id }] },
    },
  });

  // ── Invoice + Payment ────────────────────────────────────────────────────
  const dueDate = new Date(); dueDate.setDate(dueDate.getDate() + 7);
  const invoice = await prisma.invoice.upsert({
    where: { number: 'INV-2026-0001' },
    update: {},
    create: {
      number: 'INV-2026-0001', customerId: cust1.id, dueDate,
      subtotal: 1299, tax: 0, total: 1299, status: InvoiceStatus.PENDING, createdById: accountant.id,
      items: { create: [{ description: 'Pro 200 Mbps + Sports package (monthly)', quantity: 1, unitPrice: 1299, amount: 1299 }] },
    },
  });
  await prisma.payment.create({
    data: { customerId: cust2.id, amount: 499, method: PaymentMethod.UPI, reference: 'UPI-TXN-0001', receivedById: accountant.id },
  });

  // ── Outage ───────────────────────────────────────────────────────────────
  await prisma.outage.create({
    data: { area: 'HSR Layout', reason: 'Fiber cut near main junction', status: OutageStatus.ACTIVE, affectedCount: 42, createdById: adminUser.id, notifiedChannels: ['SMS', 'WHATSAPP'] },
  });

  // ── Assets ───────────────────────────────────────────────────────────────
  await prisma.asset.createMany({
    data: [
      { type: AssetType.ONT, serialNo: 'ONT-SN-1001', macAddress: 'AA:BB:CC:00:11:22', model: 'GPON-ONT-X1', status: AssetStatus.ASSIGNED, assignedCustomerId: cust1.id, assignedAt: new Date() },
      { type: AssetType.SET_TOP_BOX, serialNo: 'STB-SN-2001', macAddress: 'AA:BB:CC:33:44:55', model: 'HD-STB-200', status: AssetStatus.AVAILABLE },
      { type: AssetType.ROUTER, serialNo: 'RTR-SN-3001', model: 'DualBand-AC1200', status: AssetStatus.AVAILABLE },
    ],
    skipDuplicates: true,
  });

  void invoice;

  console.log('✅ Seed complete.');
  console.log('   Super Admin:  admin@isp-tms.local / password123');
  console.log('   Admin:        manager@isp-tms.local / password123');
  console.log('   Team Leader:  leader@isp-tms.local / password123');
  console.log('   Accountant:   accounts@isp-tms.local / password123');
  console.log('   Call Center:  callcenter@isp-tms.local / password123');
  console.log('   Technician:   tech1@isp-tms.local / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
