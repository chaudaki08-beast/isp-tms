import type { NextAuthConfig } from 'next-auth';

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
        // @ts-expect-error custom field set in authorize()
        token.role = user.role;
        // @ts-expect-error custom field set in authorize()
        token.picture = user.image ?? null;
      }
      return token;
    },
    // Expose role + id on the session object.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        // @ts-expect-error augmented in next-auth.d.ts
        session.user.role = token.role;
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
