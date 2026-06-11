'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Plus } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '@/lib/client';
import { Card, Spinner, EmptyState, Modal, Field, StatusBadge } from '@/components/ui';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES, humanize } from '@/lib/labels';

type Complaint = {
  id: string; code: string; customerName: string; customerMobile: string; address: string;
  category: string; status: string; isRepeat: boolean; assignedTo?: { name: string } | null;
};
type Tech = { id: string; name: string };

export default function ComplaintsPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role !== 'TECHNICIAN';

  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ perPage: '50' });
    if (status) params.set('status', status);
    const data = await apiGet<{ items: Complaint[] }>(`/api/complaints?${params}`);
    setItems(data.items);
    setLoading(false);
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, newStatus: string) {
    await apiPut(`/api/complaints/${id}`, { status: newStatus });
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Complaints</h1>
        {isManager && <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="h-4 w-4" /> New Complaint</button>}
      </div>

      <select className="input w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All statuses</option>
        {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
      </select>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="No complaints found" /></Card>
      ) : (
        <div className="space-y-3">
          {items.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-brand-600">{c.code}</span>
                  {c.isRepeat && <span className="badge bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">Repeat</span>}
                </div>
                <p className="text-sm">{c.customerName} · {humanize(c.category)}</p>
                <p className="text-xs text-slate-400">{c.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={c.status} />
                <select className="input w-36 py-1.5 text-xs" value={c.status} onChange={(e) => updateStatus(c.id, e.target.value)}>
                  {COMPLAINT_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                </select>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateComplaintModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

function CreateComplaintModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [techs, setTechs] = useState<Tech[]>([]);
  const [form, setForm] = useState({ customerName: '', customerMobile: '', address: '', category: 'NO_INTERNET', description: '', assignedToId: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { apiGet<Tech[]>('/api/technicians').then(setTechs).catch(() => {}); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiPost('/api/complaints', { ...form, assignedToId: form.assignedToId || null });
      onCreated();
      onClose();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Modal open onClose={onClose} title="Register Complaint" wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Field label="Customer Name"><input className="input" value={form.customerName} onChange={set('customerName')} required /></Field>
        <Field label="Customer Mobile"><input className="input" value={form.customerMobile} onChange={set('customerMobile')} required /></Field>
        <div className="sm:col-span-2"><Field label="Address"><input className="input" value={form.address} onChange={set('address')} required /></Field></div>
        <Field label="Category"><select className="input" value={form.category} onChange={set('category')}>{COMPLAINT_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}</select></Field>
        <Field label="Assign Technician"><select className="input" value={form.assignedToId} onChange={set('assignedToId')}><option value="">Unassigned</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Description"><textarea className="input" rows={3} value={form.description} onChange={set('description')} /></Field></div>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Register'}</button>
        </div>
      </form>
    </Modal>
  );
}
