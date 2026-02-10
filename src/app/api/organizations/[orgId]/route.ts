import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

async function verifyAccess(userId: string, orgId: string) {
  const sql = getDb();
  const rows = await sql`
    SELECT role FROM user_organizations
    WHERE user_id = ${userId} AND organization_id = ${orgId}
  `;
  return rows[0] || null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { orgId } = await params;
  const access = await verifyAccess(session.user.id, orgId);
  if (!access) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  const sql = getDb();
  const rows = await sql`SELECT * FROM organizations WHERE id = ${orgId}`;
  if (rows.length === 0) return NextResponse.json({ error: 'No encontrada' }, { status: 404 });

  return NextResponse.json(rows[0]);
}

const updateOrgSchema = z.object({
  name: z.string().min(2).optional(),
  industry: z.string().optional(),
  country: z.string().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { orgId } = await params;
  const access = await verifyAccess(session.user.id, orgId);
  if (!access || access.role === 'viewer') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  try {
    const body = await request.json();
    const data = updateOrgSchema.parse(body);

    const sql = getDb();
    const result = await sql`
      UPDATE organizations SET
        name = COALESCE(${data.name ?? null}, name),
        industry = COALESCE(${data.industry ?? null}, industry),
        country = COALESCE(${data.country ?? null}, country),
        contact_name = COALESCE(${data.contact_name ?? null}, contact_name),
        contact_email = COALESCE(${data.contact_email ?? null}, contact_email),
        notes = COALESCE(${data.notes ?? null}, notes)
      WHERE id = ${orgId}
      RETURNING *
    `;

    return NextResponse.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { orgId } = await params;
  const access = await verifyAccess(session.user.id, orgId);
  if (!access) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  const sql = getDb();
  await sql`DELETE FROM organizations WHERE id = ${orgId}`;

  return NextResponse.json({ ok: true });
}
