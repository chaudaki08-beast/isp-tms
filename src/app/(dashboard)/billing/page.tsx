'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Layers, Search, FileText } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/client';
import { Card, StatCard, Spinner, EmptyState, Modal, Field, StatusBadge } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { INVOICE_STATUSES, humanize } from '@/lib/labels';

type Invoice = {
  id: string; number: string; total: string; amountPaid: string; status: string; dueDate: string;
  customer: { id: string; code: string; name: string };
};
type Customer = { id: string; code: string; name: string };

export default function BillingPage() {
  const [items, setItems] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState({ billed: 0, collected: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState<null | 'create' | 'bulk'>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ perPage: '50' });
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const data = await apiGet<{ items: Invoice[]; summary: { billed: number; collected: number } }>(`/api/invoices?${params}`);
    setItems(data.items); setSummary(data.summary); setLoading(false);
  }, [search, status]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  const outstanding = summary.billed - summary.collected;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div className="flex gap-2">
          <button onClick={() => setModal('bulk')} className="btn-ghost"><Layers className="h-4 w-4" /> Bulk Generate</button>
          <button onClick={() => setModal('create')} className="btn-primary"><Plus className="h-4 w-4" /> New Invoice</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Billed" value={formatCurrency(summary.billed)} icon={FileText} />
        <StatCard label="Collected" value={formatCurrency(summary.collected)} accent="text-emerald-600" />
        <StatCard label="Outstanding" value={formatCurrency(outstanding)} accent="text-red-600" />
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input className="input pl-9" placeholder="Search invoice no, customer…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {INVOICE_STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="No invoices" hint="Create one or bulk-generate monthly bills." /></Card>
      ) : (
        <div className="table-wrap bg-white dark:bg-slate-900">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr><th className="th">Invoice</th><th className="th">Customer</th><th className="th">Total</th><th className="th">Paid</th><th className="th">Due</th><th className="th">Status</th><th className="th"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((i) => (
                <tr key={i.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td font-medium">{i.number}</td>
                  <td className="td"><Link href={`/customers/${i.customer.id}`} className="text-brand-600 hover:underline">{i.customer.name}</Link></td>
                  <td className="td">{formatCurrency(i.total)}</td>
                  <td className="td">{formatCurrency(i.amountPaid)}</td>
                  <td className="td">{new Date(i.dueDate).toLocaleDateString()}</td>
                  <td className="td"><StatusBadge status={i.status} /></td>
                  <td className="td"><a href={`/api/invoices/${i.id}/pdf`} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">PDF</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'create' && <CreateInvoiceModal onClose={() => setModal(null)} onDone={load} />}
      {modal === 'bulk' && <BulkModal onClose={() => setModal(null)} onDone={load} />}
    </div>
  );
}

function CreateInvoiceModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [desc, setDesc] = useState('Monthly subscription');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { apiGet<{ items: Customer[] }>('/api/customers?perPage=100').then((d) => setCustomers(d.items)).catch(() => {}); }, []);
  async function save() {
    setSaving(true); setError('');
    try {
      await apiPost('/api/invoices', { customerId, dueDate, items: [{ description: desc, quantity: 1, unitPrice: Number(amount) }] });
      onDone(); onClose();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title="New Invoice">
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Field label="Customer"><select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}><option value="">Select…</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></Field>
        <Field label="Description"><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label="Amount (₹)"><input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Due Date"><input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        <button onClick={save} disabled={!customerId || !amount || !dueDate || saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Create Invoice'}</button>
      </div>
    </Modal>
  );
}

function BulkModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [dueDate, setDueDate] = useState('');
  const [area, setArea] = useState('');
  const [tax, setTax] = useState('0');
  const [result, setResult] = useState('');
  const [saving, setSaving] = useState(false);
  async function run() {
    setSaving(true);
    try {
      const r = await apiPost<{ created: number; customers: number }>('/api/invoices/bulk', { dueDate, taxPercent: Number(tax), area: area || undefined });
      setResult(`Generated ${r.created} invoices for ${r.customers} active customers.`);
      onDone();
    } finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title="Bulk Generate Invoices">
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Creates one invoice per active customer using their current monthly subscription amount.</p>
        <Field label="Due Date"><input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        <Field label="Area (optional — leave blank for all)"><input className="input" value={area} onChange={(e) => setArea(e.target.value)} /></Field>
        <Field label="Tax %"><input type="number" className="input" value={tax} onChange={(e) => setTax(e.target.value)} /></Field>
        {result && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{result}</p>}
        <button onClick={run} disabled={!dueDate || saving} className="btn-primary w-full">{saving ? 'Generating…' : 'Generate Bills'}</button>
      </div>
    </Modal>
  );
}
