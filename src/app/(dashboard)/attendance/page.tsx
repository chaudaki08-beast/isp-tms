'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { LogIn, LogOut, MapPin, Download, CalendarDays } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/client';
import { getCurrentPosition } from '@/lib/geo';
import { Card, StatCard, Spinner, StatusBadge, Modal, EmptyState, Field } from '@/components/ui';
import { CameraCapture } from '@/components/CameraCapture';
import { WEEKDAYS, WEEKDAYS_SHORT } from '@/lib/labels';

type Today = { checkedIn: boolean; checkedOut: boolean; record: { checkInAt?: string; checkOutAt?: string; lateMinutes: number; workedMinutes: number } | null };
type Row = { id: string; date: string; status: string; checkInAt?: string | null; checkOutAt?: string | null; workedMinutes: number; lateMinutes: number; user?: { name: string; employeeCode?: string | null } };
type SummaryRow = { id: string; name: string; employeeCode?: string | null; defaultWeekOff: number; weekOff: number; workingDays: number; present: number; halfDay: number; leave: number; absent: number; late: number; workedHours: number; percentage: number };
type CalDay = { day: number; dow: number; status: string; late: number };

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AttendancePage() {
  const { data: session } = useSession();
  const isManager = !!session && session.user.role !== 'TECHNICIAN';

  const [today, setToday] = useState<Today | null>(null);
  const [view, setView] = useState<'records' | 'summary'>('records');
  const [mode, setMode] = useState<'in' | 'out' | null>(null);

  const loadToday = useCallback(async () => setToday(await apiGet<Today>('/api/attendance/today')), []);
  useEffect(() => { loadToday(); }, [loadToday]);

  if (!today) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Attendance</h1>

      {/* Personal check-in / out */}
      <Card>
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

      {isManager ? (
        <>
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
            <button onClick={() => setView('records')} className={`rounded-md px-4 py-1.5 text-sm font-medium ${view === 'records' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Daily Records</button>
            <button onClick={() => setView('summary')} className={`rounded-md px-4 py-1.5 text-sm font-medium ${view === 'summary' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Monthly Summary</button>
          </div>
          {view === 'records' ? <RecordsView isManager /> : <MonthlySummary />}
        </>
      ) : (
        <RecordsView isManager={false} />
      )}

      {mode && <PunchModal mode={mode} onClose={() => setMode(null)} onDone={loadToday} />}
    </div>
  );
}

// ── Daily records table ──────────────────────────────────────────────────────
function RecordsView({ isManager }: { isManager: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ perPage: '200', from, to });
    const h = await apiGet<{ items: Row[] }>(`/api/attendance?${params}`);
    setRows(h.items);
    setLoading(false);
  }, [from, to]);
  useEffect(() => { load(); }, [load]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todays = rows.filter((r) => r.date.slice(0, 10) === todayStr);
  const presentToday = todays.filter((r) => r.status === 'PRESENT' || r.status === 'HALF_DAY').length;
  const lateToday = todays.filter((r) => r.lateMinutes > 0).length;

  return (
    <>
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
            {isManager && <a href={`/api/reports/attendance?format=csv&from=${from}&to=${to}`} className="btn-ghost py-1.5 text-sm"><Download className="h-4 w-4" /> CSV</a>}
          </div>
        </div>
        {loading ? <div className="flex justify-center py-10"><Spinner className="h-7 w-7" /></div> : rows.length === 0 ? (
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
                    {isManager && <td className="td font-medium">{r.user?.name ?? '—'}{r.user?.employeeCode && <span className="ml-1 text-xs text-slate-400">({r.user.employeeCode})</span>}</td>}
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
    </>
  );
}

// ── Monthly per-staff summary ────────────────────────────────────────────────
function MonthlySummary() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<{ staff: SummaryRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [markFor, setMarkFor] = useState<SummaryRow | null>(null);
  const [calFor, setCalFor] = useState<SummaryRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setData(await apiGet<{ staff: SummaryRow[] }>(`/api/attendance/summary?month=${month}`));
    setLoading(false);
  }, [month]);
  useEffect(() => { load(); }, [load]);

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-brand-600" />
          <h3 className="font-semibold">Monthly Summary</h3>
        </div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input w-auto py-1.5 text-sm" />
      </div>

      {loading ? <div className="flex justify-center py-10"><Spinner className="h-7 w-7" /></div> : !data || data.staff.length === 0 ? (
        <EmptyState title="No staff found" />
      ) : (
        <div className="table-wrap">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-800/50">
              <tr>
                <th className="th">Staff</th><th className="th">Week Off</th><th className="th">Work Days</th><th className="th">Present</th><th className="th">Half-day</th>
                <th className="th">Leave</th><th className="th">Absent</th><th className="th">Late</th>
                <th className="th">Attendance</th><th className="th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.staff.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="td font-medium">{s.name}{s.employeeCode && <span className="ml-1 text-xs text-slate-400">({s.employeeCode})</span>}</td>
                  <td className="td text-xs">{WEEKDAYS[s.defaultWeekOff]} <span className="text-slate-400">({s.weekOff})</span></td>
                  <td className="td">{s.workingDays}</td>
                  <td className="td font-semibold text-emerald-600">{s.present}</td>
                  <td className="td">{s.halfDay}</td>
                  <td className="td text-blue-600">{s.leave}</td>
                  <td className="td text-red-600">{s.absent}</td>
                  <td className="td text-amber-600">{s.late}</td>
                  <td className="td">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                        <div className={`h-full ${s.percentage >= 75 ? 'bg-emerald-500' : s.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(100, s.percentage)}%` }} />
                      </div>
                      <span className="text-xs font-medium">{s.percentage}%</span>
                    </div>
                  </td>
                  <td className="td">
                    <div className="flex gap-2 text-xs">
                      <button onClick={() => setCalFor(s)} className="text-brand-600 hover:underline">Calendar</button>
                      <button onClick={() => setMarkFor(s)} className="text-brand-600 hover:underline">Mark</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {markFor && <MarkLeaveModal staff={markFor} onClose={() => setMarkFor(null)} onDone={load} />}
      {calFor && <CalendarModal staff={calFor} month={month} onClose={() => setCalFor(null)} />}
    </Card>
  );
}

const DAY_STYLE: Record<string, { bg: string; label: string }> = {
  PRESENT: { bg: 'bg-emerald-500 text-white', label: 'Present' },
  HALF_DAY: { bg: 'bg-amber-400 text-white', label: 'Half-day' },
  ON_LEAVE: { bg: 'bg-blue-500 text-white', label: 'Leave' },
  ABSENT: { bg: 'bg-red-500 text-white', label: 'Absent' },
  WEEK_OFF: { bg: 'bg-slate-300 text-slate-600 dark:bg-slate-700 dark:text-slate-300', label: 'Week off' },
  FUTURE: { bg: 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600', label: '' },
};

function CalendarModal({ staff, month, onClose }: { staff: SummaryRow; month: string; onClose: () => void }) {
  const [data, setData] = useState<{ firstDow: number; days: CalDay[] } | null>(null);

  useEffect(() => {
    apiGet<{ firstDow: number; days: CalDay[] }>(`/api/attendance/calendar?userId=${staff.id}&month=${month}`).then(setData).catch(() => {});
  }, [staff.id, month]);

  return (
    <Modal open onClose={onClose} title={`${staff.name} · ${month}`} wide>
      {!data ? <div className="flex justify-center py-10"><Spinner className="h-7 w-7" /></div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS_SHORT.map((d) => <div key={d} className="text-center text-xs font-semibold text-slate-400">{d}</div>)}
            {Array.from({ length: data.firstDow }).map((_, i) => <div key={`pad-${i}`} />)}
            {data.days.map((d) => {
              const st = DAY_STYLE[d.status] ?? DAY_STYLE.FUTURE;
              return (
                <div key={d.day} className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm font-medium ${st.bg}`} title={st.label}>
                  <span>{d.day}</span>
                  {d.late > 0 && <span className="text-[9px] leading-none">late</span>}
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(DAY_STYLE).filter(([k]) => k !== 'FUTURE').map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5"><span className={`h-3 w-3 rounded ${v.bg}`} />{v.label}</span>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function MarkLeaveModal({ staff, onClose, onDone }: { staff: SummaryRow; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('ON_LEAVE');
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try { await apiPost('/api/attendance/mark', { userId: staff.id, date, status }); onDone(); onClose(); }
    finally { setSaving(false); }
  }
  return (
    <Modal open onClose={onClose} title={`Mark attendance — ${staff.name}`}>
      <div className="space-y-3">
        <Field label="Date"><input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Status">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ON_LEAVE">On Leave</option>
            <option value="WEEK_OFF">Week Off (this date)</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="PRESENT">Present</option>
            <option value="ABSENT">Absent (clear record)</option>
          </select>
        </Field>
        <button onClick={save} disabled={saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Save'}</button>
      </div>
    </Modal>
  );
}

function PunchModal({ mode, onClose, onDone }: { mode: 'in' | 'out'; onClose: () => void; onDone: () => void }) {
  const [selfie, setSelfie] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { getCurrentPosition().then(setCoords).catch((e) => setError(e.message)); }, []);

  async function submit() {
    if (!coords) { setError('Waiting for GPS location…'); return; }
    setSaving(true);
    setError('');
    try {
      await apiPost(`/api/attendance/check-${mode}`, { lat: coords.lat, lng: coords.lng, selfie });
      onDone();
      onClose();
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
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
