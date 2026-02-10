import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { orgId } = await params;
  const { searchParams } = new URL(request.url);
  const evalA = searchParams.get('a');
  const evalB = searchParams.get('b');

  if (!evalA || !evalB) {
    return NextResponse.json({ error: 'Parámetros a y b requeridos' }, { status: 400 });
  }

  const sql = getDb();

  // Verify access
  const access = await sql`
    SELECT role FROM user_organizations
    WHERE user_id = ${session.user.id} AND organization_id = ${orgId}
  `;
  if (access.length === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  // Get evaluation info
  const evals = await sql`
    SELECT id, name, created_at, evaluation_depth
    FROM evaluations
    WHERE id IN (${evalA}, ${evalB}) AND organization_id = ${orgId}
  `;
  if (evals.length !== 2) {
    return NextResponse.json({ error: 'Evaluaciones no encontradas' }, { status: 404 });
  }

  // Overall stats for both evaluations
  const overallStats = await sql`
    SELECT
      ee.evaluation_id,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE ee.maturity_status != 'no_evaluado') as evaluated,
      ROUND(AVG(CASE WHEN ee.maturity_status != 'no_evaluado' THEN ee.maturity_score END)::numeric, 2) as avg_score,
      COUNT(*) FILTER (WHERE ee.maturity_status = 'inexistente') as inexistente,
      COUNT(*) FILTER (WHERE ee.maturity_status = 'parcial') as parcial,
      COUNT(*) FILTER (WHERE ee.maturity_status = 'documentado') as documentado,
      COUNT(*) FILTER (WHERE ee.maturity_status = 'implementado') as implementado,
      COUNT(*) FILTER (WHERE ee.maturity_status = 'optimizado') as optimizado
    FROM evaluation_entries ee
    WHERE ee.evaluation_id IN (${evalA}, ${evalB})
    GROUP BY ee.evaluation_id
  `;

  // Per-category comparison
  const categoryStats = await sql`
    SELECT
      ee.evaluation_id,
      pe.category_number,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE ee.maturity_status != 'no_evaluado') as evaluated,
      ROUND(AVG(CASE WHEN ee.maturity_status != 'no_evaluado' THEN ee.maturity_score END)::numeric, 2) as avg_score
    FROM evaluation_entries ee
    JOIN pcf_elements pe ON pe.hierarchy_id = ee.pcf_element_hierarchy_id
    WHERE ee.evaluation_id IN (${evalA}, ${evalB})
    GROUP BY ee.evaluation_id, pe.category_number
    ORDER BY pe.category_number
  `;

  // Process-level deltas (processes that changed status between evaluations)
  const changes = await sql`
    SELECT
      a.pcf_element_hierarchy_id,
      pe.name as pcf_name,
      pe.category_number,
      pe.level as pcf_level,
      a.maturity_status as status_a,
      a.maturity_score as score_a,
      b.maturity_status as status_b,
      b.maturity_score as score_b,
      COALESCE(b.maturity_score, 0) - COALESCE(a.maturity_score, 0) as delta
    FROM evaluation_entries a
    JOIN evaluation_entries b ON b.pcf_element_hierarchy_id = a.pcf_element_hierarchy_id
      AND b.evaluation_id = ${evalB}
    JOIN pcf_elements pe ON pe.hierarchy_id = a.pcf_element_hierarchy_id
    WHERE a.evaluation_id = ${evalA}
      AND a.maturity_status != 'no_evaluado'
      AND b.maturity_status != 'no_evaluado'
      AND a.maturity_score != b.maturity_score
    ORDER BY (COALESCE(b.maturity_score, 0) - COALESCE(a.maturity_score, 0)) DESC
  `;

  return NextResponse.json({
    evaluations: evals,
    overallStats,
    categoryStats,
    changes,
  });
}
