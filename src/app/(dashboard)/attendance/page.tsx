'use client';

import { useEffect, useState, useCallback } from 'react';
import { LogIn, LogOut, MapPin } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/client';
import { getCurrentPosition } from '@/lib/geo';
import { Card, Spinner, StatusBadge, Modal } from '@/components/ui';
import { CameraCapture } from '@/components/CameraCapture';

type Today = { checkedIn: boolean; checkedOut: boolean; record: { checkInAt?: string; checkOutAt?: string; lateMinutes: number; workedMinutes: number } | null };
type Row = { id: string; date: string; status: string; checkInAt?: string | null; checkOutAt?: string | null; workedMinutes: number; lateMinutes: number; user?: { name: string } };

export default function AttendancePage() {
  const [today, setToday] = useState<Today | null>(null);
  const [history, setHistory] = useState<Row[]>([]);
  const [mode, setMode] = useState<'in' | 'out' | null>(null);

  const load = useCallback(async () => {
    const [t, h] = await Promise.all([
      apiGet<Today>('/api/attendance/today'),
      apiGet<{ items: Row[] }>('/api/attendance?perPage=30'),
    ]);
    setToday(t);
    setHistory(h.items);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!today) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Attendance</h1>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Today</p>
            <p className="text-lg font-semibold">{new Date().toDateString()}</p>
          </div>
          {today.record && (
            <div className="flex gap-4 text-sm">
              <span>In: <b>{today.record.checkInAt ? new Date(today.record.checkInAt).toLocaleTimeString() : '—'}</b></span>
              <span>Out: <b>{today.record.checkOutAt ? new Date(today.record.checkOutAt).toLocaleTimeString() : '—'}</b></span>
              {today.record.lateMinutes > 0 && <span className="text-amber-600">Late {today.record.lateMinutes}m</span>}
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => setMode('in')} disabled={today.checkedIn} className="btn-primary flex-1">
            <LogIn className="h-4 w-4" /> Check In
          </button>
          <button onClick={() => setMode('out')} disabled={!today.checkedIn || today.checkedOut} className="btn-ghost flex-1">
            <LogOut className="h-4 w-4" /> Check Out
          </button>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">History</h3>
        <div className="table-wrap">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr><th className="th">Date</th><th className="th">Status</th><th className="th">In</th><th className="th">Out</th><th className="th">Hours</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {history.map((r) => (
                <tr key={r.id}>
                  <td className="td">{new Date(r.date).toLocaleDateString()}</td>
                  <td className="td"><StatusBadge status={r.status} /></td>
                  <td className="td">{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : '—'}</td>
                  <td className="td">{r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : '—'}</td>
                  <td className="td">{(r.workedMinutes / 60).toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {mode && <PunchModal mode={mode} onClose={() => setMode(null)} onDone={load} />}
    </div>
  );
}

function PunchModal({ mode, onClose, onDone }: { mode: 'in' | 'out'; onClose: () => void; onDone: () => void }) {
  const [selfie, setSelfie] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getCurrentPosition().then(setCoords).catch((e) => setError(e.message));
  }, []);

  async function submit() {
    if (!coords) { setError('Waiting for GPS location…'); return; }
    setSaving(true);
    setError('');
    try {
      await apiPost(`/api/attendance/check-${mode}`, { lat: coords.lat, lng: coords.lng, selfie });
      onDone();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={mode === 'in' ? 'Check In' : 'Check Out'}>
      <div className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
          <MapPin className="h-4 w-4 text-brand-600" />
          {coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : 'Acquiring GPS…'}
        </div>
        <CameraCapture facing="user" onCapture={setSelfie} />
        <button onClick={submit} disabled={saving || !coords} className="btn-primary w-full">
          {saving ? 'Submitting…' : `Confirm Check ${mode === 'in' ? 'In' : 'Out'}`}
        </button>
      </div>
    </Modal>
  );
}
