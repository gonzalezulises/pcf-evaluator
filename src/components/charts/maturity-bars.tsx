'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CATEGORY_NAMES, MATURITY_COLORS, MATURITY_LABELS } from '@/lib/constants';
import type { MaturityStatus } from '@/lib/constants';

interface CategoryStat {
  category_number: number;
  inexistente: number;
  parcial: number;
  documentado: number;
  implementado: number;
  optimizado: number;
}

const statuses: MaturityStatus[] = ['inexistente', 'parcial', 'documentado', 'implementado', 'optimizado'];

export function MaturityStackedBars({ data }: { data: CategoryStat[] }) {
  const chartData = data.map((d) => ({
    name: `${d.category_number}.0`,
    fullName: CATEGORY_NAMES[d.category_number],
    inexistente: Number(d.inexistente),
    parcial: Number(d.parcial),
    documentado: Number(d.documentado),
    implementado: Number(d.implementado),
    optimizado: Number(d.optimizado),
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          content={({ payload, label }) => {
            if (!payload?.length) return null;
            const item = chartData.find((d) => d.name === label);
            return (
              <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
                <p className="font-medium mb-1">{item?.fullName}</p>
                {payload.map((p) => (
                  <div key={p.dataKey as string} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: p.color }} />
                    <span>{MATURITY_LABELS[p.dataKey as MaturityStatus]}: {p.value}</span>
                  </div>
                ))}
              </div>
            );
          }}
        />
        <Legend
          formatter={(value: string) => MATURITY_LABELS[value as MaturityStatus]}
          wrapperStyle={{ fontSize: 12 }}
        />
        {statuses.map((status) => (
          <Bar
            key={status}
            dataKey={status}
            stackId="maturity"
            fill={MATURITY_COLORS[status]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
