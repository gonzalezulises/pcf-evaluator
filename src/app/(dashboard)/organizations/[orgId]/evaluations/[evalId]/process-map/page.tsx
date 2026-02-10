'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, X } from 'lucide-react';
import Link from 'next/link';
import { CATEGORY_NAMES, MATURITY_LABELS, MATURITY_COLORS } from '@/lib/constants';
import type { MaturityStatus } from '@/lib/constants';

interface Entry {
  id: number;
  pcf_element_hierarchy_id: string;
  maturity_status: MaturityStatus;
  maturity_score: number | null;
  client_process_name: string | null;
  pcf_name: string;
  pcf_level: number;
  category_number: number;
  parent_hierarchy_id: string | null;
}

interface CategoryStat {
  category_number: number;
  total: number;
  evaluated: number;
  avg_score: number | null;
}

function getColorForScore(score: number | null): string {
  if (score === null) return MATURITY_COLORS.no_evaluado;
  if (score <= 1) return MATURITY_COLORS.inexistente;
  if (score <= 2) return MATURITY_COLORS.parcial;
  if (score <= 3) return MATURITY_COLORS.documentado;
  if (score <= 4) return MATURITY_COLORS.implementado;
  return MATURITY_COLORS.optimizado;
}

function getCategoryScore(entries: Entry[], catNum: number): number | null {
  const catEntries = entries.filter(
    (e) => e.category_number === catNum && e.maturity_status !== 'no_evaluado'
  );
  if (catEntries.length === 0) return null;
  const sum = catEntries.reduce((acc, e) => acc + (e.maturity_score || 0), 0);
  return Math.round((sum / catEntries.length) * 100) / 100;
}

export default function ProcessMapPage() {
  const { orgId, evalId } = useParams<{ orgId: string; evalId: string }>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [drilldown, setDrilldown] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/evaluations/${evalId}/entries`)
      .then((r) => r.json())
      .then((data: Entry[]) => {
        setEntries(data);
        setLoading(false);
      });
  }, [evalId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const operational = [1, 2, 3, 4, 5, 6];
  const support = [7, 8, 9, 10, 11, 12, 13];

  // Get unique categories in the evaluation
  const includedCats = new Set(entries.map((e) => e.category_number));

  function renderCategoryTile(catNum: number) {
    if (!includedCats.has(catNum)) {
      return (
        <div
          key={catNum}
          className="rounded-lg border-2 border-dashed border-muted p-3 opacity-40"
        >
          <p className="font-bold text-sm">{catNum}.0</p>
          <p className="text-xs text-muted-foreground line-clamp-2">{CATEGORY_NAMES[catNum]}</p>
          <p className="text-xs text-muted-foreground mt-2">No incluida</p>
        </div>
      );
    }

    const score = getCategoryScore(entries, catNum);
    const color = getColorForScore(score);
    const catEntries = entries.filter((e) => e.category_number === catNum);
    const evaluated = catEntries.filter((e) => e.maturity_status !== 'no_evaluado').length;
    const pct = catEntries.length > 0 ? Math.round((evaluated / catEntries.length) * 100) : 0;

    return (
      <button
        key={catNum}
        className="rounded-lg p-3 text-left transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
        style={{ backgroundColor: color }}
        onClick={() => setDrilldown(catNum)}
      >
        <p className="font-bold text-sm text-gray-900">{catNum}.0</p>
        <p className="text-xs text-gray-800 line-clamp-2 leading-tight mt-0.5">
          {CATEGORY_NAMES[catNum]}
        </p>
        <div className="mt-2">
          <span className="text-lg font-bold text-gray-900">{score ?? '—'}</span>
          <span className="text-xs text-gray-700"> / 5</span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-700">{pct}%</span>
          <span className="text-xs text-gray-700">{evaluated}/{catEntries.length}</span>
        </div>
        <div className="w-full bg-white/40 rounded-full h-1.5 mt-1">
          <div className="bg-gray-800/30 rounded-full h-1.5" style={{ width: `${pct}%` }} />
        </div>
      </button>
    );
  }

  // Drilldown view: show processes within a category
  const drilldownEntries = drilldown
    ? entries.filter((e) => e.category_number === drilldown)
    : [];

  // Group by level
  const level1 = drilldownEntries.filter((e) => e.pcf_level === 1);
  const level2 = drilldownEntries.filter((e) => e.pcf_level === 2);
  const level3 = drilldownEntries.filter((e) => e.pcf_level === 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/organizations/${orgId}/evaluations/${evalId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex-1">Mapa de arquitectura de procesos</h1>
      </div>

      {/* APQC Process Map */}
      <Card>
        <CardHeader>
          <CardTitle>Marco de Clasificación de Procesos APQC</CardTitle>
          <CardDescription>
            Haz clic en una categoría para ver el detalle. Color indica nivel de madurez promedio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Operational processes */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Procesos operativos
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {operational.map(renderCategoryTile)}
            </div>
          </div>

          {/* Support processes */}
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Procesos de gestión y soporte
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {support.map(renderCategoryTile)}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 pt-2 border-t">
            {(Object.keys(MATURITY_COLORS) as MaturityStatus[]).map((status) => (
              <div key={status} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: MATURITY_COLORS[status] }}
                />
                {MATURITY_LABELS[status]}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Drilldown */}
      {drilldown && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {drilldown}.0 — {CATEGORY_NAMES[drilldown]}
                </CardTitle>
                <CardDescription>
                  Detalle de procesos de esta categoría
                </CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDrilldown(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Level 2: Process Groups */}
            <div className="space-y-4">
              {level2.map((group) => {
                const groupChildren = level3.filter(
                  (e) => e.parent_hierarchy_id === group.pcf_element_hierarchy_id
                );

                return (
                  <div key={group.pcf_element_hierarchy_id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge
                        style={{
                          backgroundColor: MATURITY_COLORS[group.maturity_status],
                          color: group.maturity_status === 'no_evaluado' ? undefined : '#000',
                        }}
                      >
                        {MATURITY_LABELS[group.maturity_status]}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">
                          {group.pcf_element_hierarchy_id} — {group.pcf_name}
                        </p>
                        {group.client_process_name && (
                          <p className="text-xs text-muted-foreground">
                            Cliente: {group.client_process_name}
                          </p>
                        )}
                      </div>
                    </div>

                    {groupChildren.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ml-4">
                        {groupChildren.map((proc) => (
                          <div
                            key={proc.pcf_element_hierarchy_id}
                            className="flex items-center gap-2 p-2 rounded border text-sm"
                          >
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: MATURITY_COLORS[proc.maturity_status],
                              }}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-xs">
                                {proc.pcf_element_hierarchy_id} — {proc.pcf_name}
                              </p>
                              {proc.client_process_name && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {proc.client_process_name}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
