import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default async function ProcessMapPage({
  params,
}: {
  params: Promise<{ orgId: string; evalId: string }>;
}) {
  const { orgId, evalId } = await params;
  const session = await auth();
  const sql = getDb();

  const access = await sql`
    SELECT uo.role FROM user_organizations uo
    JOIN evaluations e ON e.organization_id = uo.organization_id
    WHERE e.id = ${evalId} AND uo.user_id = ${session!.user.id}
  `;
  if (access.length === 0) notFound();

  const evalRows = await sql`SELECT name FROM evaluations WHERE id = ${evalId}`;
  if (evalRows.length === 0) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/organizations/${orgId}/evaluations/${evalId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Mapa de procesos — {evalRows[0].name}</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Mapa de arquitectura APQC</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground">El mapa SVG con drill-down se implementará en la Fase 3.</p>
        </CardContent>
      </Card>
    </div>
  );
}
