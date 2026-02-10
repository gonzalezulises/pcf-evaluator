import { NextResponse } from 'next/server';
import { z } from 'zod';
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

  // Verify user has access to org
  const access = await sql`
    SELECT uo.role FROM user_organizations uo
    WHERE uo.organization_id = ${orgId} AND uo.user_id = ${session.user.id}
  `;
  if (access.length === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  const members = await sql`
    SELECT u.id, u.email, u.name, u.role as system_role, uo.role as org_role
    FROM user_organizations uo
    JOIN users u ON u.id = uo.user_id
    WHERE uo.organization_id = ${orgId}
    ORDER BY u.name
  `;

  return NextResponse.json(members);
}

const addMemberSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['consultant', 'viewer']).default('consultant'),
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

  // Verify user has access to org (only consultants/admins of the org)
  const access = await sql`
    SELECT uo.role FROM user_organizations uo
    WHERE uo.organization_id = ${orgId} AND uo.user_id = ${session.user.id}
  `;
  if (access.length === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  try {
    const body = await request.json();
    const data = addMemberSchema.parse(body);

    // Find user by email
    const users = await sql`SELECT id, name, email FROM users WHERE email = ${data.email}`;
    if (users.length === 0) {
      return NextResponse.json({ error: 'Usuario no encontrado. Debe registrarse primero.' }, { status: 404 });
    }

    const userId = users[0].id;

    // Check if already a member
    const existing = await sql`
      SELECT 1 FROM user_organizations
      WHERE user_id = ${userId} AND organization_id = ${orgId}
    `;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'El usuario ya es miembro de esta organización' }, { status: 409 });
    }

    // Add member
    await sql`
      INSERT INTO user_organizations (user_id, organization_id, role)
      VALUES (${userId}, ${orgId}, ${data.role})
    `;

    return NextResponse.json({
      id: userId,
      name: users[0].name,
      email: users[0].email,
      org_role: data.role,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Add member error:', error);
    return NextResponse.json({ error: 'Error al agregar miembro' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.user.role === 'viewer') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { orgId } = await params;
  const sql = getDb();

  // Verify user has access
  const access = await sql`
    SELECT uo.role FROM user_organizations uo
    WHERE uo.organization_id = ${orgId} AND uo.user_id = ${session.user.id}
  `;
  if (access.length === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'user_id requerido' }, { status: 400 });

  // Don't allow removing yourself
  if (String(userId) === String(session.user.id)) {
    return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 });
  }

  await sql`
    DELETE FROM user_organizations
    WHERE user_id = ${userId} AND organization_id = ${orgId}
  `;

  return NextResponse.json({ success: true });
}
