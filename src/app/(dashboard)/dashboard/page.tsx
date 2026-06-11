'use client';

import { useEffect, useState } from 'react';
import {
  Wrench, AlertCircle, CheckCircle2, Clock, UserCheck, UserX, Users, IndianRupee,
} from 'lucide-react';
import { apiGet } from '@/lib/client';
import { StatCard, Card, Spinner, EmptyState } from '@/components/ui';
import { DoughnutChart } from '@/components/Charts';
import { humanize } from '@/lib/labels';
import { formatDistanceToNow } from 'date-fns';

type Dashboard = {
  cards: Record<string, number>;
  crm?: {
    totalCustomers: number; activeCustomers: number; pendingComplaints: number;
    activeOutages: number; monthRevenue: number; monthBilled: number;
    collectionRate: number; outstanding: number;
  };
  taskStatus: Record<string, number>;
  complaintStatus: Record<string, number>;
  attendanceSummary: { present: number; absent: number; total: number; percentage: number };
  technicianStatus: { id: string; name: string; attendance: string; activeTasks: number; checkedIn: boolean }[];
  recentActivities: { id: string; action: string; user: string; at: string }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    apiGet<Dashboard>('/api/dashboard').then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Card>{error}</Card>;
  if (!data) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const c = data.cards;
  const taskLabels = Object.keys(data.taskStatus);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Today's Installations" value={c.todaysInstallations} icon={Wrench} />
        <StatCard label="Today's Complaints" value={c.todaysComplaints} icon={AlertCircle} accent="text-orange-600" />
        <StatCard label="Completed Jobs" value={c.completedJobs} icon={CheckCircle2} accent="text-emerald-600" />
        <StatCard label="Pending Jobs" value={c.pendingJobs} icon={Clock} accent="text-amber-600" />
        <StatCard label="Present Technicians" value={c.presentTechnicians} icon={UserCheck} accent="text-emerald-600" />
        <StatCard label="Absent Technicians" value={c.absentTechnicians} icon={UserX} accent="text-red-600" />
        <StatCard label="Active Technicians" value={c.activeTechnicians} icon={Users} />
        <StatCard label="Revenue (This Month)" value={`₹${(c.revenue || 0).toLocaleString('en-IN')}`} icon={IndianRupee} accent="text-violet-600" />
      </div>

      {data.crm && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Business Overview</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total Customers" value={data.crm.totalCustomers} icon={Users} />
            <StatCard label="Active Services" value={data.crm.activeCustomers} icon={CheckCircle2} accent="text-emerald-600" />
            <StatCard label="Collection Rate" value={`${data.crm.collectionRate}%`} icon={IndianRupee} accent="text-brand-600" />
            <StatCard label="Outstanding" value={`₹${data.crm.outstanding.toLocaleString('en-IN')}`} icon={IndianRupee} accent="text-red-600" />
            <StatCard label="Pending Complaints" value={data.crm.pendingComplaints} icon={AlertCircle} accent="text-orange-600" />
            <StatCard label="Active Outages" value={data.crm.activeOutages} icon={Clock} accent="text-red-600" />
            <StatCard label="Billed (This Month)" value={`₹${data.crm.monthBilled.toLocaleString('en-IN')}`} icon={IndianRupee} />
            <StatCard label="Collected (This Month)" value={`₹${data.crm.monthRevenue.toLocaleString('en-IN')}`} icon={IndianRupee} accent="text-emerald-600" />
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h3 className="mb-4 font-semibold">Task Status</h3>
          {taskLabels.length ? (
            <DoughnutChart
              labels={taskLabels.map(humanize)}
              data={taskLabels.map((k) => data.taskStatus[k])}
              colors={['#94a3b8', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444']}
            />
          ) : (
            <EmptyState title="No tasks yet" />
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Complaint Status</h3>
          {Object.keys(data.complaintStatus).length ? (
            <DoughnutChart
              labels={Object.keys(data.complaintStatus).map(humanize)}
              data={Object.values(data.complaintStatus)}
              colors={['#94a3b8', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981']}
            />
          ) : (
            <EmptyState title="No complaints yet" />
          )}
        </Card>

        <Card>
          <h3 className="mb-2 font-semibold">Attendance Summary</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-emerald-600">{data.attendanceSummary.percentage}%</span>
            <span className="mb-1 text-sm text-slate-500">present today</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full bg-emerald-500" style={{ width: `${data.attendanceSummary.percentage}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div><p className="font-bold">{data.attendanceSummary.present}</p><p className="text-slate-500">Present</p></div>
            <div><p className="font-bold">{data.attendanceSummary.absent}</p><p className="text-slate-500">Absent</p></div>
            <div><p className="font-bold">{data.attendanceSummary.total}</p><p className="text-slate-500">Total</p></div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">Technician Status</h3>
          <div className="space-y-2">
            {data.technicianStatus.length === 0 && <EmptyState title="No technicians" />}
            {data.technicianStatus.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${t.checkedIn ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span>{t.activeTasks} active</span>
                  <span className="badge bg-slate-100 dark:bg-slate-800">{humanize(t.attendance)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Recent Activity</h3>
          <div className="space-y-3">
            {data.recentActivities.length === 0 && <EmptyState title="No recent activity" />}
            {data.recentActivities.map((a) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                <div>
                  <p>
                    <span className="font-medium">{a.user}</span>{' '}
                    <span className="text-slate-500">{humanize(a.action.replaceAll('.', ' '))}</span>
                  </p>
                  <p className="text-xs text-slate-400">{formatDistanceToNow(new Date(a.at), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
