'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, BarChart3, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { CATEGORY_NAMES } from '@/lib/constants';
import type { ClassificationResponse } from '@/components/classify-upload';

interface CoverageResponse {
  summary: {
    total: number;
    covered: number;
    coverage_pct: number;
    avg_maturity: number;
    gap_count: number;
  };
  by_category: {
    category_number: number;
    category_name: string;
    total: number;
    covered: number;
    coverage_pct: number;
    avg_maturity: number;
    maturity_distribution: Record<number, number>;
  }[];
  by_level: {
    level: number;
    total: number;
    covered: number;
    coverage_pct: number;
  }[];
  gaps: {
    hierarchy_id: string;
    name: string;
    level: number;
    category_number: number;
    category_name: string;
  }[];
}

interface Props {
  uploads: ClassificationResponse[];
  dgxUrl: string;
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Categoría',
  2: 'Grupo de procesos',
  3: 'Proceso',
  4: 'Actividad',
  5: 'Tarea',
};

function getCoverageColor(pct: number): string {
  if (pct >= 80) return '#68D391'; // green
  if (pct >= 60) return '#F6E05E'; // yellow
  if (pct >= 40) return '#F6AD55'; // orange
  if (pct >= 20) return '#FC8181'; // red
  return '#E2E8F0'; // gray
}

export function CoverageDashboard({ uploads, dgxUrl }: Props) {
  // Pre-select categories that appear in uploads
  const touchedCategories = new Set(
    uploads.flatMap((u) => u.results.map((r) => r.category_number))
  );
  const [selectedCategories, setSelectedCategories] = useState<Set<number>>(
    () => new Set(touchedCategories)
  );
  const [alignmentThreshold, setAlignmentThreshold] = useState(50);
  const [gapMaxLevel, setGapMaxLevel] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CoverageResponse | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  const toggleCategory = (cat: number) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const selectAllCategories = () => {
    setSelectedCategories(new Set(Array.from({ length: 13 }, (_, i) => i + 1)));
  };

  const clearAllCategories = () => {
    setSelectedCategories(new Set());
  };

  const analyzeCoverage = async () => {
    if (selectedCategories.size === 0) return;
    setError(null);
    setLoading(true);

    // Build covered elements from all uploads (deduplicate by hierarchy_id, highest alignment wins)
    const coveredMap = new Map<string, { hierarchy_id: string; alignment: number; suggested_maturity: number; filename: string }>();
    for (const upload of uploads) {
      for (const match of upload.results) {
        const existing = coveredMap.get(match.hierarchy_id);
        if (!existing || match.alignment > existing.alignment) {
          coveredMap.set(match.hierarchy_id, {
            hierarchy_id: match.hierarchy_id,
            alignment: match.alignment,
            suggested_maturity: match.suggested_maturity,
            filename: upload.filename,
          });
        }
      }
    }

    try {
      const res = await fetch(`${dgxUrl}/coverage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          covered_elements: Array.from(coveredMap.values()),
          category_filter: Array.from(selectedCategories).sort((a, b) => a - b),
          alignment_threshold: alignmentThreshold,
          gap_max_level: gapMaxLevel,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Error ${res.status}`);
      }

      const result: CoverageResponse = await res.json();
      setData(result);
      setSelectedCategory(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('No se pudo conectar al servicio DGX.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredGaps = data
    ? selectedCategory
      ? data.gaps.filter((g) => g.category_number === selectedCategory)
      : data.gaps
    : [];

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de análisis</CardTitle>
          <CardDescription>
            Selecciona las categorías APQC a analizar y ajusta los parámetros
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Category checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Categorías</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAllCategories}>
                  Todas
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={clearAllCategories}>
                  Ninguna
                </Button>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Procesos operativos</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedCategories.has(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    <span className="text-xs leading-tight">
                      <strong>{cat}.0</strong> {CATEGORY_NAMES[cat]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Procesos de gestión y soporte</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[7, 8, 9, 10, 11, 12, 13].map((cat) => (
                  <label
                    key={cat}
                    className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedCategories.has(cat)}
                      onCheckedChange={() => toggleCategory(cat)}
                    />
                    <span className="text-xs leading-tight">
                      <strong>{cat}.0</strong> {CATEGORY_NAMES[cat]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-sm font-medium">
                Umbral de alineación: {alignmentThreshold}%
              </label>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={alignmentThreshold}
                onChange={(e) => setAlignmentThreshold(Number(e.target.value))}
                className="w-full mt-1 accent-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Matches con alineación menor a este valor no se cuentan como cubiertos
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Profundidad de brechas</label>
              <select
                value={gapMaxLevel}
                onChange={(e) => setGapMaxLevel(Number(e.target.value))}
                className="w-full mt-1 rounded-md border px-3 py-2 text-sm"
              >
                <option value={3}>Nivel 3 — Procesos</option>
                <option value={4}>Nivel 4 — Actividades</option>
                <option value={5}>Nivel 5 — Tareas</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Nivel máximo del PCF a incluir en el listado de brechas
              </p>
            </div>
          </div>

          <Button
            onClick={analyzeCoverage}
            disabled={loading || selectedCategories.size === 0}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analizando cobertura...
              </>
            ) : (
              <>
                <BarChart3 className="h-4 w-4 mr-2" />
                Analizar cobertura
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-sm text-red-700">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Cobertura general
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold" style={{ color: getCoverageColor(data.summary.coverage_pct) }}>
                  {data.summary.coverage_pct}%
                </div>
                <p className="text-xs text-muted-foreground">de la arquitectura APQC</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  Elementos cubiertos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data.summary.covered}
                  <span className="text-lg text-muted-foreground font-normal">/{data.summary.total}</span>
                </div>
                <p className="text-xs text-muted-foreground">procesos PCF mapeados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Madurez promedio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.summary.avg_maturity}</div>
                <p className="text-xs text-muted-foreground">de 5.0 en elementos cubiertos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Brechas detectadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">{data.summary.gap_count}</div>
                <p className="text-xs text-muted-foreground">procesos sin cobertura</p>
              </CardContent>
            </Card>
          </div>

          {/* Coverage by category (heatmap) */}
          <Card>
            <CardHeader>
              <CardTitle>Cobertura por categoría</CardTitle>
              <CardDescription>
                Haz clic en una categoría para filtrar la tabla de brechas. Color = % de cobertura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Procesos operativos</p>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {data.by_category
                      .filter((c) => c.category_number <= 6)
                      .map((cat) => (
                        <button
                          key={cat.category_number}
                          className={`rounded-lg p-3 text-left transition-all ${
                            selectedCategory === cat.category_number
                              ? 'ring-2 ring-primary ring-offset-2'
                              : 'hover:opacity-80'
                          }`}
                          style={{ backgroundColor: getCoverageColor(cat.coverage_pct) }}
                          onClick={() =>
                            setSelectedCategory(
                              selectedCategory === cat.category_number ? null : cat.category_number
                            )
                          }
                        >
                          <p className="font-bold text-sm text-gray-900">{cat.category_number}.0</p>
                          <p className="text-xs text-gray-800 line-clamp-2 leading-tight mt-0.5">
                            {cat.category_name}
                          </p>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-lg font-bold text-gray-900">{cat.coverage_pct}%</span>
                          </div>
                          <p className="text-xs text-gray-700">
                            {cat.covered}/{cat.total}
                          </p>
                          {cat.avg_maturity > 0 && (
                            <p className="text-xs text-gray-600">Mad. {cat.avg_maturity}</p>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Procesos de gestión y soporte
                  </p>
                  <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
                    {data.by_category
                      .filter((c) => c.category_number >= 7)
                      .map((cat) => (
                        <button
                          key={cat.category_number}
                          className={`rounded-lg p-3 text-left transition-all ${
                            selectedCategory === cat.category_number
                              ? 'ring-2 ring-primary ring-offset-2'
                              : 'hover:opacity-80'
                          }`}
                          style={{ backgroundColor: getCoverageColor(cat.coverage_pct) }}
                          onClick={() =>
                            setSelectedCategory(
                              selectedCategory === cat.category_number ? null : cat.category_number
                            )
                          }
                        >
                          <p className="font-bold text-sm text-gray-900">{cat.category_number}.0</p>
                          <p className="text-xs text-gray-800 line-clamp-2 leading-tight mt-0.5">
                            {cat.category_name}
                          </p>
                          <div className="mt-2 flex items-baseline gap-1">
                            <span className="text-lg font-bold text-gray-900">{cat.coverage_pct}%</span>
                          </div>
                          <p className="text-xs text-gray-700">
                            {cat.covered}/{cat.total}
                          </p>
                          {cat.avg_maturity > 0 && (
                            <p className="text-xs text-gray-600">Mad. {cat.avg_maturity}</p>
                          )}
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coverage by level */}
          <Card>
            <CardHeader>
              <CardTitle>Cobertura por nivel</CardTitle>
              <CardDescription>Distribución de cobertura por profundidad del PCF</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.by_level.map((lvl) => (
                <div key={lvl.level} className="flex items-center gap-3">
                  <div className="w-32 shrink-0">
                    <p className="text-sm font-medium">
                      Nivel {lvl.level}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {LEVEL_NAMES[lvl.level] || `Nivel ${lvl.level}`}
                    </p>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>
                        {lvl.covered}/{lvl.total}
                      </span>
                      <span className="font-medium">{lvl.coverage_pct}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div
                        className="rounded-full h-2.5 transition-all"
                        style={{
                          width: `${lvl.coverage_pct}%`,
                          backgroundColor: getCoverageColor(lvl.coverage_pct),
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Gaps table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Brechas de cobertura
                {selectedCategory && (
                  <Badge variant="outline" className="ml-2">
                    {selectedCategory}.0 — {CATEGORY_NAMES[selectedCategory]}
                    <button
                      className="ml-1 text-muted-foreground hover:text-foreground"
                      onClick={() => setSelectedCategory(null)}
                    >
                      x
                    </button>
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Elementos PCF no cubiertos por ningún documento hasta nivel {gapMaxLevel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredGaps.length > 0 ? (
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
                    {filteredGaps.map((gap) => (
                      <TableRow key={gap.hierarchy_id}>
                        <TableCell className="font-mono text-xs">{gap.hierarchy_id}</TableCell>
                        <TableCell>{gap.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {gap.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{gap.category_name}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {selectedCategory
                    ? 'No hay brechas en esta categoría.'
                    : 'No se encontraron brechas.'}
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
