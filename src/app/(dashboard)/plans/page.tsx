'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/client';
import { Card, Spinner, Modal, Field } from '@/components/ui';
import { formatCurrency } from '@/lib/utils';

type Plan = { id: string; name: string; speedMbps: number; fup?: string | null; monthlyCost: string; validityDays: number };
type Package = { id: string; name: string; channels?: string | null; price: string };

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [planModal, setPlanModal] = useState<{ open: boolean; edit: Plan | null }>({ open: false, edit: null });
  const [pkgModal, setPkgModal] = useState<{ open: boolean; edit: Package | null }>({ open: false, edit: null });

  const load = useCallback(async () => {
    setLoading(true);
    const [p, pk] = await Promise.all([apiGet<Plan[]>('/api/plans'), apiGet<Package[]>('/api/packages')]);
    setPlans(p); setPackages(pk); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function delPlan(id: string) {
    if (!confirm('Delete this plan? Customers already on it keep their subscription.')) return;
    await apiDelete(`/api/plans/${id}`); load();
  }
  async function delPackage(id: string) {
    if (!confirm('Delete this package?')) return;
    await apiDelete(`/api/packages/${id}`); load();
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Plans &amp; Packages</h1>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Internet Plans</h2>
          <button onClick={() => setPlanModal({ open: true, edit: null })} className="btn-primary"><Plus className="h-4 w-4" /> Add Plan</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <p className="font-semibold">{p.name}</p>
                <CardActions onEdit={() => setPlanModal({ open: true, edit: p })} onDelete={() => delPlan(p.id)} />
              </div>
              <p className="text-3xl font-bold text-brand-600">{p.speedMbps}<span className="text-base font-normal text-slate-500"> Mbps</span></p>
              <p className="text-sm text-slate-500">{p.fup ?? 'Unlimited'} · {p.validityDays} days</p>
              <p className="mt-2 text-lg font-bold">{formatCurrency(p.monthlyCost)}<span className="text-sm font-normal text-slate-400">/mo</span></p>
            </Card>
          ))}
          {plans.length === 0 && <Card className="text-sm text-slate-400">No plans yet.</Card>}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Cable Packages</h2>
          <button onClick={() => setPkgModal({ open: true, edit: null })} className="btn-primary"><Plus className="h-4 w-4" /> Add Package</button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id}>
              <div className="flex items-start justify-between">
                <p className="font-semibold">{p.name}</p>
                <CardActions onEdit={() => setPkgModal({ open: true, edit: p })} onDelete={() => delPackage(p.id)} />
              </div>
              <p className="text-sm text-slate-500">{p.channels ?? '—'}</p>
              <p className="mt-2 text-lg font-bold">{formatCurrency(p.price)}<span className="text-sm font-normal text-slate-400">/mo</span></p>
            </Card>
          ))}
          {packages.length === 0 && <Card className="text-sm text-slate-400">No packages yet.</Card>}
        </div>
      </section>

      {planModal.open && <PlanModal plan={planModal.edit} onClose={() => setPlanModal({ open: false, edit: null })} onDone={load} />}
      {pkgModal.open && <PackageModal pkg={pkgModal.edit} onClose={() => setPkgModal({ open: false, edit: null })} onDone={load} />}
    </div>
  );
}

function CardActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-1">
      <button onClick={onEdit} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800" title="Edit"><Pencil className="h-4 w-4" /></button>
      <button onClick={onDelete} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30" title="Delete"><Trash2 className="h-4 w-4" /></button>
    </div>
  );
}

function PlanModal({ plan, onClose, onDone }: { plan: Plan | null; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    name: plan?.name ?? '', speedMbps: plan ? String(plan.speedMbps) : '', fup: plan?.fup ?? 'Unlimited',
    monthlyCost: plan ? String(plan.monthlyCost) : '', validityDays: plan ? String(plan.validityDays) : '30',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  async function save() {
    setSaving(true);
    const payload = { name: form.name, speedMbps: Number(form.speedMbps), fup: form.fup, monthlyCost: Number(form.monthlyCost), validityDays: Number(form.validityDays) };
    try {
      if (plan) await apiPut(`/api/plans/${plan.id}`, payload);
      else await apiPost('/api/plans', payload);
      onDone(); onClose();
    } finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title={plan ? 'Edit Plan' : 'Add Internet Plan'}>
      <div className="space-y-3">
        <Field label="Plan Name"><input className="input" value={form.name} onChange={set('name')} /></Field>
        <Field label="Speed (Mbps)"><input type="number" className="input" value={form.speedMbps} onChange={set('speedMbps')} /></Field>
        <Field label="FUP"><input className="input" value={form.fup} onChange={set('fup')} /></Field>
        <Field label="Monthly Cost (₹)"><input type="number" className="input" value={form.monthlyCost} onChange={set('monthlyCost')} /></Field>
        <Field label="Validity (days)"><input type="number" className="input" value={form.validityDays} onChange={set('validityDays')} /></Field>
        <button onClick={save} disabled={!form.name || !form.monthlyCost || saving} className="btn-primary w-full">{saving ? 'Saving…' : plan ? 'Save Changes' : 'Add Plan'}</button>
      </div>
    </Modal>
  );
}

function PackageModal({ pkg, onClose, onDone }: { pkg: Package | null; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: pkg?.name ?? '', channels: pkg?.channels ?? '', price: pkg ? String(pkg.price) : '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  async function save() {
    setSaving(true);
    const payload = { name: form.name, channels: form.channels, price: Number(form.price) };
    try {
      if (pkg) await apiPut(`/api/packages/${pkg.id}`, payload);
      else await apiPost('/api/packages', payload);
      onDone(); onClose();
    } finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title={pkg ? 'Edit Package' : 'Add Cable Package'}>
      <div className="space-y-3">
        <Field label="Package Name"><input className="input" value={form.name} onChange={set('name')} /></Field>
        <Field label="Channels"><textarea className="input" rows={2} value={form.channels} onChange={set('channels')} /></Field>
        <Field label="Price (₹)"><input type="number" className="input" value={form.price} onChange={set('price')} /></Field>
        <button onClick={save} disabled={!form.name || !form.price || saving} className="btn-primary w-full">{saving ? 'Saving…' : pkg ? 'Save Changes' : 'Add Package'}</button>
      </div>
    </Modal>
  );
}
