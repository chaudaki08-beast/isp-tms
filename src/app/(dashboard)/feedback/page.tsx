'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Star } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/client';
import { Card, Spinner, EmptyState, Modal, Field } from '@/components/ui';

type Feedback = { id: string; rating: number; comment?: string | null; customerName: string; createdAt: string; technician?: { name: string }; task?: { code: string } | null };
type Tech = { id: string; name: string };

function Stars({ value }: { value: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`h-4 w-4 ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      ))}
    </div>
  );
}

export default function FeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiGet<{ items: Feedback[] }>('/api/feedback?perPage=50');
    setItems(data.items);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const avg = items.length ? (items.reduce((s, f) => s + f.rating, 0) / items.length).toFixed(2) : '—';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customer Feedback</h1>
        <button onClick={() => setShowAdd(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Feedback</button>
      </div>

      <Card className="flex items-center gap-4">
        <div className="text-4xl font-bold text-amber-500">{avg}</div>
        <div><p className="text-sm text-slate-500">Average rating</p><p className="text-xs text-slate-400">{items.length} reviews</p></div>
      </Card>

      {loading ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        : items.length === 0 ? <Card><EmptyState title="No feedback yet" /></Card> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((f) => (
              <Card key={f.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Stars value={f.rating} />
                  <span className="text-xs text-slate-400">{new Date(f.createdAt).toLocaleDateString()}</span>
                </div>
                {f.comment && <p className="text-sm">{f.comment}</p>}
                <p className="text-xs text-slate-500">— {f.customerName} {f.technician ? `· Tech: ${f.technician.name}` : ''} {f.task ? `· ${f.task.code}` : ''}</p>
              </Card>
            ))}
          </div>
        )}

      {showAdd && <AddFeedbackModal onClose={() => setShowAdd(false)} onDone={load} />}
    </div>
  );
}

function AddFeedbackModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [techs, setTechs] = useState<Tech[]>([]);
  const [form, setForm] = useState({ technicianId: '', customerName: '', rating: 5, comment: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { apiGet<Tech[]>('/api/technicians').then(setTechs).catch(() => {}); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try { await apiPost('/api/feedback', { ...form, rating: Number(form.rating) }); onDone(); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="Add Customer Feedback">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Technician"><select className="input" value={form.technicianId} onChange={(e) => setForm({ ...form, technicianId: e.target.value })} required><option value="">Select…</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Customer Name"><input className="input" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} required /></Field>
        <Field label="Rating">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setForm({ ...form, rating: n })}>
                <Star className={`h-7 w-7 ${n <= form.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Comment"><textarea className="input" rows={3} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} /></Field>
        <button className="btn-primary w-full" disabled={saving}>Submit</button>
      </form>
    </Modal>
  );
}
