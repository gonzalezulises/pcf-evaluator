import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

const createOrgSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto'),
  industry: z.string().optional(),
  country: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getDb();
  const orgs = await sql`
    SELECT o.*, uo.role as user_role,
      (SELECT COUNT(*) FROM evaluations e WHERE e.organization_id = o.id) as evaluation_count
    FROM organizations o
    JOIN user_organizations uo ON uo.organization_id = o.id
    WHERE uo.user_id = ${session.user.id}
    ORDER BY o.created_at DESC
  `;

  return NextResponse.json(orgs);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.user.role === 'viewer') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  try {
    const body = await request.json();
    const data = createOrgSchema.parse(body);

    const sql = getDb();

    const result = await sql`
      INSERT INTO organizations (name, industry, country, contact_name, contact_email, notes, created_by)
      VALUES (${data.name}, ${data.industry || null}, ${data.country || null}, ${data.contact_name || null}, ${data.contact_email || null}, ${data.notes || null}, ${session.user.id})
      RETURNING *
    `;

    await sql`
      INSERT INTO user_organizations (user_id, organization_id, role)
      VALUES (${session.user.id}, ${result[0].id}, 'consultant')
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Create org error:', error);
    return NextResponse.json({ error: 'Error al crear organización' }, { status: 500 });
  }
}
