'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, PackagePlus, Pencil, Trash2 } from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiPut, apiDelete } from '@/lib/client';
import { Card, Spinner, EmptyState, Modal, Field } from '@/components/ui';
import { MATERIAL_CATEGORIES, humanize } from '@/lib/labels';

type Material = { id: string; name: string; sku?: string | null; category: string; unit: string; totalStock: number; reorderLevel: number; lowStock: boolean };
type Assignment = { id: string; assignedQty: number; usedQty: number; balanceQty: number; material: { name: string; unit: string }; technician?: { name: string } };
type Tech = { id: string; name: string };

export default function MaterialsPage() {
  const { data: session } = useSession();
  const isManager = session?.user?.role !== 'TECHNICIAN';

  const [materials, setMaterials] = useState<Material[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [assignFor, setAssignFor] = useState<Material | null>(null);

  async function removeMaterial(m: Material) {
    if (!confirm(`Delete material "${m.name}"?`)) return;
    await apiDelete(`/api/materials/${m.id}`);
    setMaterials((prev) => prev.filter((x) => x.id !== m.id));
  }

  const load = useCallback(async () => {
    setLoading(true);
    const [m, a] = await Promise.all([
      isManager ? apiGet<{ items: Material[] }>('/api/materials?perPage=100') : Promise.resolve({ items: [] as Material[] }),
      apiGet<{ items: Assignment[] }>('/api/material-assignments?perPage=100'),
    ]);
    setMaterials(m.items);
    setAssignments(a.items);
    setLoading(false);
  }, [isManager]);

  useEffect(() => { load(); }, [load]);

  async function setUsage(id: string, usedQty: number) {
    await apiPatch(`/api/material-assignments/${id}`, { usedQty });
    load();
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Materials</h1>
        {isManager && <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="h-4 w-4" /> Add Material</button>}
      </div>

      {isManager && (
        <Card>
          <h3 className="mb-3 font-semibold">Inventory</h3>
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr><th className="th">Material</th><th className="th">Category</th><th className="th">In Stock</th><th className="th">Reorder</th><th className="th"></th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {materials.map((m) => (
                  <tr key={m.id}>
                    <td className="td font-medium">{m.name}{m.lowStock && <span className="ml-2 badge bg-red-100 text-red-700">Low</span>}</td>
                    <td className="td">{humanize(m.category)}</td>
                    <td className="td">{m.totalStock} {m.unit}</td>
                    <td className="td">{m.reorderLevel}</td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setAssignFor(m)} className="btn-ghost py-1 text-xs"><PackagePlus className="h-4 w-4" /> Assign</button>
                        <button onClick={() => setEditMaterial(m)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600 dark:hover:bg-slate-800" title="Edit"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => removeMaterial(m)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30" title="Delete"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card>
        <h3 className="mb-3 font-semibold">{isManager ? 'Assignments' : 'My Materials'}</h3>
        {assignments.length === 0 ? <EmptyState title="No assignments" /> : (
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr><th className="th">Material</th>{isManager && <th className="th">Technician</th>}<th className="th">Assigned</th><th className="th">Used</th><th className="th">Balance</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="td font-medium">{a.material.name}</td>
                    {isManager && <td className="td">{a.technician?.name}</td>}
                    <td className="td">{a.assignedQty}</td>
                    <td className="td">
                      {isManager ? a.usedQty : (
                        <input type="number" min={0} max={a.assignedQty} defaultValue={a.usedQty}
                          onBlur={(e) => setUsage(a.id, Number(e.target.value))}
                          className="input w-20 py-1" />
                      )}
                    </td>
                    <td className="td font-medium">{a.balanceQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showCreate && <MaterialModal onClose={() => setShowCreate(false)} onDone={load} />}
      {editMaterial && <MaterialModal material={editMaterial} onClose={() => setEditMaterial(null)} onDone={load} />}
      {assignFor && <AssignModal material={assignFor} onClose={() => setAssignFor(null)} onDone={load} />}
    </div>
  );
}

function MaterialModal({ material, onClose, onDone }: { material?: Material; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({
    name: material?.name ?? '', sku: material?.sku ?? '', category: material?.category ?? 'ROUTER',
    unit: material?.unit ?? 'pcs', totalStock: material?.totalStock ?? 0, reorderLevel: material?.reorderLevel ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, totalStock: Number(form.totalStock), reorderLevel: Number(form.reorderLevel) };
    try {
      if (material) await apiPut(`/api/materials/${material.id}`, payload);
      else await apiPost('/api/materials', payload);
      onDone(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={material ? 'Edit Material' : 'Add Material'}>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><input className="input" value={form.name} onChange={set('name')} required /></Field>
        <Field label="SKU"><input className="input" value={form.sku} onChange={set('sku')} /></Field>
        <Field label="Category"><select className="input" value={form.category} onChange={set('category')}>{MATERIAL_CATEGORIES.map((c) => <option key={c} value={c}>{humanize(c)}</option>)}</select></Field>
        <Field label="Unit"><input className="input" value={form.unit} onChange={set('unit')} /></Field>
        <Field label="Total Stock"><input type="number" className="input" value={form.totalStock} onChange={set('totalStock')} /></Field>
        <Field label="Reorder Level"><input type="number" className="input" value={form.reorderLevel} onChange={set('reorderLevel')} /></Field>
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-ghost">Cancel</button><button className="btn-primary" disabled={saving}>Save</button></div>
      </form>
    </Modal>
  );
}

function AssignModal({ material, onClose, onDone }: { material: Material; onClose: () => void; onDone: () => void }) {
  const [techs, setTechs] = useState<Tech[]>([]);
  const [technicianId, setTechnicianId] = useState('');
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { apiGet<Tech[]>('/api/technicians').then(setTechs).catch(() => {}); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try { await apiPost('/api/materials/assign', { materialId: material.id, technicianId, assignedQty: Number(qty) }); onDone(); onClose(); }
    catch (err) { setError((err as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <Modal open onClose={onClose} title={`Assign ${material.name}`}>
      <form onSubmit={submit} className="space-y-3">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Field label="Technician"><select className="input" value={technicianId} onChange={(e) => setTechnicianId(e.target.value)} required><option value="">Select…</option>{techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label={`Quantity (available ${material.totalStock})`}><input type="number" min={1} max={material.totalStock} className="input" value={qty} onChange={(e) => setQty(Number(e.target.value))} /></Field>
        <button className="btn-primary w-full" disabled={saving}>Assign</button>
      </form>
    </Modal>
  );
}
