'use client';

import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CATEGORY_NAMES } from '@/lib/constants';

interface CategoryStat {
  category_number: number;
  avg_score: number | null;
  total: number;
  evaluated: number;
}

export function CategoryRadarChart({ data }: { data: CategoryStat[] }) {
  const chartData = data.map((d) => ({
    category: `${d.category_number}.0`,
    fullName: CATEGORY_NAMES[d.category_number] || `Cat ${d.category_number}`,
    score: d.avg_score ? Number(d.avg_score) : 0,
    completeness: d.total > 0 ? Math.round((Number(d.evaluated) / Number(d.total)) * 100) : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <RechartsRadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
        <PolarGrid strokeDasharray="3 3" />
        <PolarAngleAxis
          dataKey="category"
          tick={{ fontSize: 12 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 5]}
          tickCount={6}
          tick={{ fontSize: 10 }}
        />
        <Radar
          name="Score promedio"
          dataKey="score"
          stroke="#4F46E5"
          fill="#4F46E5"
          fillOpacity={0.3}
          strokeWidth={2}
        />
        <Tooltip
          content={({ payload }) => {
            if (!payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">
                <p className="font-medium">{d.fullName}</p>
                <p>Score: <strong>{d.score}</strong> / 5</p>
                <p>Completado: {d.completeness}%</p>
              </div>
            );
          }}
        />
      </RechartsRadarChart>
    </ResponsiveContainer>
  );
}
