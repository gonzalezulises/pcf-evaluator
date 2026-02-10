'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Network, Search, ChevronRight, ArrowLeft, BookOpen, BarChart3 } from 'lucide-react';
import { CATEGORY_NAMES } from '@/lib/constants';

interface PcfElement {
  id: number;
  pcf_id: string;
  hierarchy_id: string;
  level: number;
  name: string;
  description: string | null;
  parent_hierarchy_id: string | null;
  category_number: number;
  child_count?: number;
  total_elements?: number;
  metric_count?: number;
}

interface Metric {
  id: number;
  metric_id: string;
  pcf_element_hierarchy_id: string;
  name: string;
  category: string | null;
  formula: string | null;
  units: string | null;
}

const LEVEL_LABELS: Record<number, string> = {
  1: 'Categoría',
  2: 'Grupo de procesos',
  3: 'Proceso',
  4: 'Actividad',
  5: 'Tarea',
};

const LEVEL_COLORS: Record<number, string> = {
  1: 'bg-indigo-100 text-indigo-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-cyan-100 text-cyan-800',
  4: 'bg-teal-100 text-teal-800',
  5: 'bg-green-100 text-green-800',
};

export default function PcfBrowserPage() {
  const [elements, setElements] = useState<PcfElement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<PcfElement[] | null>(null);
  const [searchTotal, setSearchTotal] = useState(0);
  const [breadcrumb, setBreadcrumb] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedElement, setSelectedElement] = useState<PcfElement | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Load top-level categories on mount
  useEffect(() => {
    fetch('/api/pcf')
      .then((r) => r.json())
      .then((data) => {
        setElements(data.elements || []);
        setLoading(false);
      });
  }, []);

  const navigate = useCallback((parentId: string, parentName: string, addToBreadcrumb: boolean) => {
    setLoading(true);
    setSearchResults(null);
    setSearch('');
    setSelectedElement(null);
    setMetrics([]);

    fetch(`/api/pcf?parent=${encodeURIComponent(parentId)}`)
      .then((r) => r.json())
      .then((data) => {
        setElements(data.elements || []);
        if (addToBreadcrumb) {
          setBreadcrumb((prev) => [...prev, { id: parentId, name: parentName }]);
        }
        setLoading(false);
      });
  }, []);

  const goToRoot = () => {
    setLoading(true);
    setSearchResults(null);
    setSearch('');
    setBreadcrumb([]);
    setSelectedElement(null);
    setMetrics([]);

    fetch('/api/pcf')
      .then((r) => r.json())
      .then((data) => {
        setElements(data.elements || []);
        setLoading(false);
      });
  };

  const goToBreadcrumb = (index: number) => {
    const item = breadcrumb[index];
    setBreadcrumb((prev) => prev.slice(0, index + 1));
    setLoading(true);
    setSearchResults(null);
    setSearch('');
    setSelectedElement(null);
    setMetrics([]);

    fetch(`/api/pcf?parent=${encodeURIComponent(item.id)}`)
      .then((r) => r.json())
      .then((data) => {
        setElements(data.elements || []);
        setLoading(false);
      });
  };

  const doSearch = useCallback((query: string) => {
    if (query.length < 2) {
      setSearchResults(null);
      return;
    }
    setLoading(true);
    fetch(`/api/pcf?q=${encodeURIComponent(query)}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setSearchResults(data.elements || []);
        setSearchTotal(data.total || 0);
        setLoading(false);
      });
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => doSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search, doSearch]);

  const showMetrics = async (element: PcfElement) => {
    setSelectedElement(element);
    setLoadingMetrics(true);
    try {
      const res = await fetch(`/api/pcf/${encodeURIComponent(element.hierarchy_id)}/metrics`);
      const data = await res.json();
      setMetrics(data);
    } catch {
      setMetrics([]);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const displayElements = searchResults ?? elements;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Network className="h-6 w-6" />
          Navegador PCF
        </h1>
        <p className="text-muted-foreground">
          Marco de Clasificación de Procesos APQC v7.4 (Español)
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar proceso, actividad o tarea..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && !searchResults && (
        <div className="flex items-center gap-1 text-sm flex-wrap">
          <button onClick={goToRoot} className="text-primary hover:underline">
            Inicio
          </button>
          {breadcrumb.map((item, i) => (
            <span key={item.id} className="flex items-center gap-1">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              {i < breadcrumb.length - 1 ? (
                <button onClick={() => goToBreadcrumb(i)} className="text-primary hover:underline">
                  {item.name}
                </button>
              ) : (
                <span className="font-medium">{item.name}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {searchResults && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setSearchResults(null); }}>
            <ArrowLeft className="h-3 w-3 mr-1" /> Volver
          </Button>
          <span className="text-sm text-muted-foreground">
            {searchTotal} resultados para &quot;{search}&quot;
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
        {/* Main content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              {searchResults ? 'Resultados de búsqueda' : breadcrumb.length > 0 ? 'Elementos' : 'Categorías APQC'}
            </CardTitle>
            {!searchResults && breadcrumb.length === 0 && (
              <CardDescription>13 categorías del PCF. Haz clic para navegar.</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : displayElements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {searchResults ? 'Sin resultados' : 'Sin elementos'}
              </p>
            ) : (
              <div className="space-y-1">
                {displayElements.map((el) => (
                  <div
                    key={el.hierarchy_id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedElement?.hierarchy_id === el.hierarchy_id
                        ? 'bg-primary/5 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => showMetrics(el)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-xs text-muted-foreground">{el.hierarchy_id}</span>
                        <Badge className={`text-xs ${LEVEL_COLORS[el.level]}`}>
                          {LEVEL_LABELS[el.level]}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm truncate">{el.name}</p>
                      {el.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{el.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {Number(el.metric_count) > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          {el.metric_count}
                        </Badge>
                      )}
                      {Number(el.child_count) > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(el.hierarchy_id, `${el.hierarchy_id} ${el.name}`, true);
                          }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail panel */}
        <div className="space-y-4">
          {selectedElement && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{selectedElement.hierarchy_id}</CardTitle>
                  <CardDescription>{LEVEL_LABELS[selectedElement.level]}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Nombre</p>
                    <p className="text-sm font-medium">{selectedElement.name}</p>
                  </div>
                  {selectedElement.description && (
                    <div>
                      <p className="text-xs text-muted-foreground">Descripción</p>
                      <p className="text-sm">{selectedElement.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground">Categoría</p>
                    <p className="text-sm">
                      {selectedElement.category_number}.0 — {CATEGORY_NAMES[selectedElement.category_number]}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Nivel</p>
                    <Badge className={LEVEL_COLORS[selectedElement.level]}>
                      {selectedElement.level} — {LEVEL_LABELS[selectedElement.level]}
                    </Badge>
                  </div>
                  {selectedElement.parent_hierarchy_id && (
                    <div>
                      <p className="text-xs text-muted-foreground">Padre</p>
                      <p className="text-sm font-mono">{selectedElement.parent_hierarchy_id}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Métricas ({metrics.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingMetrics ? (
                    <Skeleton className="h-24" />
                  ) : metrics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin métricas asociadas</p>
                  ) : (
                    <div className="space-y-3">
                      {metrics.map((m) => (
                        <div key={m.id} className="border rounded p-2 text-sm space-y-1">
                          <p className="font-medium">{m.name}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span className="font-mono">{m.metric_id}</span>
                            {m.category && <Badge variant="outline" className="text-xs">{m.category}</Badge>}
                          </div>
                          {m.formula && (
                            <p className="text-xs"><strong>Fórmula:</strong> {m.formula}</p>
                          )}
                          {m.units && (
                            <p className="text-xs"><strong>Unidad:</strong> {m.units}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!selectedElement && (
            <Card>
              <CardContent className="py-8 text-center">
                <Network className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Selecciona un elemento para ver su detalle y métricas
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
