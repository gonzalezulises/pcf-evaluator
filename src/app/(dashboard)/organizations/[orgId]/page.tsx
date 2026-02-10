import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, ArrowLeft, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { EVALUATION_STATUS_LABELS } from '@/lib/constants';
import type { EvaluationStatus } from '@/lib/constants';

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
  const session = await auth();
  const sql = getDb();

  const access = await sql`
    SELECT role FROM user_organizations
    WHERE user_id = ${session!.user.id} AND organization_id = ${orgId}
  `;
  if (access.length === 0) notFound();

  const orgRows = await sql`SELECT * FROM organizations WHERE id = ${orgId}`;
  if (orgRows.length === 0) notFound();
  const org = orgRows[0];

  const evaluations = await sql`
    SELECT e.*, u.name as created_by_name,
      (SELECT COUNT(*) FROM evaluation_entries ee WHERE ee.evaluation_id = e.id AND ee.maturity_status != 'no_evaluado') as evaluated_count,
      (SELECT COUNT(*) FROM evaluation_entries ee WHERE ee.evaluation_id = e.id) as total_count
    FROM evaluations e
    LEFT JOIN users u ON u.id = e.created_by
    WHERE e.organization_id = ${orgId}
    ORDER BY e.created_at DESC
  `;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/organizations"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className="text-muted-foreground">
            {[org.industry, org.country].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {(org.contact_name || org.contact_email || org.notes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Información de contacto</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {org.contact_name && <p><strong>Contacto:</strong> {org.contact_name}</p>}
            {org.contact_email && <p><strong>Email:</strong> {org.contact_email}</p>}
            {org.notes && <><Separator className="my-2" /><p className="text-muted-foreground">{org.notes}</p></>}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Evaluaciones</h2>
        {session!.user.role !== 'viewer' && (
          <Button asChild>
            <Link href={`/organizations/${orgId}/evaluations/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva evaluación
            </Link>
          </Button>
        )}
      </div>

      {evaluations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No hay evaluaciones para esta organización</p>
            <Button asChild>
              <Link href={`/organizations/${orgId}/evaluations/new`}>Crear primera evaluación</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {evaluations.map((ev) => (
            <Link key={ev.id} href={`/organizations/${orgId}/evaluations/${ev.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer mb-3">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{ev.name}</CardTitle>
                    <Badge variant="secondary">
                      {EVALUATION_STATUS_LABELS[ev.status as EvaluationStatus]}
                    </Badge>
                  </div>
                  {ev.description && <CardDescription>{ev.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Profundidad: nivel {ev.evaluation_depth}</span>
                    <span>Evaluados: {ev.evaluated_count}/{ev.total_count}</span>
                    {ev.created_by_name && <span>Por: {ev.created_by_name}</span>}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
