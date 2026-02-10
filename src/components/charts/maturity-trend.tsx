'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';

interface TrendPoint {
  id: number;
  name: string;
  created_at: string;
  avg_score: number | null;
  evaluated: number;
  total: number;
}

export function MaturityTrend({ orgId }: { orgId: string }) {
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/organizations/${orgId}/trend`)
      .then((r) => r.json())
      .then((data) => {
        setTrend(data.trend || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [orgId]);

  if (loading) return <Skeleton className="h-64" />;
  if (trend.length < 2) return null; // Need at least 2 evaluations for a trend

  const chartData = trend.map((t) => ({
    name: t.name.length > 20 ? t.name.slice(0, 20) + '...' : t.name,
    score: t.avg_score ? Number(t.avg_score) : 0,
    evaluados: Number(t.evaluated),
    fecha: new Date(t.created_at).toLocaleDateString('es-PA', {
      month: 'short',
      year: 'numeric',
    }),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Tendencia de madurez
        </CardTitle>
        <CardDescription>
          Evolución del score promedio entre evaluaciones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="fecha" fontSize={12} />
            <YAxis domain={[0, 5]} fontSize={12} />
            <Tooltip
              formatter={(value, name) => {
                if (name === 'score') return [Number(value).toFixed(2), 'Score promedio'];
                return [value, 'Evaluados'];
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#4F46E5"
              strokeWidth={2}
              dot={{ fill: '#4F46E5', r: 5 }}
              name="Score promedio"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
