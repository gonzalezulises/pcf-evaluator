'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, Search } from 'lucide-react';
import Link from 'next/link';
import { CategoryRadarChart } from '@/components/charts/radar-chart';
import { MaturityStackedBars } from '@/components/charts/maturity-bars';
import { CompletenessDonut } from '@/components/charts/completeness-donut';
import { CATEGORY_NAMES, MATURITY_LABELS, MATURITY_COLORS } from '@/lib/constants';
import type { MaturityStatus } from '@/lib/constants';

interface Stats {
  overall: {
    total: number;
    evaluated: number;
    pending: number;
    inexistente: number;
    parcial: number;
    documentado: number;
    implementado: number;
    optimizado: number;
    not_applicable: number;
    avg_score: number | null;
  };
  categoryStats: Array<{
    category_number: number;
    total: number;
    evaluated: number;
    inexistente: number;
    parcial: number;
    documentado: number;
    implementado: number;
    optimizado: number;
    avg_score: number | null;
  }>;
  levelStats: Array<{
    level: number;
    total: number;
    evaluated: number;
    avg_score: number | null;
  }>;
  gaps: Array<{
    pcf_element_hierarchy_id: string;
    pcf_name: string;
    pcf_level: number;
    category_number: number;
    maturity_status: MaturityStatus;
    maturity_score: number;
    client_process_name: string | null;
    responsible_area: string | null;
  }>;
}

interface Entry {
  id: number;
  pcf_element_hierarchy_id: string;
  maturity_status: MaturityStatus;
  maturity_score: number | null;
  client_process_name: string | null;
  responsible_area: string | null;
  responsible_person: string | null;
  pcf_name: string;
  pcf_level: number;
  category_number: number;
  is_applicable: boolean;
}

export default function ReportPage() {
  const { orgId, evalId } = useParams<{ orgId: string; evalId: string }>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    Promise.all([
      fetch(`/api/evaluations/${evalId}/stats`).then((r) => r.json()),
      fetch(`/api/evaluations/${evalId}/entries`).then((r) => r.json()),
    ]).then(([statsData, entriesData]) => {
      setStats(statsData);
      setEntries(entriesData);
      setLoading(false);
    });
  }, [evalId]);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const filteredEntries = entries.filter((e) => {
    if (filterCategory !== 'all' && e.category_number !== Number(filterCategory)) return false;
    if (filterStatus !== 'all' && e.maturity_status !== filterStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.pcf_name.toLowerCase().includes(q) ||
        e.pcf_element_hierarchy_id.includes(q) ||
        (e.client_process_name && e.client_process_name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const o = stats.overall;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/organizations/${orgId}/evaluations/${evalId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex-1">Reporte de evaluación</h1>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Score promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{o.avg_score ?? '—'}</div>
            <p className="text-xs text-muted-foreground">de 5.0 posible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Procesos evaluados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Number(o.evaluated)}</div>
            <p className="text-xs text-muted-foreground">de {Number(o.total)} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Brechas críticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{Number(o.inexistente)}</div>
            <p className="text-xs text-muted-foreground">procesos inexistentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Brechas parciales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{Number(o.parcial)}</div>
            <p className="text-xs text-muted-foreground">procesos parciales</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Madurez por categoría APQC</CardTitle>
            <CardDescription>Score promedio (0-5) por cada categoría del PCF</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryRadarChart data={stats.categoryStats} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Completitud</CardTitle>
            <CardDescription>Progreso de evaluación</CardDescription>
          </CardHeader>
          <CardContent>
            <CompletenessDonut
              evaluated={Number(o.evaluated)}
              pending={Number(o.pending)}
              notApplicable={Number(o.not_applicable)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Stacked bars */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de madurez por categoría</CardTitle>
          <CardDescription>Cantidad de procesos en cada nivel de madurez</CardDescription>
        </CardHeader>
        <CardContent>
          <MaturityStackedBars data={stats.categoryStats} />
        </CardContent>
      </Card>

      {/* Category detail table */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Evaluados</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead>Distribución</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.categoryStats.map((cat) => {
                const evaluated = Number(cat.evaluated);
                return (
                  <TableRow key={cat.category_number}>
                    <TableCell className="font-medium">
                      {cat.category_number}.0 — {CATEGORY_NAMES[cat.category_number]}
                    </TableCell>
                    <TableCell className="text-center">{Number(cat.total)}</TableCell>
                    <TableCell className="text-center">{evaluated}</TableCell>
                    <TableCell className="text-center font-medium">{cat.avg_score ?? '—'}</TableCell>
                    <TableCell>
                      {evaluated > 0 && (
                        <div className="flex gap-0.5 h-4 w-full max-w-[200px]">
                          {(['inexistente', 'parcial', 'documentado', 'implementado', 'optimizado'] as MaturityStatus[]).map((s) => {
                            const count = Number(cat[s as keyof typeof cat]);
                            if (count === 0) return null;
                            return (
                              <div
                                key={s}
                                className="rounded-sm"
                                style={{
                                  backgroundColor: MATURITY_COLORS[s],
                                  width: `${(count / evaluated) * 100}%`,
                                  minWidth: '4px',
                                }}
                                title={`${MATURITY_LABELS[s]}: ${count}`}
                              />
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed entries table with filters */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de procesos</CardTitle>
          <CardDescription>Tabla filtrable con todos los procesos evaluados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar proceso..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(CATEGORY_NAMES).map(([num, name]) => (
                  <SelectItem key={num} value={num}>{num}.0 — {name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {(Object.entries(MATURITY_LABELS) as [MaturityStatus, string][]).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Proceso APQC</TableHead>
                  <TableHead>Nombre del cliente</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.slice(0, 100).map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-mono text-xs">{entry.pcf_element_hierarchy_id}</TableCell>
                    <TableCell className="max-w-[250px] truncate">{entry.pcf_name}</TableCell>
                    <TableCell className="text-sm">{entry.client_process_name || '—'}</TableCell>
                    <TableCell className="text-sm">{entry.responsible_area || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: MATURITY_COLORS[entry.maturity_status],
                          color: entry.maturity_status === 'no_evaluado' ? undefined : '#000',
                        }}
                      >
                        {MATURITY_LABELS[entry.maturity_status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {entry.maturity_score ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredEntries.length > 100 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Mostrando 100 de {filteredEntries.length} resultados
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
