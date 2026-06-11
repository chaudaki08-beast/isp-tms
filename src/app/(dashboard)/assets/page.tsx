'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/client';
import { Card, StatCard, Spinner, EmptyState, Modal, Field, StatusBadge } from '@/components/ui';
import { ASSET_TYPES, ASSET_STATUSES, humanize } from '@/lib/labels';

type Asset = {
  id: string; type: string; serialNo?: string | null; macAddress?: string | null; model?: string | null;
  status: string; assignedCustomer?: { id: string; code: string; name: string } | null;
};
type Customer = { id: string; code: string; name: string };

export default function AssetsPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [assign, setAssign] = useState<Asset | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ perPage: '60' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    const data = await apiGet<{ items: Asset[]; summary: Record<string, number> }>(`/api/assets?${params}`);
    setItems(data.items); setSummary(data.summary); setLoading(false);
  }, [search, status, type]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assets &amp; Inventory</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="h-4 w-4" /> Stock In</button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Available" value={summary.AVAILABLE ?? 0} accent="text-emerald-600" />
        <StatCard label="Assigned" value={summary.ASSIGNED ?? 0} accent="text-blue-600" />
        <StatCard label="Defective" value={summary.DEFECTIVE ?? 0} accent="text-red-600" />
        <StatCard label="Returned" value={summary.RETURNED ?? 0} />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search serial, MAC, model…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-40" value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option>{ASSET_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select>
        <select className="input w-40" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{ASSET_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="No assets" hint="Add equipment to inventory." /></Card>
      ) : (
        <div className="table-wrap bg-white dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr><th className="th">Type</th><th className="th">Serial</th><th className="th">MAC</th><th className="th">Model</th><th className="th">Assigned To</th><th className="th">Status</th><th className="th"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td font-medium">{humanize(a.type)}</td>
                  <td className="td">{a.serialNo ?? '—'}</td>
                  <td className="td">{a.macAddress ?? '—'}</td>
                  <td className="td">{a.model ?? '—'}</td>
                  <td className="td">{a.assignedCustomer?.name ?? <span className="text-slate-400">—</span>}</td>
                  <td className="td"><StatusBadge status={a.status} /></td>
                  <td className="td"><button onClick={() => setAssign(a)} className="text-brand-600 hover:underline">Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateAssetModal onClose={() => setShowCreate(false)} onDone={load} />}
      {assign && <ManageAssetModal asset={assign} onClose={() => setAssign(null)} onDone={load} />}
    </div>
  );
}

function CreateAssetModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ type: 'ONT', serialNo: '', macAddress: '', model: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });
  async function save() {
    setSaving(true);
    try { await apiPost('/api/assets', form); onDone(); onClose(); }
    finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title="Add Asset (Stock In)">
      <div className="space-y-3">
        <Field label="Type"><select className="input" value={form.type} onChange={set('type')}>{ASSET_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select></Field>
        <Field label="Serial Number"><input className="input" value={form.serialNo} onChange={set('serialNo')} /></Field>
        <Field label="MAC Address"><input className="input" value={form.macAddress} onChange={set('macAddress')} /></Field>
        <Field label="Model"><input className="input" value={form.model} onChange={set('model')} /></Field>
        <button onClick={save} disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Add Asset'}</button>
      </div>
    </Modal>
  );
}

function ManageAssetModal({ asset, onClose, onDone }: { asset: Asset; onClose: () => void; onDone: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState(asset.assignedCustomer?.id ?? '');
  const [status, setStatus] = useState(asset.status);
  const [saving, setSaving] = useState(false);
  useEffect(() => { apiGet<{ items: Customer[] }>('/api/customers?perPage=100').then((d) => setCustomers(d.items)).catch(() => {}); }, []);
  async function save() {
    setSaving(true);
    try { await apiPatch(`/api/assets/${asset.id}`, { assignedCustomerId: customerId || null, status: customerId ? undefined : status }); onDone(); onClose(); }
    finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Manage ${humanize(asset.type)}`}>
      <div className="space-y-3">
        <Field label="Assign to Customer"><select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">— Unassigned —</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></Field>
        {!customerId && (
          <Field label="Status"><select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>{ASSET_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}</select></Field>
        )}
        <button onClick={save} disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}
