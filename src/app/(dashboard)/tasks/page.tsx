'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Plus, Search } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/client';
import { Card, Spinner, EmptyState, Modal, Field, StatusBadge, PriorityBadge } from '@/components/ui';
import { TASK_TYPES, TASK_STATUSES, PRIORITIES, humanize } from '@/lib/labels';

type Task = {
  id: string; code: string; customerName: string; address: string;
  type: string; status: string; priority: string;
  assignedTo?: { name: string } | null;
};
type Tech = { id: string; name: string };

export default function TasksPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role !== 'TECHNICIAN';

  const [items, setItems] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ perPage: '50' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const data = await apiGet<{ items: Task[] }>(`/api/tasks?${params}`);
    setItems(data.items);
    setLoading(false);
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {isManager && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus className="h-4 w-4" /> New Task
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search code, customer, address…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="No tasks found" hint="Create a task to get started." /></Card>
      ) : (
        <div className="table-wrap bg-white dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="th">Code</th><th className="th">Customer</th><th className="th">Type</th>
                <th className="th">Priority</th><th className="th">Assigned</th><th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td"><Link href={`/tasks/${t.id}`} className="font-medium text-brand-600 hover:underline">{t.code}</Link></td>
                  <td className="td">{t.customerName}<p className="text-xs text-slate-400">{t.address}</p></td>
                  <td className="td">{humanize(t.type)}</td>
                  <td className="td"><PriorityBadge priority={t.priority} /></td>
                  <td className="td">{t.assignedTo?.name ?? <span className="text-slate-400">Unassigned</span>}</td>
                  <td className="td"><StatusBadge status={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateTaskModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [techs, setTechs] = useState<Tech[]>([]);
  const [form, setForm] = useState({ customerName: '', customerMobile: '', address: '', type: 'NEW_INSTALLATION', priority: 'MEDIUM', description: '', assignedToId: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { apiGet<Tech[]>('/api/technicians').then(setTechs).catch(() => {}); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiPost('/api/tasks', { ...form, assignedToId: form.assignedToId || null });
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal open onClose={onClose} title="Create Task" wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Field label="Customer Name"><input className="input" value={form.customerName} onChange={set('customerName')} required /></Field>
        <Field label="Customer Mobile"><input className="input" value={form.customerMobile} onChange={set('customerMobile')} required /></Field>
        <div className="sm:col-span-2"><Field label="Address"><input className="input" value={form.address} onChange={set('address')} required /></Field></div>
        <Field label="Task Type"><select className="input" value={form.type} onChange={set('type')}>{TASK_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select></Field>
        <Field label="Priority"><select className="input" value={form.priority} onChange={set('priority')}>{PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Assign Technician (optional)"><select className="input" value={form.assignedToId} onChange={set('assignedToId')}><option value="">Unassigned</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field></div>
        <div className="sm:col-span-2"><Field label="Description"><textarea className="input" rows={3} value={form.description} onChange={set('description')} /></Field></div>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create Task'}</button>
        </div>
      </form>
    </Modal>
  );
}
