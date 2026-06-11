import { handlers } from '@/auth';

// Auth.js (NextAuth v5) catch-all route: handles sign-in, sign-out,
// session, CSRF and the credentials callback.
export const { GET, POST } = handlers;
