// Human labels + badge colour classes for enum values used across the UI.

export const STATUS_COLORS: Record<string, string> = {
  // Task / Complaint statuses
  PENDING: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  OPEN: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  ASSIGNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  IN_PROGRESS: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  RESOLVED: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CLOSED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  // Approval
  APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  // Attendance
  PRESENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  ABSENT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  HALF_DAY: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ON_LEAVE: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

export function humanize(value?: string | null): string {
  if (!value) return '—';
  return value
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const TASK_TYPES = [
  'NEW_INSTALLATION',
  'COMPLAINT_VISIT',
  'FIBER_REPAIR',
  'ROUTER_REPLACEMENT',
  'CABLE_MAINTENANCE',
  'SITE_SURVEY',
];

export const TASK_STATUSES = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'COMPLETED', 'CANCELLED'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
export const COMPLAINT_CATEGORIES = ['NO_INTERNET', 'SLOW_SPEED', 'ROUTER_ISSUE', 'FIBER_CUT', 'BILLING_ISSUE', 'SIGNAL_PROBLEM'];
export const COMPLAINT_STATUSES = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
export const MATERIAL_CATEGORIES = ['ROUTER', 'ONU', 'FIBER_CABLE', 'RJ45_CONNECTOR', 'POWER_ADAPTER', 'OTHER'];
export const EXPENSE_TYPES = ['FUEL', 'TRAVEL', 'MATERIAL_PURCHASE', 'MISCELLANEOUS'];
export const IMAGE_TYPES = ['BEFORE_POLE', 'BEFORE_FIBER', 'BEFORE_SITE', 'AFTER_ROUTER', 'AFTER_SPEEDTEST', 'AFTER_SITE', 'OTHER'];
