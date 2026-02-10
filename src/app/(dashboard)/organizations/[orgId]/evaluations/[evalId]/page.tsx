import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Play, BarChart3, GitCompareArrows, Map } from 'lucide-react';
import Link from 'next/link';
import { EVALUATION_STATUS_LABELS, MATURITY_LABELS, MATURITY_COLORS } from '@/lib/constants';
import type { EvaluationStatus, MaturityStatus } from '@/lib/constants';

export default async function EvaluationOverviewPage({
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
    SELECT e.*, o.name as org_name
    FROM evaluations e
    JOIN organizations o ON o.id = e.organization_id
    WHERE e.id = ${evalId}
  `;
  if (evalRows.length === 0) notFound();
  const evaluation = evalRows[0];

  const stats = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE maturity_status != 'no_evaluado') as evaluated,
      COUNT(*) FILTER (WHERE maturity_status = 'no_evaluado') as pending,
      COUNT(*) FILTER (WHERE maturity_status = 'inexistente') as inexistente,
      COUNT(*) FILTER (WHERE maturity_status = 'parcial') as parcial,
      COUNT(*) FILTER (WHERE maturity_status = 'documentado') as documentado,
      COUNT(*) FILTER (WHERE maturity_status = 'implementado') as implementado,
      COUNT(*) FILTER (WHERE maturity_status = 'optimizado') as optimizado,
      ROUND(AVG(CASE WHEN maturity_status != 'no_evaluado' THEN maturity_score END)::numeric, 2) as avg_score
    FROM evaluation_entries
    WHERE evaluation_id = ${evalId}
  `;
  const s = stats[0];
  const progress = s.total > 0 ? Math.round((Number(s.evaluated) / Number(s.total)) * 100) : 0;

  const statusDistribution = [
    { status: 'inexistente' as MaturityStatus, count: Number(s.inexistente) },
    { status: 'parcial' as MaturityStatus, count: Number(s.parcial) },
    { status: 'documentado' as MaturityStatus, count: Number(s.documentado) },
    { status: 'implementado' as MaturityStatus, count: Number(s.implementado) },
    { status: 'optimizado' as MaturityStatus, count: Number(s.optimizado) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/organizations/${orgId}`}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{evaluation.name}</h1>
            <Badge variant="secondary">
              {EVALUATION_STATUS_LABELS[evaluation.status as EvaluationStatus]}
            </Badge>
          </div>
          <p className="text-muted-foreground">{evaluation.org_name}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progreso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{progress}%</div>
            <Progress value={progress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {s.evaluated} de {s.total} procesos evaluados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Score promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{s.avg_score ?? '—'}</div>
            <p className="text-xs text-muted-foreground mt-1">de 5.0 posible</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Profundidad</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Nivel {evaluation.evaluation_depth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {evaluation.evaluation_depth === 3 ? 'Procesos' : evaluation.evaluation_depth === 4 ? 'Actividades' : 'Tareas'}
            </p>
          </CardContent>
        </Card>
      </div>

      {Number(s.evaluated) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución de madurez</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 h-8">
              {statusDistribution.filter(d => d.count > 0).map((d) => (
                <div
                  key={d.status}
                  className="rounded flex items-center justify-center text-xs font-medium"
                  style={{
                    backgroundColor: MATURITY_COLORS[d.status],
                    width: `${(d.count / Number(s.evaluated)) * 100}%`,
                    minWidth: d.count > 0 ? '2rem' : 0,
                  }}
                >
                  {d.count}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 mt-3">
              {statusDistribution.map((d) => (
                <div key={d.status} className="flex items-center gap-1.5 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: MATURITY_COLORS[d.status] }} />
                  {MATURITY_LABELS[d.status]}: {d.count}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Button asChild size="lg" className="h-auto py-4 flex-col gap-2">
          <Link href={`/organizations/${orgId}/evaluations/${evalId}/evaluate`}>
            <Play className="h-5 w-5" />
            <span>Evaluar procesos</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-auto py-4 flex-col gap-2">
          <Link href={`/organizations/${orgId}/evaluations/${evalId}/report`}>
            <BarChart3 className="h-5 w-5" />
            <span>Reporte</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-auto py-4 flex-col gap-2">
          <Link href={`/organizations/${orgId}/evaluations/${evalId}/gap-analysis`}>
            <GitCompareArrows className="h-5 w-5" />
            <span>Análisis de brechas</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="h-auto py-4 flex-col gap-2">
          <Link href={`/organizations/${orgId}/evaluations/${evalId}/process-map`}>
            <Map className="h-5 w-5" />
            <span>Mapa de procesos</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}
