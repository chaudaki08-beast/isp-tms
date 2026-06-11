'use client';

import { signOut } from 'next-auth/react';
import { Menu, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationsBell } from '@/components/NotificationsBell';
import { humanize } from '@/lib/labels';

export function Topbar({
  onMenu,
  user,
}: {
  onMenu: () => void;
  user: { name?: string | null; role: string };
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex items-center gap-2">
        <button onClick={onMenu} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <p className="text-sm font-semibold leading-tight">{user.name}</p>
          <p className="text-xs text-slate-500">{humanize(user.role)}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <NotificationsBell />
        <ThemeToggle />
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
