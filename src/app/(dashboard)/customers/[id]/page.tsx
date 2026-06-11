'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { Phone, MapPin, Plus, FileText, IndianRupee, RefreshCw, StickyNote } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/client';
import { Card, Spinner, StatusBadge, Modal, Field } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';
import { humanize, PAYMENT_METHODS } from '@/lib/labels';
import { formatDistanceToNow } from 'date-fns';

type Customer = {
  id: string; code: string; name: string; mobile: string; altMobile?: string | null; email?: string | null;
  address: string; area?: string | null; connectionType: string; status: string;
  installationDate?: string | null; outstanding: number;
  subscriptions: { id: string; status: string; monthlyAmount: string; plan?: { name: string } | null; package?: { name: string } | null }[];
  invoices: { id: string; number: string; total: string; amountPaid: string; status: string; dueDate: string }[];
  payments: { id: string; amount: string; method: string; paidAt: string }[];
  assets: { id: string; type: string; serialNo?: string | null; status: string }[];
  tickets: { id: string; code: string; category: string; status: string }[];
  events: { id: string; type: string; title: string; createdAt: string; actor?: { name: string } | null }[];
};

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [c, setC] = useState<Customer | null>(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<null | 'note' | 'invoice' | 'payment' | 'plan'>(null);

  const load = useCallback(async () => {
    try { setC(await apiGet<Customer>(`/api/customers/${id}`)); }
    catch (e) { setError((e as Error).message); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  if (error) return <Card>{error}</Card>;
  if (!c) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const active = c.subscriptions.find((s) => s.status === 'ACTIVE');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <p className="text-sm text-slate-500">{c.code} · {humanize(c.connectionType)}</p>
        </div>
        <StatusBadge status={c.status} />
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setModal('invoice')} className="btn-primary"><FileText className="h-4 w-4" /> Raise Invoice</button>
        <button onClick={() => setModal('payment')} className="btn-ghost"><IndianRupee className="h-4 w-4" /> Record Payment</button>
        <button onClick={() => setModal('plan')} className="btn-ghost"><RefreshCw className="h-4 w-4" /> Change Plan</button>
        <button onClick={() => setModal('note')} className="btn-ghost"><StickyNote className="h-4 w-4" /> Add Note</button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="space-y-3">
          <h3 className="font-semibold">Contact</h3>
          <Row icon={Phone} value={<a className="text-brand-600" href={`tel:${c.mobile}`}>{c.mobile}</a>} />
          {c.altMobile && <Row icon={Phone} value={c.altMobile} />}
          {c.email && <p className="text-sm">{c.email}</p>}
          <Row icon={MapPin} value={`${c.address}${c.area ? ', ' + c.area : ''}`} />
        </Card>

        <Card>
          <h3 className="mb-2 font-semibold">Current Plan</h3>
          {active ? (
            <>
              <p className="text-lg font-bold">{active.plan?.name ?? '—'}{active.package ? ` + ${active.package.name}` : ''}</p>
              <p className="text-sm text-slate-500">{formatCurrency(active.monthlyAmount)} / month</p>
            </>
          ) : <p className="text-sm text-slate-400">No active subscription</p>}
        </Card>

        <Card>
          <h3 className="mb-2 font-semibold">Outstanding</h3>
          <p className={`text-2xl font-bold ${c.outstanding > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(c.outstanding)}</p>
          <p className="text-sm text-slate-500">{c.invoices.length} invoice(s)</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Invoices</h3>
          <MiniList empty="No invoices">
            {c.invoices.map((i) => (
              <div key={i.id} className="flex items-center justify-between py-2 text-sm">
                <a href={`/api/invoices/${i.id}/pdf`} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">{i.number}</a>
                <div className="flex items-center gap-3">
                  <span>{formatCurrency(i.total)}</span>
                  <StatusBadge status={i.status} />
                </div>
              </div>
            ))}
          </MiniList>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Payments</h3>
          <MiniList empty="No payments">
            {c.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span>{formatCurrency(p.amount)} <span className="text-slate-400">· {humanize(p.method)}</span></span>
                <span className="text-xs text-slate-400">{new Date(p.paidAt).toLocaleDateString()}</span>
              </div>
            ))}
          </MiniList>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Assigned Equipment</h3>
          <MiniList empty="No equipment assigned">
            {c.assets.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                <span>{humanize(a.type)} <span className="text-slate-400">· {a.serialNo ?? 'no SN'}</span></span>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </MiniList>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Tickets</h3>
          <MiniList empty="No tickets">
            {c.tickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/complaints`} className="font-medium text-brand-600 hover:underline">{t.code}</Link>
                <div className="flex items-center gap-2"><span className="text-slate-400">{humanize(t.category)}</span><StatusBadge status={t.status} /></div>
              </div>
            ))}
          </MiniList>
        </Card>
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">Timeline</h3>
        <div className="space-y-3">
          {c.events.length === 0 && <p className="text-sm text-slate-400">No history yet</p>}
          {c.events.map((e) => (
            <div key={e.id} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-slate-400">{humanize(e.type)} · {formatDistanceToNow(new Date(e.createdAt), { addSuffix: true })}{e.actor ? ` · ${e.actor.name}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {modal === 'note' && <NoteModal id={id} onClose={() => setModal(null)} onDone={load} />}
      {modal === 'invoice' && <InvoiceModal id={id} onClose={() => setModal(null)} onDone={load} />}
      {modal === 'payment' && <PaymentModal id={id} invoices={c.invoices} onClose={() => setModal(null)} onDone={load} />}
      {modal === 'plan' && <PlanModal id={id} onClose={() => setModal(null)} onDone={load} />}
    </div>
  );
}

function Row({ icon: Icon, value }: { icon: React.ComponentType<{ className?: string }>; value: React.ReactNode }) {
  return <p className="flex items-center gap-2 text-sm"><Icon className="h-4 w-4 text-slate-400" />{value}</p>;
}
function MiniList({ children, empty }: { children: React.ReactNode; empty: string }) {
  const arr = Array.isArray(children) ? children : [children];
  if (arr.flat().filter(Boolean).length === 0) return <p className="text-sm text-slate-400">{empty}</p>;
  return <div className="divide-y divide-slate-100 dark:divide-slate-800">{children}</div>;
}

function NoteModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { await apiPost(`/api/customers/${id}/events`, { type: 'NOTE', title, description }); onDone(); onClose(); }
    finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title="Add Note">
      <div className="space-y-3">
        <Field label="Title"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Details"><textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <button onClick={save} disabled={!title || saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Add Note'}</button>
      </div>
    </Modal>
  );
}

function InvoiceModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [desc, setDesc] = useState('Monthly subscription');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tax, setTax] = useState('0');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true); setError('');
    try {
      await apiPost('/api/invoices', { customerId: id, dueDate, taxPercent: Number(tax), items: [{ description: desc, quantity: 1, unitPrice: Number(amount) }] });
      onDone(); onClose();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title="Raise Invoice">
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Field label="Description"><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label="Amount (₹)"><input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Tax %"><input type="number" className="input" value={tax} onChange={(e) => setTax(e.target.value)} /></Field>
        <Field label="Due Date"><input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
        <button onClick={save} disabled={!amount || !dueDate || saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Create Invoice'}</button>
      </div>
    </Modal>
  );
}

function PaymentModal({ id, invoices, onClose, onDone }: { id: string; invoices: { id: string; number: string; status: string }[]; onClose: () => void; onDone: () => void }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [invoiceId, setInvoiceId] = useState('');
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const open = invoices.filter((i) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(i.status));
  async function save() {
    setSaving(true);
    try { await apiPost('/api/payments', { customerId: id, invoiceId: invoiceId || null, amount: Number(amount), method, reference }); onDone(); onClose(); }
    finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title="Record Payment">
      <div className="space-y-3">
        <Field label="Amount (₹)"><input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Method"><select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>{PAYMENT_METHODS.map((m) => <option key={m} value={m}>{humanize(m)}</option>)}</select></Field>
        <Field label="Against Invoice (optional)"><select className="input" value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}><option value="">— None —</option>{open.map((i) => <option key={i.id} value={i.id}>{i.number}</option>)}</select></Field>
        <Field label="Reference / Txn ID"><input className="input" value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
        <button onClick={save} disabled={!amount || saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Record Payment'}</button>
      </div>
    </Modal>
  );
}

function PlanModal({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [plans, setPlans] = useState<{ id: string; name: string; monthlyCost: string }[]>([]);
  const [packages, setPackages] = useState<{ id: string; name: string; price: string }[]>([]);
  const [planId, setPlanId] = useState('');
  const [packageId, setPackageId] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    apiGet<typeof plans>('/api/plans').then(setPlans).catch(() => {});
    apiGet<typeof packages>('/api/packages').then(setPackages).catch(() => {});
  }, []);
  const monthly = (Number(plans.find((p) => p.id === planId)?.monthlyCost ?? 0) + Number(packages.find((p) => p.id === packageId)?.price ?? 0));
  async function save() {
    setSaving(true);
    try { await apiPost(`/api/customers/${id}/subscription`, { planId: planId || null, packageId: packageId || null, monthlyAmount: monthly }); onDone(); onClose(); }
    finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title="Change Plan / Package">
      <div className="space-y-3">
        <Field label="Internet Plan"><select className="input" value={planId} onChange={(e) => setPlanId(e.target.value)}><option value="">None</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name} (₹{p.monthlyCost})</option>)}</select></Field>
        <Field label="Cable Package"><select className="input" value={packageId} onChange={(e) => setPackageId(e.target.value)}><option value="">None</option>{packages.map((p) => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}</select></Field>
        <p className="text-sm text-slate-500">New monthly: <span className="font-semibold">{formatCurrency(monthly)}</span></p>
        <button onClick={save} disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Update Plan'}</button>
      </div>
    </Modal>
  );
}
