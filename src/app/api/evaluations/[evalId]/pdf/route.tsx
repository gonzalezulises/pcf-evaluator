import { renderToBuffer } from '@react-pdf/renderer';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { EvaluationPDF } from '@/lib/pdf-template';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ evalId: string }> }
) {
  const session = await auth();
  if (!session?.user) return new Response('No autorizado', { status: 401 });

  const { evalId } = await params;
  const sql = getDb();

  // Verify access
  const access = await sql`
    SELECT uo.role FROM user_organizations uo
    JOIN evaluations e ON e.organization_id = uo.organization_id
    WHERE e.id = ${evalId} AND uo.user_id = ${session.user.id}
  `;
  if (access.length === 0) return new Response('Sin acceso', { status: 403 });

  // Fetch evaluation data
  const evalRows = await sql`
    SELECT e.*, o.name as org_name, o.industry, o.country
    FROM evaluations e
    JOIN organizations o ON o.id = e.organization_id
    WHERE e.id = ${evalId}
  `;
  if (evalRows.length === 0) return new Response('No encontrada', { status: 404 });
  const evaluation = evalRows[0];

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

  // Gaps
  const gaps = await sql`
    SELECT ee.pcf_element_hierarchy_id, pe.name as pcf_name, pe.category_number,
      ee.maturity_status, ee.client_process_name
    FROM evaluation_entries ee
    JOIN pcf_elements pe ON pe.hierarchy_id = ee.pcf_element_hierarchy_id
    WHERE ee.evaluation_id = ${evalId}
      AND ee.maturity_status IN ('inexistente', 'parcial')
      AND pe.level >= 3
    ORDER BY ee.maturity_score ASC, pe.category_number
  `;

  const pdfData = {
    evaluation: {
      name: evaluation.name as string,
      description: evaluation.description as string | null,
      evaluation_depth: evaluation.evaluation_depth as number,
      created_at: evaluation.created_at as string,
    },
    organization: {
      name: evaluation.org_name as string,
      industry: evaluation.industry as string | null,
      country: evaluation.country as string | null,
    },
    consultant: {
      name: session.user.name,
      email: session.user.email,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    overall: overall[0] as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categoryStats: categoryStats as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gaps: gaps as any,
  };

  const buffer = await renderToBuffer(
    <EvaluationPDF data={pdfData} />
  );

  const fileName = `PCF_Evaluacion_${evaluation.org_name}_${new Date().toISOString().split('T')[0]}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
