'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPut, apiPost } from '@/lib/client';
import { Card, Spinner, Field } from '@/components/ui';
import { humanize } from '@/lib/labels';

type Profile = { id: string; name: string; email: string; mobile?: string | null; address?: string | null; role: string; employeeCode?: string | null; profilePhoto?: string | null };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { apiGet<Profile>('/api/profile').then(setProfile); }, []);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setMsg('');
    try {
      await apiPut('/api/profile', { name: profile.name, mobile: profile.mobile, address: profile.address });
      setMsg('Profile updated.');
    } catch (err) { setMsg((err as Error).message); }
    finally { setSaving(false); }
  }

  if (!profile) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Profile</h1>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">Personal Details</h3>
          {msg && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{msg}</p>}
          <form onSubmit={saveProfile} className="space-y-3">
            <Field label="Name"><input className="input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} /></Field>
            <Field label="Email"><input className="input" value={profile.email} disabled /></Field>
            <Field label="Mobile"><input className="input" value={profile.mobile ?? ''} onChange={(e) => setProfile({ ...profile, mobile: e.target.value })} /></Field>
            <Field label="Address"><input className="input" value={profile.address ?? ''} onChange={(e) => setProfile({ ...profile, address: e.target.value })} /></Field>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>Role: <b>{humanize(profile.role)}</b></span>
              {profile.employeeCode && <span>· Code: <b>{profile.employeeCode}</b></span>}
            </div>
            <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </form>
        </Card>

        <ChangePasswordCard />
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await apiPost('/api/auth/change-password', { currentPassword, newPassword });
      setMsg('Password changed.');
      setCurrent(''); setNew('');
    } catch (err) { setMsg((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Card>
      <h3 className="mb-4 font-semibold">Change Password</h3>
      {msg && <p className="mb-3 rounded-lg bg-slate-100 px-3 py-2 text-sm dark:bg-slate-800">{msg}</p>}
      <form onSubmit={submit} className="space-y-3">
        <Field label="Current Password"><input type="password" className="input" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} required /></Field>
        <Field label="New Password"><input type="password" className="input" value={newPassword} onChange={(e) => setNew(e.target.value)} required minLength={8} /></Field>
        <button className="btn-primary" disabled={saving}>{saving ? 'Updating…' : 'Update Password'}</button>
      </form>
    </Card>
  );
}
