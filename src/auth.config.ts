import type { NextAuthConfig } from 'next-auth';
import type { Role } from '@prisma/client';

/**
 * Edge-safe Auth.js configuration.
 *
 * This file is imported by `middleware.ts` which runs on the Edge runtime,
 * so it must NOT import Prisma, bcrypt, or any Node-only modules. The actual
 * Credentials provider (which needs those) lives in `src/auth.ts`.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  trustHost: true,
  providers: [], // real providers are added in src/auth.ts
  callbacks: {
    // Persist role + id onto the JWT.
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.role = user.role;
        token.picture = user.image ?? null;
      }
      return token;
    },
    // Expose role + id on the session object.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
    // Route protection used by middleware.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isPublic =
        pathname === '/' ||
        pathname.startsWith('/login') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/api/auth') ||
        pathname.startsWith('/manifest') ||
        pathname.startsWith('/sw.js') ||
        pathname.startsWith('/icons');

      if (isPublic) return true;
      return isLoggedIn;
    },
  },
} satisfies NextAuthConfig;
