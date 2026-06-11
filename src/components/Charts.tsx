'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const BASE = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

export function LineChart({ labels, data, label }: { labels: string[]; data: number[]; label: string }) {
  return (
    <div className="h-64">
      <Line
        options={BASE}
        data={{
          labels,
          datasets: [
            {
              label,
              data,
              borderColor: '#2563eb',
              backgroundColor: 'rgba(37,99,235,0.12)',
              fill: true,
              tension: 0.35,
            },
          ],
        }}
      />
    </div>
  );
}

export function BarChart({ labels, data, label, color = '#2563eb' }: { labels: string[]; data: number[]; label: string; color?: string }) {
  return (
    <div className="h-64">
      <Bar
        options={BASE}
        data={{ labels, datasets: [{ label, data, backgroundColor: color, borderRadius: 6 }] }}
      />
    </div>
  );
}

export function DoughnutChart({ labels, data, colors }: { labels: string[]; data: number[]; colors: string[] }) {
  return (
    <div className="h-64">
      <Doughnut
        options={{ ...BASE, plugins: { legend: { display: true, position: 'bottom' } } }}
        data={{ labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0 }] }}
      />
    </div>
  );
}
