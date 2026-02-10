import { NextResponse } from 'next/server';
import { z } from 'zod';
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

  // Verify access via evaluation -> organization -> user_organizations
  const access = await sql`
    SELECT uo.role FROM user_organizations uo
    JOIN evaluations e ON e.organization_id = uo.organization_id
    WHERE e.id = ${evalId} AND uo.user_id = ${session.user.id}
  `;
  if (access.length === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  const entries = await sql`
    SELECT ee.*, pe.name as pcf_name, pe.description as pcf_description, pe.level as pcf_level,
      pe.parent_hierarchy_id, pe.category_number
    FROM evaluation_entries ee
    JOIN pcf_elements pe ON pe.hierarchy_id = ee.pcf_element_hierarchy_id
    WHERE ee.evaluation_id = ${evalId}
    ORDER BY ee.pcf_element_hierarchy_id
  `;

  return NextResponse.json(entries);
}

const updateEntrySchema = z.object({
  maturity_status: z.enum(['no_evaluado', 'inexistente', 'parcial', 'documentado', 'implementado', 'optimizado']).optional(),
  maturity_score: z.number().int().min(0).max(5).optional(),
  client_process_name: z.string().optional().nullable(),
  responsible_area: z.string().optional().nullable(),
  responsible_person: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  is_applicable: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ evalId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.user.role === 'viewer') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { evalId } = await params;
  const sql = getDb();

  const access = await sql`
    SELECT uo.role FROM user_organizations uo
    JOIN evaluations e ON e.organization_id = uo.organization_id
    WHERE e.id = ${evalId} AND uo.user_id = ${session.user.id}
  `;
  if (access.length === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  try {
    const body = await request.json();
    const { entry_id, ...updateData } = body;
    const data = updateEntrySchema.parse(updateData);

    const maturityScores: Record<string, number> = {
      no_evaluado: 0, inexistente: 1, parcial: 2,
      documentado: 3, implementado: 4, optimizado: 5,
    };

    const score = data.maturity_status ? maturityScores[data.maturity_status] : undefined;

    const result = await sql`
      UPDATE evaluation_entries SET
        maturity_status = COALESCE(${data.maturity_status ?? null}, maturity_status),
        maturity_score = COALESCE(${score ?? null}, maturity_score),
        client_process_name = COALESCE(${data.client_process_name ?? null}, client_process_name),
        responsible_area = COALESCE(${data.responsible_area ?? null}, responsible_area),
        responsible_person = COALESCE(${data.responsible_person ?? null}, responsible_person),
        notes = COALESCE(${data.notes ?? null}, notes),
        is_applicable = COALESCE(${data.is_applicable ?? null}, is_applicable),
        evaluated_by = ${session.user.id},
        evaluated_at = NOW()
      WHERE id = ${entry_id} AND evaluation_id = ${evalId}
      RETURNING *
    `;

    if (result.length === 0) return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 });

    return NextResponse.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Update entry error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
