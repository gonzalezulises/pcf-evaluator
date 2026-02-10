import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

const createEvalSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  evaluation_depth: z.number().int().min(3).max(5),
  included_categories: z.array(z.number().int().min(1).max(13)).min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.user.role === 'viewer') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { orgId } = await params;
  const sql = getDb();

  // Verify access
  const access = await sql`
    SELECT role FROM user_organizations
    WHERE user_id = ${session.user.id} AND organization_id = ${orgId}
  `;
  if (access.length === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  try {
    const body = await request.json();
    const data = createEvalSchema.parse(body);

    // Create evaluation
    const evalResult = await sql`
      INSERT INTO evaluations (organization_id, name, description, evaluation_depth, included_categories, created_by, status)
      VALUES (${orgId}, ${data.name}, ${data.description || null}, ${data.evaluation_depth}, ${data.included_categories}, ${session.user.id}, 'draft')
      RETURNING *
    `;

    const evaluation = evalResult[0];

    // Get PCF elements matching the depth and categories
    const elements = await sql`
      SELECT hierarchy_id FROM pcf_elements
      WHERE level <= ${data.evaluation_depth}
        AND category_number = ANY(${data.included_categories})
      ORDER BY hierarchy_id
    `;

    // Create evaluation entries for each element
    for (const element of elements) {
      await sql`
        INSERT INTO evaluation_entries (evaluation_id, pcf_element_hierarchy_id)
        VALUES (${evaluation.id}, ${element.hierarchy_id})
        ON CONFLICT DO NOTHING
      `;
    }

    return NextResponse.json({
      ...evaluation,
      entry_count: elements.length,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Create eval error:', error);
    return NextResponse.json({ error: 'Error al crear evaluación' }, { status: 500 });
  }
}
