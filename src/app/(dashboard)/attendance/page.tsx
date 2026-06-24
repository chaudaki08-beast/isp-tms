'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { LogIn, LogOut, MapPin, Download } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/client';
import { getCurrentPosition } from '@/lib/geo';
import { Card, StatCard, Spinner, StatusBadge, Modal, EmptyState } from '@/components/ui';
import { CameraCapture } from '@/components/CameraCapture';

type Today = { checkedIn: boolean; checkedOut: boolean; record: { checkInAt?: string; checkOutAt?: string; lateMinutes: number; workedMinutes: number } | null };
type Row = { id: string; date: string; status: string; checkInAt?: string | null; checkOutAt?: string | null; workedMinutes: number; lateMinutes: number; user?: { name: string; employeeCode?: string | null } };

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { data: session } = useSession();
  const isManager = !!session && session.user.role !== 'TECHNICIAN';

  const [today, setToday] = useState<Today | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [mode, setMode] = useState<'in' | 'out' | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ perPage: '200' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const [t, h] = await Promise.all([
      apiGet<Today>('/api/attendance/today'),
      apiGet<{ items: Row[] }>(`/api/attendance?${params}`),
    ]);
    setToday(t);
    setRows(h.items);
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (!today) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  // Today's roster summary (managers): unique staff present today.
  const todayStr = new Date().toISOString().slice(0, 10);
  const todays = rows.filter((r) => r.date.slice(0, 10) === todayStr);
  const presentToday = todays.filter((r) => r.status === 'PRESENT' || r.status === 'HALF_DAY').length;
  const lateToday = todays.filter((r) => r.lateMinutes > 0).length;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Attendance</h1>

      {/* Personal check-in / out */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Your status · {new Date().toDateString()}</p>
            {today.record ? (
              <div className="mt-1 flex gap-4 text-sm">
                <span>In: <b>{today.record.checkInAt ? new Date(today.record.checkInAt).toLocaleTimeString() : '—'}</b></span>
                <span>Out: <b>{today.record.checkOutAt ? new Date(today.record.checkOutAt).toLocaleTimeString() : '—'}</b></span>
                {today.record.lateMinutes > 0 && <span className="text-amber-600">Late {today.record.lateMinutes}m</span>}
              </div>
            ) : <p className="text-lg font-semibold">Not checked in</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setMode('in')} disabled={today.checkedIn} className="btn-primary"><LogIn className="h-4 w-4" /> Check In</button>
            <button onClick={() => setMode('out')} disabled={!today.checkedIn || today.checkedOut} className="btn-ghost"><LogOut className="h-4 w-4" /> Check Out</button>
          </div>
        </div>
      </Card>

      {/* Manager-only: all-staff roster */}
      {isManager && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard label="Records (range)" value={rows.length} />
          <StatCard label="Present Today" value={presentToday} accent="text-emerald-600" />
          <StatCard label="Late Today" value={lateToday} accent="text-amber-600" />
        </div>
      )}

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">{isManager ? 'All Staff Attendance' : 'My History'}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input w-auto py-1.5 text-sm" />
            <span className="text-slate-400">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input w-auto py-1.5 text-sm" />
            {isManager && (
              <a href={`/api/reports/attendance?format=csv&from=${from}&to=${to}`} className="btn-ghost py-1.5 text-sm"><Download className="h-4 w-4" /> CSV</a>
            )}
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState title="No attendance records" hint="Adjust the date range above." />
        ) : (
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  {isManager && <th className="th">Staff</th>}
                  <th className="th">Date</th><th className="th">Status</th><th className="th">In</th><th className="th">Out</th><th className="th">Hours</th><th className="th">Late</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    {isManager && (
                      <td className="td font-medium">{r.user?.name ?? '—'}{r.user?.employeeCode && <span className="ml-1 text-xs text-slate-400">({r.user.employeeCode})</span>}</td>
                    )}
                    <td className="td">{new Date(r.date).toLocaleDateString()}</td>
                    <td className="td"><StatusBadge status={r.status} /></td>
                    <td className="td">{r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString() : '—'}</td>
                    <td className="td">{r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString() : '—'}</td>
                    <td className="td">{(r.workedMinutes / 60).toFixed(1)}h</td>
                    <td className="td">{r.lateMinutes > 0 ? <span className="text-amber-600">{r.lateMinutes}m</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
