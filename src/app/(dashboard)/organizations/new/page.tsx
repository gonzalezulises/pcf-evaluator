'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewOrganizationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const body = {
      name: formData.get('name'),
      industry: formData.get('industry'),
      country: formData.get('country'),
      contact_name: formData.get('contact_name'),
      contact_email: formData.get('contact_email'),
      notes: formData.get('notes'),
    };

    const res = await fetch('/api/organizations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || 'Error al crear organización');
      return;
    }

    const org = await res.json();
    router.push(`/organizations/${org.id}`);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Nueva organización</CardTitle>
          <CardDescription>Registra una nueva organización para evaluar sus procesos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la organización *</Label>
              <Input id="name" name="name" required minLength={2} placeholder="Ej: Banco Nacional de Panamá" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industria</Label>
                <Input id="industry" name="industry" placeholder="Ej: Banca y Finanzas" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input id="country" name="country" placeholder="Ej: Panamá" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Persona de contacto</Label>
                <Input id="contact_name" name="contact_name" placeholder="Nombre del contacto" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact_email">Email de contacto</Label>
                <Input id="contact_email" name="contact_email" type="email" placeholder="contacto@empresa.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" name="notes" placeholder="Notas adicionales sobre la organización..." rows={3} />
            </div>
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear organización'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
