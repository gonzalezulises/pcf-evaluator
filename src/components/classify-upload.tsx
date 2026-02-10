'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  Settings2,
  CheckCircle2,
  ArrowRight,
  Trash2,
  ChevronDown,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { CATEGORY_NAMES, MATURITY_LABELS, MATURITY_COLORS } from '@/lib/constants';
import type { MaturityStatus } from '@/lib/constants';
import { CoverageDashboard } from '@/components/coverage-dashboard';

export interface ClassificationMatch {
  hierarchy_id: string;
  name: string;
  category_number: number;
  level: number;
  description: string;
  similarity_score: number;
  alignment: number;
  suggested_maturity: number;
  reasoning: string;
}

export interface ClassificationResponse {
  filename: string;
  text_length: number;
  results: ClassificationMatch[];
}

const DGX_URL_KEY = 'pcf-classifier-dgx-url';
const DEFAULT_DGX_URL = 'http://100.116.242.33:8003';

function getDgxUrl(): string {
  if (typeof window === 'undefined') return DEFAULT_DGX_URL;
  return localStorage.getItem(DGX_URL_KEY) || DEFAULT_DGX_URL;
}

function maturityToStatus(maturity: number): MaturityStatus {
  const map: Record<number, MaturityStatus> = {
    0: 'no_evaluado',
    1: 'inexistente',
    2: 'parcial',
    3: 'documentado',
    4: 'implementado',
    5: 'optimizado',
  };
  return map[maturity] || 'no_evaluado';
}

export function ClassifyUpload({
  evalId,
  orgId,
}: {
  evalId: string;
  orgId: string;
}) {
  const [dgxUrl, setDgxUrl] = useState(getDgxUrl);
  const [showSettings, setShowSettings] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<ClassificationResponse[]>([]);
  const [expandedUploads, setExpandedUploads] = useState<Set<number>>(new Set());

  const latestUpload = uploads.length > 0 ? uploads[uploads.length - 1] : null;
  const previousUploads = uploads.slice(0, -1);

  // Accumulated stats
  const allMatches = uploads.flatMap((u) => u.results);
  const uniqueElements = new Set(allMatches.map((m) => m.hierarchy_id)).size;
  const touchedCategories = new Set(allMatches.map((m) => m.category_number)).size;

  const saveDgxUrl = (url: string) => {
    setDgxUrl(url);
    localStorage.setItem(DGX_URL_KEY, url);
  };

  const classifyFile = async (file: File) => {
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${dgxUrl}/classify`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Error ${res.status}: ${res.statusText}`);
      }

      const data: ClassificationResponse = await res.json();
      setUploads((prev) => [...prev, data]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError(
          'No se pudo conectar al servicio DGX. Verifica que estás conectado a la red Tailscale/LAN y que el servicio está activo.'
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) classifyFile(file);
    },
    [dgxUrl]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) classifyFile(file);
    e.target.value = '';
  };

  const toggleExpanded = (idx: number) => {
    setExpandedUploads((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const clearUploads = () => {
    setUploads([]);
    setExpandedUploads(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Settings toggle */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="text-muted-foreground"
        >
          <Settings2 className="h-4 w-4 mr-1" />
          Configurar DGX
        </Button>
      </div>

      {showSettings && (
        <Card>
          <CardContent className="pt-4">
            <label className="text-sm font-medium">URL del servicio DGX</label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={dgxUrl}
                onChange={(e) => saveDgxUrl(e.target.value)}
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                placeholder="http://100.116.242.33:8003"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => saveDgxUrl(DEFAULT_DGX_URL)}
              >
                Reset
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Requiere conexión a la red Tailscale/LAN
            </p>
          </CardContent>
        </Card>
      )}

      {/* Accumulated summary bar */}
      {uploads.length > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span>
                <strong>{uploads.length}</strong> archivo{uploads.length !== 1 ? 's' : ''} subido{uploads.length !== 1 ? 's' : ''}
              </span>
              <span className="text-muted-foreground">|</span>
              <span>
                <strong>{uniqueElements}</strong> elementos únicos
              </span>
              <span className="text-muted-foreground">|</span>
              <span>
                <strong>{touchedCategories}</strong> categoría{touchedCategories !== 1 ? 's' : ''}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearUploads} className="text-muted-foreground">
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Limpiar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs: Clasificaciones / Cobertura */}
      <Tabs defaultValue="classifications">
        <TabsList>
          <TabsTrigger value="classifications">
            <FileText className="h-4 w-4 mr-1.5" />
            Clasificaciones
          </TabsTrigger>
          <TabsTrigger value="coverage" disabled={uploads.length === 0}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Cobertura
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classifications" className="space-y-6 mt-4">
          {/* Upload zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('classify-file-input')?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-muted hover:border-muted-foreground/50'
            }`}
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <div>
                  <p className="font-medium">Analizando documento...</p>
                  <p className="text-sm text-muted-foreground">
                    Generando embeddings, buscando en PCF, clasificando con LLM
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    Arrastra un documento o haz clic para seleccionar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, DOCX o TXT — el documento será analizado contra el PCF APQC
                  </p>
                </div>
              </div>
            )}
            <input
              id="classify-file-input"
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.docx,.txt"
              disabled={loading}
            />
          </div>

          {/* Error */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-700">{error}</p>
                  {error.includes('DGX') && (
                    <Button
                      variant="link"
                      size="sm"
                      className="text-red-600 p-0 h-auto mt-1"
                      onClick={() => setShowSettings(true)}
                    >
                      Abrir configuración
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Latest upload results */}
          {latestUpload && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Resultados de clasificación</h3>
                  <p className="text-sm text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 inline mr-1" />
                    {latestUpload.filename} — {(latestUpload.text_length / 1000).toFixed(1)}k caracteres analizados
                  </p>
                </div>
                <Badge variant="secondary">Top {latestUpload.results.length} matches</Badge>
              </div>

              {latestUpload.results.map((match) => {
                const maturityStatus = maturityToStatus(match.suggested_maturity);
                return (
                  <Card key={match.hierarchy_id} className="overflow-hidden">
                    <div
                      className="h-1"
                      style={{
                        backgroundColor: MATURITY_COLORS[maturityStatus],
                      }}
                    />
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs font-mono">
                              {match.hierarchy_id}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Cat. {match.category_number}:{' '}
                              {CATEGORY_NAMES[match.category_number]}
                            </Badge>
                            <Badge className="text-xs" variant="outline">
                              Nivel {match.level}
                            </Badge>
                          </div>
                          <CardTitle className="text-base">{match.name}</CardTitle>
                          {match.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {match.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-bold">{match.alignment}%</div>
                          <p className="text-xs text-muted-foreground">alineación</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Alineación</span>
                            <span>{match.alignment}%</span>
                          </div>
                          <Progress value={match.alignment} className="h-2" />
                        </div>
                        <div className="shrink-0 flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Madurez:</span>
                          <Badge
                            style={{
                              backgroundColor: MATURITY_COLORS[maturityStatus],
                              color: match.suggested_maturity >= 3 ? '#1a1a1a' : undefined,
                            }}
                          >
                            {match.suggested_maturity} - {MATURITY_LABELS[maturityStatus]}
                          </Badge>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-md p-3">
                        <p className="text-sm">{match.reasoning}</p>
                      </div>

                      <div className="flex justify-end">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`/organizations/${orgId}/evaluations/${evalId}/evaluate?entry=${match.hierarchy_id}`}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Aplicar en workspace
                            <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </a>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Previous uploads (collapsible) */}
          {previousUploads.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Uploads anteriores</h4>
              {previousUploads.map((upload, idx) => (
                <Card key={idx} className="overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => toggleExpanded(idx)}
                  >
                    <div className="flex items-center gap-2">
                      {expandedUploads.has(idx) ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{upload.filename}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {upload.results.length} matches
                    </Badge>
                  </button>
                  {expandedUploads.has(idx) && (
                    <CardContent className="pt-0 pb-3 space-y-2">
                      {upload.results.map((match) => {
                        const maturityStatus = maturityToStatus(match.suggested_maturity);
                        return (
                          <div
                            key={match.hierarchy_id}
                            className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                          >
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs font-mono">
                                {match.hierarchy_id}
                              </Badge>
                              <span className="text-sm">{match.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{match.alignment}%</span>
                              <Badge
                                className="text-xs"
                                style={{
                                  backgroundColor: MATURITY_COLORS[maturityStatus],
                                  color: match.suggested_maturity >= 3 ? '#1a1a1a' : undefined,
                                }}
                              >
                                {match.suggested_maturity}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="coverage" className="mt-4">
          <CoverageDashboard uploads={uploads} dgxUrl={dgxUrl} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
