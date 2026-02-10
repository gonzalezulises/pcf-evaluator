import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, ClipboardList, Plus } from 'lucide-react';
import Link from 'next/link';
import { EVALUATION_STATUS_LABELS } from '@/lib/constants';
import type { EvaluationStatus } from '@/lib/constants';

export default async function DashboardPage() {
  const session = await auth();
  const sql = getDb();

  const orgCount = await sql`
    SELECT COUNT(*) as count FROM organizations o
    JOIN user_organizations uo ON uo.organization_id = o.id
    WHERE uo.user_id = ${session!.user.id}
  `;

  const evalCount = await sql`
    SELECT COUNT(*) as count FROM evaluations e
    JOIN organizations o ON o.id = e.organization_id
    JOIN user_organizations uo ON uo.organization_id = o.id
    WHERE uo.user_id = ${session!.user.id}
  `;

  const recentEvals = await sql`
    SELECT e.id, e.name, e.status, e.created_at, o.name as org_name, o.id as org_id
    FROM evaluations e
    JOIN organizations o ON o.id = e.organization_id
    JOIN user_organizations uo ON uo.organization_id = o.id
    WHERE uo.user_id = ${session!.user.id}
    ORDER BY e.created_at DESC
    LIMIT 5
  `;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenido, {session!.user.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Organizaciones</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{orgCount[0].count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Evaluaciones</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{evalCount[0].count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Acción rápida</CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href="/organizations/new">Nueva organización</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evaluaciones recientes</CardTitle>
          <CardDescription>Últimas evaluaciones en las que has trabajado</CardDescription>
        </CardHeader>
        <CardContent>
          {recentEvals.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              No hay evaluaciones aún. Crea una organización para comenzar.
            </p>
          ) : (
            <div className="space-y-3">
              {recentEvals.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/organizations/${ev.org_id}/evaluations/${ev.id}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{ev.name}</p>
                    <p className="text-sm text-muted-foreground">{ev.org_name}</p>
                  </div>
                  <Badge variant="secondary">
                    {EVALUATION_STATUS_LABELS[ev.status as EvaluationStatus]}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
