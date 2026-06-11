'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { apiGet } from '@/lib/client';
import { Card, Spinner } from '@/components/ui';

type TechRow = { technician: string; jobsAssigned: number; jobsCompleted: number; daysPresent: number; avgRating: string; avgResolutionMins: number };

export default function ReportsPage() {
  const [rows, setRows] = useState<TechRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<{ rows: TechRow[] }>('/api/reports/technician').then((d) => { setRows(d.rows); setLoading(false); });
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="grid gap-3 sm:grid-cols-3">
        <DownloadCard title="Technician Report" href="/api/reports/technician?format=csv" />
        <DownloadCard title="Complaint Report" href="/api/reports/complaint?format=csv" />
        <DownloadCard title="Attendance Report" href="/api/reports/attendance?format=csv" />
      </div>

      <Card>
        <h3 className="mb-3 font-semibold">Technician Performance</h3>
        {loading ? <div className="flex justify-center py-10"><Spinner className="h-7 w-7" /></div> : (
          <div className="table-wrap">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr><th className="th">Technician</th><th className="th">Assigned</th><th className="th">Completed</th><th className="th">Days Present</th><th className="th">Avg Rating</th><th className="th">Avg Resolution</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.technician}>
                    <td className="td font-medium">{r.technician}</td>
                    <td className="td">{r.jobsAssigned}</td>
                    <td className="td">{r.jobsCompleted}</td>
                    <td className="td">{r.daysPresent}</td>
                    <td className="td">{r.avgRating} ★</td>
                    <td className="td">{r.avgResolutionMins} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function DownloadCard({ title, href }: { title: string; href: string }) {
  return (
    <a href={href} className="card flex items-center justify-between transition hover:border-brand-400">
      <span className="font-medium">{title}</span>
      <Download className="h-5 w-5 text-brand-600" />
    </a>
  );
}
