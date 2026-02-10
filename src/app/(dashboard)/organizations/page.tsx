import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2 } from 'lucide-react';
import Link from 'next/link';

export default async function OrganizationsPage() {
  const session = await auth();
  const sql = getDb();

  const orgs = await sql`
    SELECT o.*,
      (SELECT COUNT(*) FROM evaluations e WHERE e.organization_id = o.id) as evaluation_count
    FROM organizations o
    JOIN user_organizations uo ON uo.organization_id = o.id
    WHERE uo.user_id = ${session!.user.id}
    ORDER BY o.created_at DESC
  `;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizaciones</h1>
          <p className="text-muted-foreground">Gestiona las organizaciones que evalúas</p>
        </div>
        {session!.user.role !== 'viewer' && (
          <Button asChild>
            <Link href="/organizations/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva organización
            </Link>
          </Button>
        )}
      </div>

      {orgs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No hay organizaciones aún</p>
            <Button asChild>
              <Link href="/organizations/new">Crear primera organización</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orgs.map((org) => (
            <Link key={org.id} href={`/organizations/${org.id}`}>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                <CardHeader>
                  <CardTitle className="text-lg">{org.name}</CardTitle>
                  <CardDescription>
                    {[org.industry, org.country].filter(Boolean).join(' · ') || 'Sin detalles'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">
                    {org.evaluation_count} evaluacion{org.evaluation_count !== 1 ? 'es' : ''}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
