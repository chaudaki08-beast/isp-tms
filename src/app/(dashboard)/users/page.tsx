'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Plus } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/client';
import { Card, Spinner, EmptyState, Modal, Field, StatusBadge } from '@/components/ui';
import { humanize } from '@/lib/labels';

type User = { id: string; name: string; email: string; mobile?: string | null; role: string; status: string; teamLeader?: { name: string } | null };

export default function UsersPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'SUPER_ADMIN';

  const [items, setItems] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ perPage: '100' });
    if (role) params.set('role', role);
    const data = await apiGet<{ items: User[] }>(`/api/users?${params}`);
    setItems(data.items);
    setLoading(false);
  }, [role]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        {isAdmin && <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add User</button>}
      </div>

      <select className="input w-48" value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="">All roles</option>
        <option value="SUPER_ADMIN">Super Admin</option>
        <option value="TEAM_LEADER">Team Leader</option>
        <option value="TECHNICIAN">Technician</option>
      </select>

      {loading ? <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
        : items.length === 0 ? <Card><EmptyState title="No users" /></Card> : (
          <div className="table-wrap bg-white dark:bg-slate-900">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th">Team Leader</th><th className="th">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((u) => (
                  <tr key={u.id}>
                    <td className="td font-medium">{u.name}<p className="text-xs text-slate-400">{u.mobile}</p></td>
                    <td className="td">{u.email}</td>
                    <td className="td">{humanize(u.role)}</td>
                    <td className="td">{u.teamLeader?.name ?? '—'}</td>
                    <td className="td"><StatusBadge status={u.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onDone={load} />}
    </div>
  );
}

function CreateUserModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [leaders, setLeaders] = useState<User[]>([]);
  const [form, setForm] = useState({ name: '', email: '', mobile: '', password: '', role: 'TECHNICIAN', teamLeaderId: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => { apiGet<{ items: User[] }>('/api/users?role=TEAM_LEADER&perPage=100').then((d) => setLeaders(d.items)).catch(() => {}); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try { await apiPost('/api/users', { ...form, teamLeaderId: form.teamLeaderId || null }); onDone(); onClose(); }
    catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="Add User" wide>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        {error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Field label="Name"><input className="input" value={form.name} onChange={set('name')} required /></Field>
        <Field label="Email"><input type="email" className="input" value={form.email} onChange={set('email')} required /></Field>
        <Field label="Mobile"><input className="input" value={form.mobile} onChange={set('mobile')} /></Field>
        <Field label="Password"><input type="password" className="input" value={form.password} onChange={set('password')} required minLength={8} /></Field>
        <Field label="Role"><select className="input" value={form.role} onChange={set('role')}><option value="TECHNICIAN">Technician</option><option value="TEAM_LEADER">Team Leader</option><option value="SUPER_ADMIN">Super Admin</option></select></Field>
        {form.role === 'TECHNICIAN' && <Field label="Team Leader"><select className="input" value={form.teamLeaderId} onChange={set('teamLeaderId')}><option value="">None</option>{leaders.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>}
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-ghost">Cancel</button><button className="btn-primary" disabled={saving}>Create</button></div>
      </form>
    </Modal>
  );
}
