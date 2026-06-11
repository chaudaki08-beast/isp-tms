'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, CloudOff, CheckCircle2, Clock } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/client';
import { Card, StatCard, Spinner, EmptyState, Modal, Field, StatusBadge } from '@/components/ui';
import { formatDistanceToNow } from 'date-fns';

type Outage = {
  id: string; area: string; reason: string; description?: string | null; status: string;
  startTime: string; expectedResolution?: string | null; affectedCount: number;
  notifiedChannels?: string[] | null;
};
type Stats = { active: number; resolved: number; avgResolutionMins: number };

export default function OutagesPage() {
  const [items, setItems] = useState<Outage[]>([]);
  const [stats, setStats] = useState<Stats>({ active: 0, resolved: 0, avgResolutionMins: 0 });
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await apiGet<{ items: Outage[]; stats: Stats }>('/api/outages?perPage=50');
    setItems(data.items); setStats(data.stats); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function resolve(id: string) {
    await apiPatch(`/api/outages/${id}`, { status: 'RESOLVED' });
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Outages &amp; Maintenance</h1>
        <button onClick={() => setShow(true)} className="btn-primary"><Plus className="h-4 w-4" /> Declare Outage</button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active Outages" value={stats.active} icon={CloudOff} accent="text-red-600" />
        <StatCard label="Resolved" value={stats.resolved} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="Avg Resolution" value={`${stats.avgResolutionMins} min`} icon={Clock} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : items.length === 0 ? (
        <Card><EmptyState title="No outages" hint="All systems operational." /></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((o) => (
            <Card key={o.id} className="space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">{o.area}</p>
                  <p className="text-sm text-slate-500">{o.reason}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              {o.description && <p className="text-sm">{o.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                <span>👥 {o.affectedCount} affected</span>
                <span>· Started {formatDistanceToNow(new Date(o.startTime), { addSuffix: true })}</span>
                {o.notifiedChannels && o.notifiedChannels.length > 0 && <span>· Notified: {o.notifiedChannels.join(', ')}</span>}
              </div>
              {o.status === 'ACTIVE' && (
                <button onClick={() => resolve(o.id)} className="btn-ghost w-full"><CheckCircle2 className="h-4 w-4" /> Mark Resolved</button>
              )}
            </Card>
          ))}
        </div>
      )}

      {show && <DeclareModal onClose={() => setShow(false)} onDone={load} />}
    </div>
  );
}

function DeclareModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ area: '', reason: '', description: '', expectedResolution: '' });
  const [channels, setChannels] = useState<string[]>(['SMS', 'WHATSAPP']);
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const toggle = (c: string) => setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  async function save() {
    setSaving(true);
    try { await apiPost('/api/outages', { ...form, expectedResolution: form.expectedResolution || undefined, notifyChannels: channels }); onDone(); onClose(); }
    finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title="Declare Outage">
      <div className="space-y-3">
        <Field label="Area / Zone"><input className="input" value={form.area} onChange={set('area')} /></Field>
        <Field label="Reason"><input className="input" value={form.reason} onChange={set('reason')} /></Field>
        <Field label="Description"><textarea className="input" rows={2} value={form.description} onChange={set('description')} /></Field>
        <Field label="Expected Resolution"><input type="datetime-local" className="input" value={form.expectedResolution} onChange={set('expectedResolution')} /></Field>
        <div>
          <label className="label">Notify customers via</label>
          <div className="flex gap-2">
            {['SMS', 'WHATSAPP', 'EMAIL'].map((c) => (
              <button key={c} type="button" onClick={() => toggle(c)} className={`badge cursor-pointer ${channels.includes(c) ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{c}</button>
            ))}
          </div>
        </div>
        <button onClick={save} disabled={!form.area || !form.reason || saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Declare & Notify'}</button>
      </div>
    </Modal>
  );
}
