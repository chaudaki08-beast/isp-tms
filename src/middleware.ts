import NextAuth from 'next-auth';
import { authConfig } from '@/auth.config';

// Edge-safe middleware: gates every route through the `authorized` callback.
export default NextAuth(authConfig).auth;

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|.*\\.png$).*)'],
};
