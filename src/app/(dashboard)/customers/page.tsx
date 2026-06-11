'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/client';
import { Card, Spinner, EmptyState, Modal, Field, StatusBadge } from '@/components/ui';
import { CONNECTION_TYPES, CUSTOMER_STATUSES, humanize } from '@/lib/labels';

type Customer = {
  id: string; code: string; name: string; mobile: string; area?: string | null;
  connectionType: string; status: string;
  subscriptions: { plan?: { name: string } | null; package?: { name: string } | null }[];
};
type Plan = { id: string; name: string; monthlyCost: string };
type Package = { id: string; name: string; price: string };

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ perPage: '50' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const data = await apiGet<{ items: Customer[] }>(`/api/customers?${params}`);
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
        <h1 className="text-2xl font-bold">Customers</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="h-4 w-4" /> New Customer</button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search name, code, mobile, area…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="No customers found" hint="Add your first customer." /></Card>
      ) : (
        <div className="table-wrap bg-white dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr><th className="th">Code</th><th className="th">Name</th><th className="th">Mobile</th><th className="th">Area</th><th className="th">Plan</th><th className="th">Type</th><th className="th">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td"><Link href={`/customers/${c.id}`} className="font-medium text-brand-600 hover:underline">{c.code}</Link></td>
                  <td className="td">{c.name}</td>
                  <td className="td">{c.mobile}</td>
                  <td className="td">{c.area ?? '—'}</td>
                  <td className="td">{c.subscriptions[0]?.plan?.name ?? c.subscriptions[0]?.package?.name ?? <span className="text-slate-400">—</span>}</td>
                  <td className="td">{humanize(c.connectionType)}</td>
                  <td className="td"><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateCustomerModal onClose={() => setShowCreate(false)} onCreated={load} />}
    </div>
  );
}

function CreateCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [form, setForm] = useState({ name: '', mobile: '', altMobile: '', email: '', address: '', area: '', connectionType: 'FIBER', status: 'ACTIVE', planId: '', packageId: '', installationDate: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet<Plan[]>('/api/plans').then(setPlans).catch(() => {});
    apiGet<Package[]>('/api/packages').then(setPackages).catch(() => {});
  }, []);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiPost('/api/customers', {
        ...form,
        planId: form.planId || null,
        packageId: form.packageId || null,
        installationDate: form.installationDate || undefined,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="New Customer" wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        {error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Field label="Full Name"><input className="input" value={form.name} onChange={set('name')} required /></Field>
        <Field label="Mobile"><input className="input" value={form.mobile} onChange={set('mobile')} required /></Field>
        <Field label="Alternate Mobile"><input className="input" value={form.altMobile} onChange={set('altMobile')} /></Field>
        <Field label="Email"><input type="email" className="input" value={form.email} onChange={set('email')} /></Field>
        <div className="sm:col-span-2"><Field label="Address"><input className="input" value={form.address} onChange={set('address')} required /></Field></div>
        <Field label="Area / Zone"><input className="input" value={form.area} onChange={set('area')} /></Field>
        <Field label="Connection Type"><select className="input" value={form.connectionType} onChange={set('connectionType')}>{CONNECTION_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select></Field>
        <Field label="Internet Plan"><select className="input" value={form.planId} onChange={set('planId')}><option value="">None</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} (₹{p.monthlyCost})</option>)}</select></Field>
        <Field label="Cable Package"><select className="input" value={form.packageId} onChange={set('packageId')}><option value="">None</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}</select></Field>
        <Field label="Installation Date"><input type="date" className="input" value={form.installationDate} onChange={set('installationDate')} /></Field>
        <Field label="Status"><select className="input" value={form.status} onChange={set('status')}>{CUSTOMER_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></Field>
        <div className="sm:col-span-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Create Customer'}</button>
        </div>
      </form>
    </Modal>
  );
}
