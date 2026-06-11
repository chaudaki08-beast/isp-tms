import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────────────
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

export const profileSchema = z.object({
  name: z.string().min(2).optional(),
  mobile: z.string().min(6).max(20).optional(),
  address: z.string().max(255).optional(),
  profilePhoto: z.string().optional(), // data URL or existing URL
  fcmToken: z.string().optional(),
});

// ── Users (admin) ─────────────────────────────────────────────────────────
export const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  mobile: z.string().min(6).max(20).optional(),
  password: z.string().min(8),
  role: z.enum(['SUPER_ADMIN', 'TEAM_LEADER', 'TECHNICIAN']),
  employeeCode: z.string().optional(),
  teamLeaderId: z.string().optional().nullable(),
  address: z.string().optional(),
});

export const updateUserSchema = createUserSchema.partial().extend({
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  password: z.string().min(8).optional(),
});

// ── Attendance ────────────────────────────────────────────────────────────
export const checkInSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  selfie: z.string().optional(), // data URL
});

export const checkOutSchema = checkInSchema;

// ── Tasks ─────────────────────────────────────────────────────────────────
export const taskTypeEnum = z.enum([
  'NEW_INSTALLATION',
  'COMPLAINT_VISIT',
  'FIBER_REPAIR',
  'ROUTER_REPLACEMENT',
  'CABLE_MAINTENANCE',
  'SITE_SURVEY',
]);

export const taskStatusEnum = z.enum([
  'PENDING',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'COMPLETED',
  'CANCELLED',
]);

export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const createTaskSchema = z.object({
  customerName: z.string().min(2),
  customerMobile: z.string().min(6),
  address: z.string().min(3),
  lat: z.number().optional(),
  lng: z.number().optional(),
  type: taskTypeEnum,
  description: z.string().optional(),
  priority: priorityEnum.default('MEDIUM'),
  assignedToId: z.string().optional().nullable(),
  scheduledAt: z.string().datetime().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
});

// ── Complaints ────────────────────────────────────────────────────────────
export const complaintCategoryEnum = z.enum([
  'NO_INTERNET',
  'SLOW_SPEED',
  'ROUTER_ISSUE',
  'FIBER_CUT',
  'BILLING_ISSUE',
  'SIGNAL_PROBLEM',
]);

export const complaintStatusEnum = z.enum([
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
]);

export const createComplaintSchema = z.object({
  customerName: z.string().min(2),
  customerMobile: z.string().min(6),
  address: z.string().min(3),
  category: complaintCategoryEnum,
  description: z.string().optional(),
  assignedToId: z.string().optional().nullable(),
});

export const updateComplaintSchema = z.object({
  status: complaintStatusEnum.optional(),
  assignedToId: z.string().optional().nullable(),
  description: z.string().optional(),
});

// ── GPS ───────────────────────────────────────────────────────────────────
export const gpsPingSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().optional(),
  speed: z.number().optional(),
});

// ── Task images ───────────────────────────────────────────────────────────
export const imageTypeEnum = z.enum([
  'BEFORE_POLE',
  'BEFORE_FIBER',
  'BEFORE_SITE',
  'AFTER_ROUTER',
  'AFTER_SPEEDTEST',
  'AFTER_SITE',
  'OTHER',
]);

export const uploadImageSchema = z.object({
  type: imageTypeEnum,
  image: z.string().min(10), // data URL
  caption: z.string().optional(),
});

// ── Signature ─────────────────────────────────────────────────────────────
export const signatureSchema = z.object({
  customerName: z.string().min(2),
  signature: z.string().min(10), // data URL
});

// ── Materials ─────────────────────────────────────────────────────────────
export const materialCategoryEnum = z.enum([
  'ROUTER',
  'ONU',
  'FIBER_CABLE',
  'RJ45_CONNECTOR',
  'POWER_ADAPTER',
  'OTHER',
]);

export const createMaterialSchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  category: materialCategoryEnum,
  unit: z.string().default('pcs'),
  totalStock: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(0),
});

export const assignMaterialSchema = z.object({
  materialId: z.string(),
  technicianId: z.string(),
  taskId: z.string().optional().nullable(),
  assignedQty: z.number().int().min(1),
});

export const updateMaterialUsageSchema = z.object({
  usedQty: z.number().int().min(0),
});

// ── Expenses ──────────────────────────────────────────────────────────────
export const expenseTypeEnum = z.enum([
  'FUEL',
  'TRAVEL',
  'MATERIAL_PURCHASE',
  'MISCELLANEOUS',
]);

export const createExpenseSchema = z.object({
  type: expenseTypeEnum,
  amount: z.number().positive(),
  description: z.string().optional(),
  expenseDate: z.string(), // yyyy-mm-dd
  receipt: z.string().optional(), // data URL
  taskId: z.string().optional().nullable(),
});

export const reviewExpenseSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewComment: z.string().optional(),
});

// ── Feedback ──────────────────────────────────────────────────────────────
export const createFeedbackSchema = z.object({
  taskId: z.string().optional().nullable(),
  complaintId: z.string().optional().nullable(),
  technicianId: z.string(),
  customerName: z.string().min(2),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});
