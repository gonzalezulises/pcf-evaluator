'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, ChevronLeft, ChevronRight, Save, Check, Eye } from 'lucide-react';
import Link from 'next/link';
import { EvidenceUpload } from '@/components/evidence-upload';
import { MATURITY_LABELS, MATURITY_COLORS, CATEGORY_NAMES } from '@/lib/constants';
import type { MaturityStatus } from '@/lib/constants';

interface Entry {
  id: number;
  evaluation_id: number;
  pcf_element_hierarchy_id: string;
  maturity_status: MaturityStatus;
  maturity_score: number | null;
  client_process_name: string | null;
  responsible_area: string | null;
  responsible_person: string | null;
  notes: string | null;
  is_applicable: boolean;
  pcf_name: string;
  pcf_description: string | null;
  pcf_level: number;
  parent_hierarchy_id: string | null;
  category_number: number;
}

interface TreeNode {
  entry: Entry;
  children: TreeNode[];
  expanded: boolean;
}

function buildTree(entries: Entry[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  for (const entry of entries) {
    map.set(entry.pcf_element_hierarchy_id, {
      entry,
      children: [],
      expanded: entry.pcf_level <= 2,
    });
  }

  for (const entry of entries) {
    const node = map.get(entry.pcf_element_hierarchy_id)!;
    if (entry.parent_hierarchy_id && map.has(entry.parent_hierarchy_id)) {
      map.get(entry.parent_hierarchy_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function TreeItem({
  node,
  selectedId,
  onSelect,
  onToggle,
  depth = 0,
}: {
  node: TreeNode;
  selectedId: string | null;
  onSelect: (hierarchyId: string) => void;
  onToggle: (hierarchyId: string) => void;
  depth?: number;
}) {
  const isSelected = node.entry.pcf_element_hierarchy_id === selectedId;
  const hasChildren = node.children.length > 0;
  const color = MATURITY_COLORS[node.entry.maturity_status];

  return (
    <div>
      <div
        className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer rounded text-sm hover:bg-muted/50 ${
          isSelected ? 'bg-primary/10 font-medium' : ''
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(node.entry.pcf_element_hierarchy_id)}
      >
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.entry.pcf_element_hierarchy_id);
            }}
            className="w-4 h-4 flex items-center justify-center text-muted-foreground"
          >
            {node.expanded ? '▾' : '▸'}
          </button>
        )}
        {!hasChildren && <span className="w-4" />}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="truncate">
          <span className="text-muted-foreground">{node.entry.pcf_element_hierarchy_id}</span>{' '}
          {node.entry.pcf_name}
        </span>
      </div>
      {hasChildren && node.expanded && (
        <div>
          {node.children.map((child) => (
            <TreeItem
              key={child.entry.pcf_element_hierarchy_id}
              node={child}
              selectedId={selectedId}
              onSelect={onSelect}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function EvaluateWorkspace({ userRole }: { userRole: string }) {
  const { orgId, evalId } = useParams<{ orgId: string; evalId: string }>();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readOnly = userRole === 'viewer';

  useEffect(() => {
    fetch(`/api/evaluations/${evalId}/entries`)
      .then((r) => r.json())
      .then((data: Entry[]) => {
        setEntries(data);
        setTree(buildTree(data));
        if (data.length > 0) setSelectedId(data[0].pcf_element_hierarchy_id);
        setLoading(false);
      });
  }, [evalId]);

  const selected = entries.find((e) => e.pcf_element_hierarchy_id === selectedId);

  const flatList = entries;
  const currentIndex = flatList.findIndex((e) => e.pcf_element_hierarchy_id === selectedId);

  const saveEntry = useCallback(
    async (entry: Entry) => {
      if (readOnly) return;
      setSaving(true);
      setSaved(false);
      try {
        const res = await fetch(`/api/evaluations/${evalId}/entries`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entry_id: entry.id,
            maturity_status: entry.maturity_status,
            client_process_name: entry.client_process_name,
            responsible_area: entry.responsible_area,
            responsible_person: entry.responsible_person,
            notes: entry.notes,
            is_applicable: entry.is_applicable,
          }),
        });
        if (res.ok) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      } finally {
        setSaving(false);
      }
    },
    [evalId, readOnly]
  );

  const debouncedSave = useCallback(
    (entry: Entry) => {
      if (readOnly) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveEntry(entry), 1500);
    },
    [saveEntry, readOnly]
  );

  function updateSelected(field: string, value: string | boolean) {
    if (!selectedId || readOnly) return;
    setEntries((prev) => {
      const updated = prev.map((e) =>
        e.pcf_element_hierarchy_id === selectedId ? { ...e, [field]: value } : e
      );
      const entry = updated.find((e) => e.pcf_element_hierarchy_id === selectedId);
      if (entry) {
        debouncedSave(entry);
        setTree(buildTree(updated));
      }
      return updated;
    });
  }

  function toggleNode(hierarchyId: string) {
    setTree((prev) => {
      function toggle(nodes: TreeNode[]): TreeNode[] {
        return nodes.map((n) => {
          if (n.entry.pcf_element_hierarchy_id === hierarchyId) {
            return { ...n, expanded: !n.expanded };
          }
          return { ...n, children: toggle(n.children) };
        });
      }
      return toggle(prev);
    });
  }

  function goNext() {
    if (currentIndex < flatList.length - 1) {
      setSelectedId(flatList[currentIndex + 1].pcf_element_hierarchy_id);
    }
  }

  function goPrev() {
    if (currentIndex > 0) {
      setSelectedId(flatList[currentIndex - 1].pcf_element_hierarchy_id);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/organizations/${orgId}/evaluations/${evalId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold flex-1">
          {readOnly ? 'Vista de procesos' : 'Workspace de evaluación'}
        </h1>
        {readOnly && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Eye className="h-3 w-3" /> Solo lectura
          </Badge>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saving && <span>Guardando...</span>}
          {saved && (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="h-3 w-3" /> Guardado
            </span>
          )}
          <span>{currentIndex + 1} / {flatList.length}</span>
          <Button variant="outline" size="icon" onClick={goPrev} disabled={currentIndex <= 0}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={goNext} disabled={currentIndex >= flatList.length - 1}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr_280px] gap-4 pt-4 overflow-hidden">
        {/* Left panel: Tree */}
        <div className="overflow-y-auto border rounded-lg p-2 max-h-[300px] lg:max-h-none">
          {tree.map((node) => (
            <TreeItem
              key={node.entry.pcf_element_hierarchy_id}
              node={node}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onToggle={toggleNode}
            />
          ))}
        </div>

        {/* Center panel: Form */}
        <div className="overflow-y-auto border rounded-lg p-4">
          {selected ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">{selected.pcf_element_hierarchy_id} — Nivel {selected.pcf_level}</p>
                <h2 className="text-lg font-semibold">{selected.pcf_name}</h2>
                {selected.pcf_description && (
                  <p className="text-sm text-muted-foreground mt-1">{selected.pcf_description}</p>
                )}
              </div>

              {readOnly ? (
                /* Read-only view */
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Estado de madurez</p>
                    <Badge
                      className="mt-1"
                      style={{
                        backgroundColor: MATURITY_COLORS[selected.maturity_status],
                        color: '#000',
                      }}
                    >
                      {MATURITY_LABELS[selected.maturity_status]}
                    </Badge>
                  </div>
                  {selected.client_process_name && (
                    <div>
                      <p className="text-xs text-muted-foreground">Nombre en el cliente</p>
                      <p className="text-sm">{selected.client_process_name}</p>
                    </div>
                  )}
                  {selected.responsible_area && (
                    <div>
                      <p className="text-xs text-muted-foreground">Área responsable</p>
                      <p className="text-sm">{selected.responsible_area}</p>
                    </div>
                  )}
                  {selected.responsible_person && (
                    <div>
                      <p className="text-xs text-muted-foreground">Persona responsable</p>
                      <p className="text-sm">{selected.responsible_person}</p>
                    </div>
                  )}
                  {selected.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Notas</p>
                      <p className="text-sm whitespace-pre-wrap">{selected.notes}</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Evidencia</p>
                    <EvidenceUpload entryId={selected.id} readOnly />
                  </div>
                </div>
              ) : (
                /* Editable form */
                <>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={selected.is_applicable}
                      onCheckedChange={(v) => updateSelected('is_applicable', v)}
                    />
                    <Label>Proceso aplicable</Label>
                  </div>

                  {selected.is_applicable && (
                    <>
                      <div className="space-y-2">
                        <Label>Estado de madurez</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {(Object.keys(MATURITY_LABELS) as MaturityStatus[])
                            .filter((s) => s !== 'no_evaluado')
                            .map((status) => (
                              <button
                                key={status}
                                onClick={() => updateSelected('maturity_status', status)}
                                className={`p-2 rounded border text-sm text-center transition-colors ${
                                  selected.maturity_status === status
                                    ? 'ring-2 ring-primary font-medium'
                                    : 'hover:bg-muted/50'
                                }`}
                                style={{
                                  backgroundColor:
                                    selected.maturity_status === status
                                      ? MATURITY_COLORS[status]
                                      : undefined,
                                }}
                              >
                                {MATURITY_LABELS[status]}
                              </button>
                            ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="client_process">Nombre real del proceso en el cliente</Label>
                        <Input
                          id="client_process"
                          value={selected.client_process_name || ''}
                          onChange={(e) => updateSelected('client_process_name', e.target.value)}
                          placeholder="Cómo lo llaman internamente..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="area">Área responsable</Label>
                          <Input
                            id="area"
                            value={selected.responsible_area || ''}
                            onChange={(e) => updateSelected('responsible_area', e.target.value)}
                            placeholder="Ej: Recursos Humanos"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="person">Persona responsable</Label>
                          <Input
                            id="person"
                            value={selected.responsible_person || ''}
                            onChange={(e) => updateSelected('responsible_person', e.target.value)}
                            placeholder="Ej: Juan Pérez"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notas y observaciones</Label>
                        <Textarea
                          id="notes"
                          value={selected.notes || ''}
                          onChange={(e) => updateSelected('notes', e.target.value)}
                          placeholder="Hallazgos, evidencias, comentarios..."
                          rows={4}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Evidencia</Label>
                        <EvidenceUpload entryId={selected.id} />
                      </div>
                    </>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button variant="outline" onClick={goPrev} disabled={currentIndex <= 0}>
                      <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                    </Button>
                    <Button onClick={() => { if (selected) saveEntry(selected); }}>
                      <Save className="mr-1 h-4 w-4" /> Guardar
                    </Button>
                    <Button variant="outline" onClick={goNext} disabled={currentIndex >= flatList.length - 1}>
                      Siguiente <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}

              {readOnly && (
                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={goPrev} disabled={currentIndex <= 0}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Anterior
                  </Button>
                  <Button variant="outline" onClick={goNext} disabled={currentIndex >= flatList.length - 1}>
                    Siguiente <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">Selecciona un proceso del árbol</p>
          )}
        </div>

        {/* Right panel: Context */}
        <div className="hidden lg:block overflow-y-auto border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-sm">Contexto</h3>
          {selected && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Categoría</p>
                <p className="text-sm font-medium">
                  {selected.category_number}.0 — {CATEGORY_NAMES[selected.category_number]}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Jerarquía</p>
                <p className="text-sm font-mono">{selected.pcf_element_hierarchy_id}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado actual</p>
                <Badge style={{ backgroundColor: MATURITY_COLORS[selected.maturity_status], color: '#000' }}>
                  {MATURITY_LABELS[selected.maturity_status]}
                </Badge>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-2">Resumen de la categoría</p>
                {(() => {
                  const catEntries = entries.filter(
                    (e) => e.category_number === selected.category_number
                  );
                  const evaluated = catEntries.filter(
                    (e) => e.maturity_status !== 'no_evaluado'
                  ).length;
                  return (
                    <div className="text-sm">
                      <p>{evaluated} / {catEntries.length} evaluados</p>
                      <div className="w-full bg-muted rounded-full h-2 mt-1">
                        <div
                          className="bg-primary rounded-full h-2"
                          style={{
                            width: `${catEntries.length ? (evaluated / catEntries.length) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
