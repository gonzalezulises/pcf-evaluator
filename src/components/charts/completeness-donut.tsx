'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Props {
  evaluated: number;
  pending: number;
  notApplicable: number;
}

export function CompletenessDonut({ evaluated, pending, notApplicable }: Props) {
  const data = [
    { name: 'Evaluados', value: evaluated, color: '#4F46E5' },
    { name: 'Pendientes', value: pending, color: '#E2E8F0' },
    ...(notApplicable > 0 ? [{ name: 'No aplica', value: notApplicable, color: '#94A3B8' }] : []),
  ].filter((d) => d.value > 0);

  const total = evaluated + pending + notApplicable;
  const pct = total > 0 ? Math.round((evaluated / total) * 100) : 0;

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            dataKey="value"
            startAngle={90}
            endAngle={-270}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div className="bg-background border rounded-lg p-2 shadow-lg text-sm">
                  <p>{d.name}: <strong>{d.value}</strong></p>
                </div>
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-3xl font-bold">{pct}%</p>
          <p className="text-xs text-muted-foreground">completado</p>
        </div>
      </div>
      <div className="flex justify-center gap-4 -mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: d.color }} />
            {d.name}: {d.value}
          </div>
        ))}
      </div>
    </div>
  );
}
