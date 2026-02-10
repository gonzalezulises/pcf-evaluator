import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ evalId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { evalId } = await params;
  const sql = getDb();

  // Verify access
  const access = await sql`
    SELECT uo.role FROM user_organizations uo
    JOIN evaluations e ON e.organization_id = uo.organization_id
    WHERE e.id = ${evalId} AND uo.user_id = ${session.user.id}
  `;
  if (access.length === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  // Overall stats
  const overall = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE maturity_status != 'no_evaluado') as evaluated,
      COUNT(*) FILTER (WHERE maturity_status = 'no_evaluado') as pending,
      COUNT(*) FILTER (WHERE maturity_status = 'inexistente') as inexistente,
      COUNT(*) FILTER (WHERE maturity_status = 'parcial') as parcial,
      COUNT(*) FILTER (WHERE maturity_status = 'documentado') as documentado,
      COUNT(*) FILTER (WHERE maturity_status = 'implementado') as implementado,
      COUNT(*) FILTER (WHERE maturity_status = 'optimizado') as optimizado,
      COUNT(*) FILTER (WHERE is_applicable = false) as not_applicable,
      ROUND(AVG(CASE WHEN maturity_status != 'no_evaluado' THEN maturity_score END)::numeric, 2) as avg_score
    FROM evaluation_entries
    WHERE evaluation_id = ${evalId}
  `;

  // Per-category stats
  const categoryStats = await sql`
    SELECT
      pe.category_number,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE ee.maturity_status != 'no_evaluado') as evaluated,
      COUNT(*) FILTER (WHERE ee.maturity_status = 'inexistente') as inexistente,
      COUNT(*) FILTER (WHERE ee.maturity_status = 'parcial') as parcial,
      COUNT(*) FILTER (WHERE ee.maturity_status = 'documentado') as documentado,
      COUNT(*) FILTER (WHERE ee.maturity_status = 'implementado') as implementado,
      COUNT(*) FILTER (WHERE ee.maturity_status = 'optimizado') as optimizado,
      ROUND(AVG(CASE WHEN ee.maturity_status != 'no_evaluado' THEN ee.maturity_score END)::numeric, 2) as avg_score
    FROM evaluation_entries ee
    JOIN pcf_elements pe ON pe.hierarchy_id = ee.pcf_element_hierarchy_id
    WHERE ee.evaluation_id = ${evalId}
    GROUP BY pe.category_number
    ORDER BY pe.category_number
  `;

  // Per-level stats
  const levelStats = await sql`
    SELECT
      pe.level,
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE ee.maturity_status != 'no_evaluado') as evaluated,
      ROUND(AVG(CASE WHEN ee.maturity_status != 'no_evaluado' THEN ee.maturity_score END)::numeric, 2) as avg_score
    FROM evaluation_entries ee
    JOIN pcf_elements pe ON pe.hierarchy_id = ee.pcf_element_hierarchy_id
    WHERE ee.evaluation_id = ${evalId}
    GROUP BY pe.level
    ORDER BY pe.level
  `;

  // Top gaps: lowest scoring evaluated processes (level 3+)
  const gaps = await sql`
    SELECT
      ee.pcf_element_hierarchy_id,
      pe.name as pcf_name,
      pe.level as pcf_level,
      pe.category_number,
      ee.maturity_status,
      ee.maturity_score,
      ee.client_process_name,
      ee.responsible_area
    FROM evaluation_entries ee
    JOIN pcf_elements pe ON pe.hierarchy_id = ee.pcf_element_hierarchy_id
    WHERE ee.evaluation_id = ${evalId}
      AND ee.maturity_status IN ('inexistente', 'parcial')
      AND pe.level >= 3
    ORDER BY ee.maturity_score ASC, pe.category_number, pe.hierarchy_id
  `;

  return NextResponse.json({
    overall: overall[0],
    categoryStats,
    levelStats,
    gaps,
  });
}
