'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, AlertTriangle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { CategoryHeatmap } from '@/components/charts/category-heatmap';
import { CATEGORY_NAMES, MATURITY_LABELS, MATURITY_COLORS } from '@/lib/constants';
import type { MaturityStatus } from '@/lib/constants';

interface GapEntry {
  pcf_element_hierarchy_id: string;
  pcf_name: string;
  pcf_level: number;
  category_number: number;
  maturity_status: MaturityStatus;
  maturity_score: number;
  client_process_name: string | null;
  responsible_area: string | null;
}

interface CategoryStat {
  category_number: number;
  total: number;
  evaluated: number;
  inexistente: number;
  parcial: number;
  documentado: number;
  implementado: number;
  optimizado: number;
  avg_score: number | null;
}

interface Stats {
  overall: {
    total: number;
    evaluated: number;
    inexistente: number;
    parcial: number;
  };
  categoryStats: CategoryStat[];
  gaps: GapEntry[];
}

export default function GapAnalysisPage() {
  const { orgId, evalId } = useParams<{ orgId: string; evalId: string }>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/evaluations/${evalId}/stats`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      });
  }, [evalId]);

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const gaps = selectedCategory
    ? stats.gaps.filter((g) => g.category_number === selectedCategory)
    : stats.gaps;

  const inexistentes = gaps.filter((g) => g.maturity_status === 'inexistente');
  const parciales = gaps.filter((g) => g.maturity_status === 'parcial');

  // Category gap summary
  const categoryGaps = stats.categoryStats.map((cat) => ({
    ...cat,
    gapCount: Number(cat.inexistente) + Number(cat.parcial),
    gapPct: Number(cat.evaluated) > 0
      ? Math.round(((Number(cat.inexistente) + Number(cat.parcial)) / Number(cat.evaluated)) * 100)
      : 0,
  })).sort((a, b) => b.gapPct - a.gapPct);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/organizations/${orgId}/evaluations/${evalId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex-1">Análisis de brechas</h1>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Procesos inexistentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{Number(stats.overall.inexistente)}</div>
            <p className="text-xs text-muted-foreground">No existen en la organización</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Procesos parciales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{Number(stats.overall.parcial)}</div>
            <p className="text-xs text-muted-foreground">Existen pero incompletos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de brechas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Number(stats.overall.inexistente) + Number(stats.overall.parcial)}
            </div>
            <p className="text-xs text-muted-foreground">
              de {Number(stats.overall.evaluated)} evaluados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de calor por categoría</CardTitle>
          <CardDescription>Haz clic en una categoría para filtrar las brechas. Color = score promedio de madurez.</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryHeatmap
            data={stats.categoryStats}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </CardContent>
      </Card>

      {/* Category ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Categorías por nivel de brecha</CardTitle>
          <CardDescription>Ordenadas por porcentaje de procesos con brechas (inexistente + parcial)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {categoryGaps.map((cat) => (
              <button
                key={cat.category_number}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                  selectedCategory === cat.category_number ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                }`}
                onClick={() => setSelectedCategory(
                  selectedCategory === cat.category_number ? null : cat.category_number
                )}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {cat.category_number}.0 — {CATEGORY_NAMES[cat.category_number]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {cat.gapCount} brechas de {Number(cat.evaluated)} evaluados
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${cat.gapPct > 50 ? 'text-red-500' : cat.gapPct > 25 ? 'text-orange-500' : 'text-green-600'}`}>
                    {cat.gapPct}%
                  </p>
                  <p className="text-xs text-muted-foreground">brechas</p>
                </div>
                <div className="w-24 bg-muted rounded-full h-2">
                  <div
                    className="rounded-full h-2"
                    style={{
                      width: `${cat.gapPct}%`,
                      backgroundColor: cat.gapPct > 50 ? '#FC8181' : cat.gapPct > 25 ? '#F6AD55' : '#68D391',
                    }}
                  />
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gap details */}
      {inexistentes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Procesos inexistentes
              {selectedCategory && (
                <Badge variant="outline" className="ml-2">
                  {selectedCategory}.0 — {CATEGORY_NAMES[selectedCategory]}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Procesos APQC que no existen en la organización — prioridad alta</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Proceso APQC</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead>Categoría</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inexistentes.map((g) => (
                  <TableRow key={g.pcf_element_hierarchy_id}>
                    <TableCell className="font-mono text-xs">{g.pcf_element_hierarchy_id}</TableCell>
                    <TableCell>{g.pcf_name}</TableCell>
                    <TableCell>{g.pcf_level}</TableCell>
                    <TableCell className="text-sm">{CATEGORY_NAMES[g.category_number]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {parciales.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Procesos parciales
              {selectedCategory && (
                <Badge variant="outline" className="ml-2">
                  {selectedCategory}.0 — {CATEGORY_NAMES[selectedCategory]}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Procesos que existen pero están incompletos — prioridad media</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Proceso APQC</TableHead>
                  <TableHead>Nombre del cliente</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Categoría</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parciales.map((g) => (
                  <TableRow key={g.pcf_element_hierarchy_id}>
                    <TableCell className="font-mono text-xs">{g.pcf_element_hierarchy_id}</TableCell>
                    <TableCell>{g.pcf_name}</TableCell>
                    <TableCell className="text-sm">{g.client_process_name || '—'}</TableCell>
                    <TableCell className="text-sm">{g.responsible_area || '—'}</TableCell>
                    <TableCell className="text-sm">{CATEGORY_NAMES[g.category_number]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {gaps.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {selectedCategory
                ? 'No hay brechas en esta categoría. Selecciona otra o quita el filtro.'
                : 'No se encontraron brechas. Evalúa más procesos para ver resultados.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
