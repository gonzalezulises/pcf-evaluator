'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Minus, GitCompareArrows } from 'lucide-react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { CATEGORY_NAMES, MATURITY_LABELS, MATURITY_COLORS } from '@/lib/constants';
import type { MaturityStatus } from '@/lib/constants';

interface Evaluation {
  id: number;
  name: string;
  created_at: string;
  evaluation_depth: number;
  evaluated_count?: number;
  total_count?: number;
}

interface OverallStat {
  evaluation_id: number;
  total: number;
  evaluated: number;
  avg_score: number | null;
  inexistente: number;
  parcial: number;
  documentado: number;
  implementado: number;
  optimizado: number;
}

interface CategoryStat {
  evaluation_id: number;
  category_number: number;
  total: number;
  evaluated: number;
  avg_score: number | null;
}

interface Change {
  pcf_element_hierarchy_id: string;
  pcf_name: string;
  category_number: number;
  pcf_level: number;
  status_a: MaturityStatus;
  score_a: number;
  status_b: MaturityStatus;
  score_b: number;
  delta: number;
}

export default function ComparePage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evalA, setEvalA] = useState<string>('');
  const [evalB, setEvalB] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<{
    evaluations: Evaluation[];
    overallStats: OverallStat[];
    categoryStats: CategoryStat[];
    changes: Change[];
  } | null>(null);

  // Load evaluations list
  useEffect(() => {
    fetch(`/api/organizations/${orgId}/evaluations`)
      .then((r) => r.json())
      .then((data) => {
        const evals = Array.isArray(data) ? data : [];
        setEvaluations(evals);
        if (evals.length >= 2) {
          setEvalA(String(evals[evals.length - 1].id)); // oldest
          setEvalB(String(evals[0].id)); // newest
        }
        setLoading(false);
      });
  }, [orgId]);

  const doCompare = async () => {
    if (!evalA || !evalB || evalA === evalB) return;
    setComparing(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/compare?a=${evalA}&b=${evalB}`);
      const data = await res.json();
      if (res.ok) setResult(data);
    } catch {
      // silently fail
    } finally {
      setComparing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  const statA = result?.overallStats.find((s) => String(s.evaluation_id) === evalA);
  const statB = result?.overallStats.find((s) => String(s.evaluation_id) === evalB);
  const evalInfoA = result?.evaluations.find((e) => String(e.id) === evalA);
  const evalInfoB = result?.evaluations.find((e) => String(e.id) === evalB);

  // Build category comparison chart data
  const categoryChartData = result ? (() => {
    const cats = new Set<number>();
    result.categoryStats.forEach((c) => cats.add(c.category_number));
    return Array.from(cats).sort((a, b) => a - b).map((catNum) => {
      const a = result.categoryStats.find((c) => c.category_number === catNum && String(c.evaluation_id) === evalA);
      const b = result.categoryStats.find((c) => c.category_number === catNum && String(c.evaluation_id) === evalB);
      return {
        category: `${catNum}.0`,
        fullName: CATEGORY_NAMES[catNum],
        scoreA: a?.avg_score ? Number(a.avg_score) : 0,
        scoreB: b?.avg_score ? Number(b.avg_score) : 0,
      };
    });
  })() : [];

  const improvements = result?.changes.filter((c) => c.delta > 0) || [];
  const regressions = result?.changes.filter((c) => c.delta < 0) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/organizations/${orgId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GitCompareArrows className="h-6 w-6" />
          Comparar evaluaciones
        </h1>
      </div>

      {/* Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleccionar evaluaciones</CardTitle>
          <CardDescription>Elige dos evaluaciones para comparar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px] space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Base (anterior)</p>
              <Select value={evalA} onValueChange={setEvalA}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {evaluations.map((ev) => (
                    <SelectItem key={ev.id} value={String(ev.id)} disabled={String(ev.id) === evalB}>
                      {ev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px] space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Comparar con (nueva)</p>
              <Select value={evalB} onValueChange={setEvalB}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {evaluations.map((ev) => (
                    <SelectItem key={ev.id} value={String(ev.id)} disabled={String(ev.id) === evalA}>
                      {ev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={doCompare} disabled={comparing || !evalA || !evalB || evalA === evalB}>
              {comparing ? 'Comparando...' : 'Comparar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && statA && statB && evalInfoA && evalInfoB && (
        <>
          {/* Overall comparison */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Score promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-3">
                  <span className="text-2xl font-bold text-muted-foreground">{statA.avg_score ?? '—'}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-2xl font-bold">{statB.avg_score ?? '—'}</span>
                  {statA.avg_score && statB.avg_score && (
                    <Badge className={Number(statB.avg_score) >= Number(statA.avg_score) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {Number(statB.avg_score) >= Number(statA.avg_score) ? '+' : ''}
                      {(Number(statB.avg_score) - Number(statA.avg_score)).toFixed(2)}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">de 5.0 posible</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Mejoras</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600 flex items-center gap-2">
                  <ArrowUpRight className="h-6 w-6" />
                  {improvements.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">procesos que mejoraron</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Retrocesos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-500 flex items-center gap-2">
                  <ArrowDownRight className="h-6 w-6" />
                  {regressions.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">procesos que empeoraron</p>
              </CardContent>
            </Card>
          </div>

          {/* Category comparison chart */}
          {categoryChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparación por categoría</CardTitle>
                <CardDescription>Score promedio por categoría APQC</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" fontSize={12} />
                    <YAxis domain={[0, 5]} fontSize={12} />
                    <Tooltip
                      formatter={(value, name) => [
                        Number(value).toFixed(2),
                        name === 'scoreA' ? evalInfoA.name : evalInfoB.name,
                      ]}
                      labelFormatter={(label) => {
                        const s = String(label);
                        const item = categoryChartData.find((d) => d.category === s);
                        return item ? `${s} — ${item.fullName}` : s;
                      }}
                    />
                    <Legend
                      formatter={(value: string) =>
                        value === 'scoreA' ? evalInfoA.name : evalInfoB.name
                      }
                    />
                    <Bar dataKey="scoreA" fill="#94A3B8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="scoreB" fill="#4F46E5" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Improvements table */}
          {improvements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                  Procesos que mejoraron ({improvements.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Proceso</TableHead>
                      <TableHead>Antes</TableHead>
                      <TableHead>Después</TableHead>
                      <TableHead className="text-center">Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {improvements.slice(0, 50).map((c) => (
                      <TableRow key={c.pcf_element_hierarchy_id}>
                        <TableCell className="font-mono text-xs">{c.pcf_element_hierarchy_id}</TableCell>
                        <TableCell className="max-w-[250px] truncate">{c.pcf_name}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: MATURITY_COLORS[c.status_a], color: '#000' }}>
                            {MATURITY_LABELS[c.status_a]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: MATURITY_COLORS[c.status_b], color: '#000' }}>
                            {MATURITY_LABELS[c.status_b]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium text-green-600">+{c.delta}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Regressions table */}
          {regressions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                  Procesos que empeoraron ({regressions.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Proceso</TableHead>
                      <TableHead>Antes</TableHead>
                      <TableHead>Después</TableHead>
                      <TableHead className="text-center">Delta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regressions.slice(0, 50).map((c) => (
                      <TableRow key={c.pcf_element_hierarchy_id}>
                        <TableCell className="font-mono text-xs">{c.pcf_element_hierarchy_id}</TableCell>
                        <TableCell className="max-w-[250px] truncate">{c.pcf_name}</TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: MATURITY_COLORS[c.status_a], color: '#000' }}>
                            {MATURITY_LABELS[c.status_a]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge style={{ backgroundColor: MATURITY_COLORS[c.status_b], color: '#000' }}>
                            {MATURITY_LABELS[c.status_b]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-medium text-red-500">{c.delta}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {improvements.length === 0 && regressions.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <Minus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No hay cambios entre las evaluaciones seleccionadas</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
