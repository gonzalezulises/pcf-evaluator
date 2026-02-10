import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: 'No autorizado', status: 401 };
  if (session.user.role !== 'admin') return { error: 'Requiere rol admin', status: 403 };
  return { session };
}

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['admin', 'consultant', 'viewer']).optional(),
  is_active: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const check = await requireAdmin();
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const { userId } = await params;
  const sql = getDb();

  try {
    const body = await request.json();
    const data = updateUserSchema.parse(body);

    // Don't allow deactivating yourself
    if (data.is_active === false && String(userId) === String(check.session.user.id)) {
      return NextResponse.json({ error: 'No puedes desactivar tu propia cuenta' }, { status: 400 });
    }

    // Don't allow removing your own admin role
    if (data.role && data.role !== 'admin' && String(userId) === String(check.session.user.id)) {
      return NextResponse.json({ error: 'No puedes quitar tu propio rol de admin' }, { status: 400 });
    }

    const result = await sql`
      UPDATE users SET
        name = COALESCE(${data.name ?? null}, name),
        role = COALESCE(${data.role ?? null}, role),
        is_active = COALESCE(${data.is_active ?? null}, is_active)
      WHERE id = ${userId}
      RETURNING id, email, name, role, is_active, created_at
    `;

    if (result.length === 0) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    return NextResponse.json(result[0]);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 });
  }
}
