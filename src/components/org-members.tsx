'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Trash2, Users } from 'lucide-react';

interface Member {
  id: number;
  email: string;
  name: string;
  system_role: string;
  org_role: string;
}

export function OrgMembers({ orgId, readOnly = false }: { orgId: string; readOnly?: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('consultant');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch(`/api/organizations/${orgId}/members`)
      .then((r) => r.json())
      .then((data) => {
        setMembers(data);
        setLoading(false);
      });
  }, [orgId]);

  const addMember = async () => {
    if (!email.trim()) return;
    setError(null);
    setAdding(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setMembers((prev) => [...prev, data]);
      setEmail('');
    } catch {
      setError('Error de conexión');
    } finally {
      setAdding(false);
    }
  };

  const removeMember = async (userId: number) => {
    try {
      const res = await fetch(`/api/organizations/${orgId}/members?user_id=${userId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== userId));
      }
    } catch {
      setError('Error al eliminar miembro');
    }
  };

  const roleLabels: Record<string, string> = {
    admin: 'Admin',
    consultant: 'Consultor',
    viewer: 'Visor',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Equipo
        </CardTitle>
        <CardDescription>Miembros con acceso a esta organización</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <>
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {roleLabels[m.org_role] || m.org_role}
                  </Badge>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={() => removeMember(m.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {!readOnly && (
              <div className="pt-2 border-t space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="email@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && addMember()}
                  />
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="consultant">Consultor</SelectItem>
                      <SelectItem value="viewer">Visor</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" onClick={addMember} disabled={adding}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
