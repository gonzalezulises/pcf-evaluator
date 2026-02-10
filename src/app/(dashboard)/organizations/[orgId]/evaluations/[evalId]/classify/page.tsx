import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ClassifyUpload } from '@/components/classify-upload';

export default async function ClassifyPage({
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

  const evalRows = await sql`
    SELECT e.name, o.name as org_name
    FROM evaluations e
    JOIN organizations o ON o.id = e.organization_id
    WHERE e.id = ${evalId}
  `;
  if (evalRows.length === 0) notFound();
  const evaluation = evalRows[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/organizations/${orgId}/evaluations/${evalId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Clasificar documento</h1>
          <p className="text-muted-foreground">
            {evaluation.name} — {evaluation.org_name}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground max-w-2xl">
        Sube un documento de procedimiento (PDF, DOCX) y el sistema sugerirá
        automáticamente a qué elementos del PCF APQC corresponde y qué nivel de
        madurez tiene según lo descrito.
      </p>

      <ClassifyUpload evalId={evalId} orgId={orgId} />
    </div>
  );
}
