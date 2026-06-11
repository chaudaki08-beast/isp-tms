'use client';

import { useState } from 'react';
import Link from 'next/link';
import { apiPost } from '@/lib/client';
import { Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await apiPost<{ message: string; devToken?: string }>('/api/auth/forgot-password', { email });
      setMessage(res.message);
      if (res.devToken) setDevToken(res.devToken);
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-600 to-brand-900 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-slate-900">
        <h1 className="text-xl font-bold">Reset your password</h1>
        <p className="mt-1 text-sm text-slate-500">Enter your email and we'll send a reset link.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn-primary w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </button>
        </form>

        {message && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{message}</p>}
        {devToken && (
          <p className="mt-2 break-all rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Dev token (use on <Link className="underline" href={`/reset-password?token=${devToken}`}>reset page</Link>): {devToken}
          </p>
        )}

        <div className="mt-6 text-center text-sm">
          <Link href="/login" className="text-brand-600 hover:underline">Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
