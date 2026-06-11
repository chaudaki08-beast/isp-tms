'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Check, X } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/client';
import { Card, Spinner, EmptyState, Modal, Field, StatusBadge } from '@/components/ui';
import { EXPENSE_TYPES, humanize } from '@/lib/labels';
import { formatCurrency } from '@/lib/utils';

type Expense = {
  id: string; type: string; amount: string; description?: string | null; expenseDate: string;
  status: string; receiptUrl?: string | null; reviewComment?: string | null; user?: { name: string };
};

export default function ExpensesPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role !== 'TECHNICIAN';

  const [items, setItems] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiGet<{ items: Expense[]; summary: Record<string, number> }>('/api/expenses?perPage=50');
    setItems(data.items);
    setSummary(data.summary);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function review(id: string, status: 'APPROVED' | 'REJECTED') {
    await apiPatch(`/api/expenses/${id}`, { status });
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="h-4 w-4" /> Submit Expense</button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {['PENDING', 'APPROVED', 'REJECTED'].map((s) => (
          <Card key={s}><p className="text-xs text-slate-500">{humanize(s)}</p><p className="text-lg font-bold">{formatCurrency(summary[s] ?? 0)}</p></Card>
        ))}
      </div>

      {items.length === 0 ? <Card><EmptyState title="No expenses" /></Card> : (
        <div className="space-y-3">
          {items.map((e) => (
            <Card key={e.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{formatCurrency(e.amount)} · {humanize(e.type)}</p>
                <p className="text-sm text-slate-500">{e.description}</p>
                <p className="text-xs text-slate-400">{new Date(e.expenseDate).toLocaleDateString()} {isManager && e.user ? `· ${e.user.name}` : ''}</p>
                {e.receiptUrl && <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-brand-600 underline">View receipt</a>}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={e.status} />
                {isManager && e.status === 'PENDING' && (
                  <>
                    <button onClick={() => review(e.id, 'APPROVED')} className="rounded-lg bg-emerald-100 p-2 text-emerald-700 hover:bg-emerald-200"><Check className="h-4 w-4" /></button>
                    <button onClick={() => review(e.id, 'REJECTED')} className="rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200"><X className="h-4 w-4" /></button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {showCreate && <CreateExpenseModal onClose={() => setShowCreate(false)} onDone={load} />}
    </div>
  );
}

function CreateExpenseModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ type: 'FUEL', amount: '', description: '', expenseDate: today });
  const [receipt, setReceipt] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setReceipt(r.result as string);
    r.readAsDataURL(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await apiPost('/api/expenses', { ...form, amount: Number(form.amount), receipt: receipt || undefined }); onDone(); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="Submit Expense">
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Type"><select className="input" value={form.type} onChange={set('type')}>{EXPENSE_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select></Field>
        <Field label="Amount (₹)"><input type="number" step="0.01" className="input" value={form.amount} onChange={set('amount')} required /></Field>
        <Field label="Date"><input type="date" className="input" value={form.expenseDate} onChange={set('expenseDate')} /></Field>
        <Field label="Receipt"><input type="file" accept="image/*" onChange={onFile} className="input py-1.5" /></Field>
        <div className="sm:col-span-2"><Field label="Description"><textarea className="input" rows={2} value={form.description} onChange={set('description')} /></Field></div>
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-ghost">Cancel</button><button className="btn-primary" disabled={saving}>Submit</button></div>
      </form>
    </Modal>
  );
}
