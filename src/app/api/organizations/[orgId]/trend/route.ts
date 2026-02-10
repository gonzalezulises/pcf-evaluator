import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { orgId } = await params;
  const sql = getDb();

  // Verify access
  const access = await sql`
    SELECT role FROM user_organizations
    WHERE user_id = ${session.user.id} AND organization_id = ${orgId}
  `;
  if (access.length === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  // Get evaluation scores over time
  const trend = await sql`
    SELECT
      e.id,
      e.name,
      e.created_at,
      ROUND(AVG(CASE WHEN ee.maturity_status != 'no_evaluado' THEN ee.maturity_score END)::numeric, 2) as avg_score,
      COUNT(*) FILTER (WHERE ee.maturity_status != 'no_evaluado') as evaluated,
      COUNT(*) as total
    FROM evaluations e
    JOIN evaluation_entries ee ON ee.evaluation_id = e.id
    WHERE e.organization_id = ${orgId}
    GROUP BY e.id, e.name, e.created_at
    HAVING COUNT(*) FILTER (WHERE ee.maturity_status != 'no_evaluado') > 0
    ORDER BY e.created_at ASC
  `;

  // Per-category trend for each evaluation
  const categoryTrend = await sql`
    SELECT
      e.id as evaluation_id,
      pe.category_number,
      ROUND(AVG(CASE WHEN ee.maturity_status != 'no_evaluado' THEN ee.maturity_score END)::numeric, 2) as avg_score
    FROM evaluations e
    JOIN evaluation_entries ee ON ee.evaluation_id = e.id
    JOIN pcf_elements pe ON pe.hierarchy_id = ee.pcf_element_hierarchy_id
    WHERE e.organization_id = ${orgId}
      AND ee.maturity_status != 'no_evaluado'
    GROUP BY e.id, pe.category_number
    ORDER BY e.id, pe.category_number
  `;

  return NextResponse.json({ trend, categoryTrend });
}
