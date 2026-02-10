import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { getDb } from '@/lib/db';
import { rateLimitByIp } from '@/lib/rate-limit';

const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  name: z.string().min(2, 'Nombre muy corto'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, 'register', { limit: 5, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Demasiados intentos. Intenta de nuevo en un minuto.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const sql = getDb();

    const existing = await sql`SELECT id FROM users WHERE email = ${data.email}`;
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Este email ya está registrado' },
        { status: 409 }
      );
    }

    const passwordHash = await hash(data.password, 12);

    const result = await sql`
      INSERT INTO users (email, name, password_hash, role)
      VALUES (${data.email}, ${data.name}, ${passwordHash}, 'consultant')
      RETURNING id, email, name, role
    `;

    return NextResponse.json({ user: result[0] }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Error al registrar usuario' },
      { status: 500 }
    );
  }
}
