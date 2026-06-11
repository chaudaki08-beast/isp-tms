'use client';

import { useEffect, useState, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/client';
import { humanize } from '@/lib/labels';
import { formatDistanceToNow } from 'date-fns';

type Notification = { id: string; title: string; body?: string | null; readAt?: string | null; createdAt: string };

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ items: Notification[]; unread: number }>('/api/notifications?perPage=10');
      setItems(data.items);
      setUnread(data.unread);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // poll every 30s
    return () => clearInterval(t);
  }, [load]);

  async function markAll() {
    await apiPost('/api/notifications/read', {});
    load();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <span className="font-semibold">Notifications</span>
              {unread > 0 && (
                <button onClick={markAll} className="text-xs text-brand-600 hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications</p>
              ) : (
                items.map((n) => (
                  <div key={n.id} className={`border-b border-slate-100 px-4 py-3 dark:border-slate-800 ${!n.readAt ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}>
                    <p className="text-sm font-medium">{n.title}</p>
                    {n.body && <p className="text-xs text-slate-500">{humanize(n.body)}</p>}
                    <p className="mt-1 text-[11px] text-slate-400">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
