'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Wifi, Loader2, Mail, Lock, Eye, EyeOff,
  Users2, ReceiptText, MapPin, ShieldCheck,
} from 'lucide-react';

const FEATURES = [
  { icon: Users2, title: 'Customer CRM', desc: 'Profiles, KYC & full history' },
  { icon: ReceiptText, title: 'Billing & Payments', desc: 'Invoices, collections & reports' },
  { icon: MapPin, title: 'Field Operations', desc: 'Tasks, attendance & live tracking' },
  { icon: ShieldCheck, title: 'Role-based Access', desc: 'Secure, audited, multi-role' },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError('Invalid email or password.');
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* ── Left brand panel (desktop) ── */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-16 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl" />

        <div className="relative flex items-center gap-3 text-white">
          <div className="rounded-2xl bg-white/15 p-2.5 backdrop-blur">
            <Wifi className="h-7 w-7" />
          </div>
          <span className="text-lg font-bold tracking-tight">ISP Management</span>
        </div>

        <div className="relative text-white">
          <h1 className="text-4xl font-bold leading-tight">
            Run your ISP &amp; Cable<br />operations from one place.
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Customers, billing, complaints, field staff, inventory and outages —
            unified in a fast, secure, mobile-friendly platform.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <f.icon className="h-6 w-6 text-white" />
                <p className="mt-2 font-semibold text-white">{f.title}</p>
                <p className="text-sm text-white/70">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-white/60">© {new Date().getFullYear()} ISP Management. All rights reserved.</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-sm">
          {/* mobile logo */}
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-3 rounded-2xl bg-brand-600 p-3 text-white shadow-lg shadow-brand-600/30">
              <Wifi className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold">ISP Management</h1>
          </div>

          <div className="mb-6 hidden lg:block">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your account to continue</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-300">
                {error}
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  className="input pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-slate-400" />
                <input
                  type={show ? 'text' : 'password'}
                  className="input pl-10 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-2 top-2 rounded p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5 text-base shadow-lg shadow-brand-600/20" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Sign In
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            Secured with role-based access control.
          </p>
        </div>
      </div>
    </div>
  );
}
