import { Role } from '@prisma/client';
import { auth } from '@/auth';

/** Custom error carrying an HTTP status — caught by `handle()` in api.ts. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
};

/** Role ranking for "at least" checks. Higher = more privileged. */
const RANK: Record<Role, number> = {
  TECHNICIAN: 1,
  TEAM_LEADER: 2,
  SUPER_ADMIN: 3,
};

export function roleAtLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

/** Resolve the authenticated user or throw 401. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new ApiError(401, 'Unauthenticated');
  }
  return session.user as SessionUser;
}

/** Require one of the given roles, else throw 403. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action.');
  }
  return user;
}

/** Require at least the given role in the hierarchy. */
export async function requireAtLeast(min: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (!roleAtLeast(user.role, min)) {
    throw new ApiError(403, 'You do not have permission to perform this action.');
  }
  return user;
}

export const isAdmin = (role: Role) => role === Role.SUPER_ADMIN;
export const isManager = (role: Role) => role === Role.SUPER_ADMIN || role === Role.TEAM_LEADER;
