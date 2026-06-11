'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/client';
import { Card, Spinner } from '@/components/ui';
import { LineChart, BarChart, DoughnutChart } from '@/components/Charts';

type Analytics = {
  installationTrend: { month: string; count: number }[];
  complaintTrend: { month: string; count: number }[];
  attendanceTrend: { month: string; count: number }[];
  satisfaction: { rating: number; count: number }[];
  technicianPerformance: { name: string; completedTasks: number; ratingAvg: number }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => { apiGet<Analytics>('/api/analytics').then(setData).catch(() => {}); }, []);

  if (!data) return <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div>;

  const perf = data.technicianPerformance.slice(0, 8);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 font-semibold">Installation Trends</h3>
          <LineChart label="Installations" labels={data.installationTrend.map((d) => d.month)} data={data.installationTrend.map((d) => d.count)} />
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold">Complaint Trends</h3>
          <LineChart label="Complaints" labels={data.complaintTrend.map((d) => d.month)} data={data.complaintTrend.map((d) => d.count)} />
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold">Attendance Trends</h3>
          <BarChart label="Present days" labels={data.attendanceTrend.map((d) => d.month)} data={data.attendanceTrend.map((d) => d.count)} color="#10b981" />
        </Card>
        <Card>
          <h3 className="mb-4 font-semibold">Customer Satisfaction</h3>
          <DoughnutChart
            labels={data.satisfaction.map((s) => `${s.rating}★`)}
            data={data.satisfaction.map((s) => s.count)}
            colors={['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981']}
          />
        </Card>
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold">Technician Performance (completed jobs)</h3>
          <BarChart label="Completed" labels={perf.map((t) => t.name)} data={perf.map((t) => t.completedTasks)} />
        </Card>
      </div>
    </div>
  );
}
