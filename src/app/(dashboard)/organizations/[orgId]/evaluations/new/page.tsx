'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CATEGORY_NAMES } from '@/lib/constants';

export default function NewEvaluationPage() {
  const router = useRouter();
  const { orgId } = useParams<{ orgId: string }>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [depth, setDepth] = useState('3');
  const [categories, setCategories] = useState<number[]>([]);

  function toggleCategory(cat: number) {
    setCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  }

  function selectAll() {
    setCategories(Array.from({ length: 13 }, (_, i) => i + 1));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (categories.length === 0) {
      setError('Selecciona al menos una categoría');
      return;
    }

    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);

    const res = await fetch(`/api/organizations/${orgId}/evaluations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        description: formData.get('description'),
        evaluation_depth: parseInt(depth),
        included_categories: categories.sort((a, b) => a - b),
      }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Error al crear evaluación');
      return;
    }

    const evaluation = await res.json();
    router.push(`/organizations/${orgId}/evaluations/${evaluation.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/organizations/${orgId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Nueva evaluación</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la evaluación *</Label>
              <Input id="name" name="name" required minLength={2} placeholder="Ej: Evaluación inicial Q1 2026" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea id="description" name="description" placeholder="Describe el alcance y objetivo de esta evaluación..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profundidad de evaluación</CardTitle>
            <CardDescription>
              Define hasta qué nivel de detalle se evaluarán los procesos APQC
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup value={depth} onValueChange={setDepth} className="space-y-3">
              <div className="flex items-start gap-3">
                <RadioGroupItem value="3" id="depth-3" />
                <div>
                  <Label htmlFor="depth-3" className="font-medium">Nivel 3 — Procesos</Label>
                  <p className="text-sm text-muted-foreground">Evalúa categorías, grupos y procesos. Recomendado para evaluaciones rápidas.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="4" id="depth-4" />
                <div>
                  <Label htmlFor="depth-4" className="font-medium">Nivel 4 — Actividades</Label>
                  <p className="text-sm text-muted-foreground">Incluye actividades. Recomendado para evaluaciones detalladas.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RadioGroupItem value="5" id="depth-5" />
                <div>
                  <Label htmlFor="depth-5" className="font-medium">Nivel 5 — Tareas</Label>
                  <p className="text-sm text-muted-foreground">Máximo detalle. Incluye todas las tareas individuales.</p>
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Categorías APQC a evaluar</CardTitle>
                <CardDescription>Selecciona las categorías de procesos a incluir</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                Seleccionar todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Procesos operativos (1-6)</p>
              {[1, 2, 3, 4, 5, 6].map((cat) => (
                <div key={cat} className="flex items-center gap-3">
                  <Checkbox
                    id={`cat-${cat}`}
                    checked={categories.includes(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  />
                  <Label htmlFor={`cat-${cat}`} className="font-normal">
                    {cat}.0 — {CATEGORY_NAMES[cat]}
                  </Label>
                </div>
              ))}
              <p className="text-sm font-medium text-muted-foreground pt-2">Procesos de gestión y soporte (7-13)</p>
              {[7, 8, 9, 10, 11, 12, 13].map((cat) => (
                <div key={cat} className="flex items-center gap-3">
                  <Checkbox
                    id={`cat-${cat}`}
                    checked={categories.includes(cat)}
                    onCheckedChange={() => toggleCategory(cat)}
                  />
                  <Label htmlFor={`cat-${cat}`} className="font-normal">
                    {cat}.0 — {CATEGORY_NAMES[cat]}
                  </Label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creando evaluación...' : 'Crear evaluación'}
          </Button>
        </div>
      </form>
    </div>
  );
}
