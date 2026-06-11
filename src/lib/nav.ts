import type { Role } from '@prisma/client';
import {
  LayoutDashboard,
  ClipboardList,
  AlertCircle,
  CalendarCheck,
  MapPin,
  Boxes,
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

const ALL: Role[] = ['SUPER_ADMIN', 'TEAM_LEADER', 'TECHNICIAN'];
const MANAGERS: Role[] = ['SUPER_ADMIN', 'TEAM_LEADER'];
const ADMIN: Role[] = ['SUPER_ADMIN'];

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ALL },
  { href: '/tasks', label: 'Tasks', icon: ClipboardList, roles: ALL },
  { href: '/complaints', label: 'Complaints', icon: AlertCircle, roles: ALL },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ALL },
  { href: '/tracking', label: 'Live Map', icon: MapPin, roles: MANAGERS },
  { href: '/materials', label: 'Materials', icon: Boxes, roles: ALL },
  { href: '/expenses', label: 'Expenses', icon: Wallet, roles: ALL },
  { href: '/feedback', label: 'Feedback', icon: Star, roles: ALL },
  { href: '/reports', label: 'Reports', icon: FileBarChart, roles: MANAGERS },
  { href: '/analytics', label: 'Analytics', icon: LineChart, roles: MANAGERS },
  { href: '/users', label: 'Users', icon: Users, roles: MANAGERS },
  { href: '/audit', label: 'Audit Logs', icon: ScrollText, roles: ADMIN },
  { href: '/profile', label: 'Profile', icon: UserCircle, roles: ALL },
];

export function navForRole(role: Role): NavItem[] {
  return NAV_ITEMS.filter((i) => i.roles.includes(role));
}
