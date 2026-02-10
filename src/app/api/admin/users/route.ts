import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { error: 'No autorizado', status: 401 };
  if (session.user.role !== 'admin') return { error: 'Requiere rol admin', status: 403 };
  return { session };
}

export async function GET() {
  const check = await requireAdmin();
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const sql = getDb();
  const users = await sql`
    SELECT u.id, u.email, u.name, u.role, u.is_active, u.created_at,
      (SELECT COUNT(*) FROM user_organizations uo WHERE uo.user_id = u.id) as org_count
    FROM users u
    ORDER BY u.created_at DESC
  `;

  return NextResponse.json(users);
}

const createUserSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre muy corto'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role: z.enum(['admin', 'consultant', 'viewer']).default('consultant'),
});

export async function POST(request: Request) {
  const check = await requireAdmin();
  if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

  const sql = getDb();

  try {
    const body = await request.json();
    const data = createUserSchema.parse(body);

    // Check if email already exists
    const existing = await sql`SELECT id FROM users WHERE email = ${data.email}`;
    if (existing.length > 0) {
      return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await sql`
      INSERT INTO users (email, name, password_hash, role)
      VALUES (${data.email}, ${data.name}, ${passwordHash}, ${data.role})
      RETURNING id, email, name, role, is_active, created_at
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 });
  }
}
