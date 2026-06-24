'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/client';
import { Card, Spinner, EmptyState, Modal, Field, StatusBadge } from '@/components/ui';
import { humanize, WEEKDAYS } from '@/lib/labels';

type User = {
  id: string; name: string; email: string; mobile?: string | null; role: string; status: string;
  teamLeaderId?: string | null; teamLeader?: { name: string } | null; weekOff?: number | null;
};

const ROLES = ['SUPER_ADMIN', 'ADMIN', 'TEAM_LEADER', 'ACCOUNTANT', 'CALL_CENTER', 'TECHNICIAN'];

export default function UsersPage() {
  const { data: session } = useSession();
  const canManage = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'ADMIN';

  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ perPage: '100' });
    if (role) params.set('role', role);
    const data = await apiGet<{ items: User[] }>(`/api/users?${params}`);
    setItems(data.items);
    setLoading(false);
  }, [role]);

  useEffect(() => { load(); }, [load]);

  async function remove(u: User) {
    if (!confirm(`Deactivate ${u.name}?`)) return;
    await apiDelete(`/api/users/${u.id}`);
    load();
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        {canManage && <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add User</button>}
      </div>

      <select className="input w-48" value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="">All roles</option>
        {ROLES.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}
      </select>

      {loading ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        : items.length === 0 ? <Card><EmptyState title="No users" /></Card> : (
          <div className="table-wrap bg-white dark:bg-slate-900">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th">Week Off</th><th className="th">Status</th>{canManage && <th className="th"></th>}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="td font-medium">{u.name}<p className="text-xs text-slate-400">{u.mobile}</p></td>
                    <td className="td">{u.email}</td>
                    <td className="td">{humanize(u.role)}</td>
                    <td className="td">{u.weekOff != null ? WEEKDAYS[u.weekOff] : <span className="text-slate-400">—</span>}</td>
                    <td className="td"><StatusBadge status={u.status} /></td>
                    {canManage && (
                      <td className="td">
                        <div className="flex gap-1">
                          <button onClick={() => setEditUser(u)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800" title="Edit"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => remove(u)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30" title="Deactivate"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {showCreate && <UserModal onClose={() => setShowCreate(false)} onDone={load} />}
      {editUser && <UserModal user={editUser} onClose={() => setEditUser(null)} onDone={load} />}
    </div>
  );
}

function UserModal({ user, onClose, onDone }: { user?: User; onClose: () => void; onDone: () => void }) {
  const [leaders, setLeaders] = useState<User[]>([]);
  const [form, setForm] = useState({
    name: user?.name ?? '', email: user?.email ?? '', mobile: user?.mobile ?? '',
    password: '', role: user?.role ?? 'TECHNICIAN', teamLeaderId: user?.teamLeaderId ?? '',
    weekOff: user?.weekOff != null ? String(user.weekOff) : '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => { apiGet<{ items: User[] }>('/api/users?role=TEAM_LEADER&perPage=100').then((d) => setLeaders(d.items)).catch(() => {}); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload: Record<string, unknown> = {
      name: form.name, email: form.email, mobile: form.mobile, role: form.role,
      teamLeaderId: form.teamLeaderId || null,
      weekOff: form.weekOff === '' ? null : Number(form.weekOff),
    };
    if (form.password) payload.password = form.password;
    try {
      if (user) await apiPut(`/api/users/${user.id}`, payload);
      else await apiPost('/api/users', { ...payload, password: form.password });
      onDone(); onClose();
    } catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={user ? `Edit ${user.name}` : 'Add User'} wide>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        {error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Field label="Name"><input className="input" value={form.name} onChange={set('name')} required /></Field>
        <Field label="Email"><input type="email" className="input" value={form.email} onChange={set('email')} required /></Field>
        <Field label="Mobile"><input className="input" value={form.mobile} onChange={set('mobile')} /></Field>
        <Field label={user ? 'New Password (blank = keep)' : 'Password'}><input type="password" className="input" value={form.password} onChange={set('password')} required={!user} minLength={8} /></Field>
        <Field label="Role"><select className="input" value={form.role} onChange={set('role')}>{ROLES.map((r) => <option key={r} value={r}>{humanize(r)}</option>)}</select></Field>
        <Field label="Weekly Off Day"><select className="input" value={form.weekOff} onChange={set('weekOff')}><option value="">No weekly off</option>{WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></Field>
        {form.role === 'TECHNICIAN' && <div className="sm:col-span-2"><Field label="Team Leader"><select className="input" value={form.teamLeaderId} onChange={set('teamLeaderId')}><option value="">None</option>{leaders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field></div>}
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-ghost">Cancel</button><button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : user ? 'Save Changes' : 'Create'}</button></div>
      </form>
    </Modal>
  );
}
