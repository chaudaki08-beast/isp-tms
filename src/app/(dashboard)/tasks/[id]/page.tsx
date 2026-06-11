'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useSession } from 'next-auth/react';
import { MapPin, Phone, Upload, PenLine, CheckCircle2 } from 'lucide-react';
import { apiGet, apiPost, apiPatch } from '@/lib/client';
import { Card, Spinner, StatusBadge, PriorityBadge, Modal, Field } from '@/components/ui';
import { CameraCapture } from '@/components/CameraCapture';
import { SignaturePad } from '@/components/SignaturePad';
import { IMAGE_TYPES, humanize } from '@/lib/labels';

type TaskImage = { id: string; type: string; url: string; caption?: string | null };
type Task = {
  id: string; code: string; customerName: string; customerMobile: string; address: string;
  lat?: number | null; lng?: number | null; type: string; status: string; priority: string;
  description?: string | null; assignedTo?: { id: string; name: string } | null;
  images: TaskImage[]; signature?: { signatureUrl: string; customerName: string; signedAt: string } | null;
  feedback?: { rating: number; comment?: string | null } | null;
};

const TECH_NEXT: Record<string, string | null> = { ASSIGNED: 'IN_PROGRESS', IN_PROGRESS: 'RESOLVED', RESOLVED: null };
const MANAGER_NEXT: Record<string, string | null> = { RESOLVED: 'COMPLETED' };

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isTech = role === 'TECHNICIAN';

  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState('');
  const [photoOpen, setPhotoOpen] = useState(false);
  const [signOpen, setSignOpen] = useState(false);

  const load = useCallback(async () => {
    try { setTask(await apiGet<Task>(`/api/tasks/${id}`)); }
    catch (e) { setError((e as Error).message); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(status: string) {
    await apiPatch(`/api/tasks/${id}/status`, { status });
    load();
  }

  if (error) return <Card>{error}</Card>;
  if (!task) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const nextStatus = isTech ? TECH_NEXT[task.status] : MANAGER_NEXT[task.status];
  const beforeImgs = task.images.filter((i) => i.type.startsWith('BEFORE'));
  const afterImgs = task.images.filter((i) => i.type.startsWith('AFTER') || i.type === 'OTHER');

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{task.code}</h1>
          <p className="text-sm text-slate-500">{humanize(task.type)}</p>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          <StatusBadge status={task.status} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info label="Customer" value={task.customerName} />
            <Info label="Mobile" value={<a className="text-brand-600" href={`tel:${task.customerMobile}`}><Phone className="mr-1 inline h-4 w-4" />{task.customerMobile}</a>} />
            <div className="sm:col-span-2"><Info label="Address" value={<span><MapPin className="mr-1 inline h-4 w-4 text-slate-400" />{task.address}</span>} /></div>
            {task.description && <div className="sm:col-span-2"><Info label="Description" value={task.description} /></div>}
            <Info label="Assigned To" value={task.assignedTo?.name ?? 'Unassigned'} />
          </div>

          {task.lat && task.lng && (
            <a className="btn-ghost w-full" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${task.lat},${task.lng}`}>
              <MapPin className="h-4 w-4" /> Open in Google Maps
            </a>
          )}
        </Card>

        <Card className="space-y-3">
          <h3 className="font-semibold">Workflow</h3>
          {nextStatus ? (
            <button onClick={() => changeStatus(nextStatus)} className="btn-primary w-full">
              <CheckCircle2 className="h-4 w-4" /> Mark {humanize(nextStatus)}
            </button>
          ) : (
            <p className="text-sm text-slate-500">No further action available for your role.</p>
          )}
          {(isTech || role) && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
            <>
              <button onClick={() => setPhotoOpen(true)} className="btn-ghost w-full"><Upload className="h-4 w-4" /> Upload Photo</button>
              <button onClick={() => setSignOpen(true)} className="btn-ghost w-full"><PenLine className="h-4 w-4" /> Capture Signature</button>
            </>
          )}
        </Card>
      </div>

      <PhotoGrid title="Before Work" images={beforeImgs} />
      <PhotoGrid title="After Work" images={afterImgs} />

      {task.signature && (
        <Card>
          <h3 className="mb-2 font-semibold">Customer Signature</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={task.signature.signatureUrl} alt="signature" className="h-32 rounded border border-slate-200 bg-white p-2 dark:border-slate-700" />
          <p className="mt-2 text-sm text-slate-500">Signed by {task.signature.customerName} on {new Date(task.signature.signedAt).toLocaleString()}</p>
        </Card>
      )}

      {photoOpen && <PhotoModal taskId={id} onClose={() => setPhotoOpen(false)} onDone={load} />}
      {signOpen && <SignModal taskId={id} defaultName={task.customerName} onClose={() => setSignOpen(false)} onDone={load} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><p className="text-xs uppercase tracking-wide text-slate-400">{label}</p><p className="text-sm font-medium">{value}</p></div>;
}

function PhotoGrid({ title, images }: { title: string; images: TaskImage[] }) {
  if (images.length === 0) return null;
  return (
    <Card>
      <h3 className="mb-3 font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((img) => (
          <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={img.type} className="aspect-square w-full rounded-lg object-cover" />
            <p className="mt-1 text-center text-[11px] text-slate-500">{humanize(img.type)}</p>
          </a>
        ))}
      </div>
    </Card>
  );
}

function PhotoModal({ taskId, onClose, onDone }: { taskId: string; onClose: () => void; onDone: () => void }) {
  const [type, setType] = useState('BEFORE_SITE');
  const [image, setImage] = useState('');
  const [saving, setSaving] = useState(false);

  async function upload() {
    if (!image) return;
    setSaving(true);
    try { await apiPost(`/api/tasks/${taskId}/images`, { type, image }); onDone(); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="Upload Task Photo">
      <div className="space-y-3">
        <Field label="Photo type"><select className="input" value={type} onChange={(e) => setType(e.target.value)}>{IMAGE_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}</select></Field>
        <CameraCapture facing="environment" onCapture={setImage} />
        <button onClick={upload} disabled={!image || saving} className="btn-primary w-full">{saving ? 'Uploading…' : 'Upload'}</button>
      </div>
    </Modal>
  );
}

function SignModal({ taskId, defaultName, onClose, onDone }: { taskId: string; defaultName: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(defaultName);
  const [sig, setSig] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!sig) return;
    setSaving(true);
    try { await apiPost(`/api/tasks/${taskId}/signature`, { customerName: name, signature: sig }); onDone(); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title="Customer Signature">
      <div className="space-y-3">
        <Field label="Customer name"><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Signature"><SignaturePad onChange={setSig} /></Field>
        <button onClick={save} disabled={!sig || saving} className="btn-primary w-full">{saving ? 'Saving…' : 'Save Signature'}</button>
      </div>
    </Modal>
  );
}
