'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/client';
import { Card, Spinner, EmptyState } from '@/components/ui';
import { humanize } from '@/lib/labels';

type Log = { id: string; action: string; entityType?: string | null; ip?: string | null; createdAt: string; user?: { name: string; role: string } | null };

export default function AuditPage() {
  const [items, setItems] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ items: Log[] }>('/api/activity-logs?perPage=100').then((d) => { setItems(d.items); setLoading(false); });
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Audit Logs</h1>
      {loading ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        : items.length === 0 ? <Card><EmptyState title="No activity logged" /></Card> : (
          <div className="table-wrap bg-white dark:bg-slate-900">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr><th className="th">When</th><th className="th">User</th><th className="th">Action</th><th className="th">Entity</th><th className="th">IP</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((l) => (
                  <tr key={l.id}>
                    <td className="td whitespace-nowrap text-xs">{new Date(l.createdAt).toLocaleString()}</td>
                    <td className="td">{l.user?.name ?? 'System'}</td>
                    <td className="td font-medium">{humanize(l.action.replaceAll('.', ' '))}</td>
                    <td className="td">{l.entityType ?? '—'}</td>
                    <td className="td text-xs text-slate-400">{l.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
