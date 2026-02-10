import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nombre muy corto').optional(),
  current_password: z.string().optional(),
  new_password: z.string().min(6, 'Mínimo 6 caracteres').optional(),
});

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const sql = getDb();

  try {
    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    // If changing password, verify current password
    if (data.new_password) {
      if (!data.current_password) {
        return NextResponse.json({ error: 'Contraseña actual requerida' }, { status: 400 });
      }

      const userRows = await sql`SELECT password_hash FROM users WHERE id = ${session.user.id}`;
      if (userRows.length === 0) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

      const valid = await bcrypt.compare(data.current_password, userRows[0].password_hash as string);
      if (!valid) {
        return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 400 });
      }

      const newHash = await bcrypt.hash(data.new_password, 12);
      await sql`UPDATE users SET password_hash = ${newHash} WHERE id = ${session.user.id}`;
    }

    if (data.name) {
      await sql`UPDATE users SET name = ${data.name} WHERE id = ${session.user.id}`;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 });
  }
}
