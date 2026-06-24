import type { Role } from '@prisma/client';
import {
  LayoutDashboard,
  Users2,
  ClipboardList,
  AlertCircle,
  Receipt,
  Layers,
  CloudOff,
  Boxes,
  Package,
  CalendarCheck,
  MapPin,
  Wallet,
  Star,
  FileBarChart,
  LineChart,
  Users,
  ScrollText,
  UserCircle,
} from 'lucide-react';

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
};

// Role groups
const ALL: Role[] = ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'ACCOUNTANT', 'CALL_CENTER', 'TECHNICIAN'];
const ADMINS: Role[] = ['SUPER_ADMIN', 'ADMIN'];
const OPS: Role[] = ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER']; // operations managers
const BILLING: Role[] = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'];
const CRM: Role[] = ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'ACCOUNTANT', 'CALL_CENTER'];
const FIELD: Role[] = ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'TECHNICIAN'];

export const NAV_ITEMS: NavItem[] = [
  // Daily essentials first
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ALL },
  { href: '/complaints', label: 'Complaints', icon: AlertCircle, roles: [...FIELD, 'CALL_CENTER'] },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL },
  // CRM & sales
  { href: '/customers', label: 'Customers', icon: Users2, roles: CRM },
  { href: '/plans', label: 'Plans & Packages', icon: Layers, roles: ADMINS },
  { href: '/billing', label: 'Billing', icon: Receipt, roles: BILLING },
  // Field operations
  { href: '/tasks', label: 'Field Work', icon: ClipboardList, roles: FIELD },
  { href: '/tracking', label: 'Live Map', icon: MapPin, roles: OPS },
  { href: '/materials', label: 'Materials', icon: Package, roles: FIELD },
  { href: '/expenses', label: 'Expenses', icon: Wallet, roles: FIELD },
  // Network & inventory
  { href: '/outages', label: 'Outages', icon: CloudOff, roles: OPS },
  { href: '/assets', label: 'Assets', icon: Boxes, roles: OPS },
  // Insights
  { href: '/feedback', label: 'Feedback', icon: Star, roles: ALL },
  { href: '/reports', label: 'Reports', icon: FileBarChart, roles: [...OPS, 'ACCOUNTANT'] },
  { href: '/analytics', label: 'Analytics', icon: LineChart, roles: OPS },
  // Administration
  { href: '/users', label: 'Users', icon: Users, roles: ADMINS },
  { href: '/audit', label: 'Audit Logs', icon: ScrollText, roles: ['SUPER_ADMIN'] },
  { href: '/profile', label: 'Profile', icon: UserCircle, roles: ALL },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}
