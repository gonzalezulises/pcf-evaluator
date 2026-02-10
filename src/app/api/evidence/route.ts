import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { rateLimitByIp } from '@/lib/rate-limit';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
];

export async function POST(request: Request) {
  const rl = rateLimitByIp(request, 'evidence-upload', { limit: 30, windowMs: 60_000 });
  if (!rl.success) {
    return NextResponse.json({ error: 'Demasiados archivos subidos. Intenta de nuevo en un minuto.' }, { status: 429 });
  }

  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.user.role === 'viewer') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const sql = getDb();

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const entryId = formData.get('entry_id') as string | null;

    if (!file || !entryId) {
      return NextResponse.json({ error: 'Archivo y entry_id requeridos' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Archivo excede 10MB' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
    }

    // Verify access: entry -> evaluation -> org -> user_organizations
    const access = await sql`
      SELECT uo.role FROM user_organizations uo
      JOIN evaluations e ON e.organization_id = uo.organization_id
      JOIN evaluation_entries ee ON ee.evaluation_id = e.id
      WHERE ee.id = ${entryId} AND uo.user_id = ${session.user.id}
    `;
    if (access.length === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

    // Upload to Vercel Blob
    const blob = await put(`evidence/${entryId}/${file.name}`, file, {
      access: 'public',
    });

    // Save record in DB
    const result = await sql`
      INSERT INTO evidence_files (evaluation_entry_id, file_name, file_type, file_size, blob_url, uploaded_by)
      VALUES (${entryId}, ${file.name}, ${file.type}, ${file.size}, ${blob.url}, ${session.user.id})
      RETURNING *
    `;

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Evidence upload error:', error);
    return NextResponse.json({ error: 'Error al subir archivo' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get('entry_id');

  if (!entryId) {
    return NextResponse.json({ error: 'entry_id requerido' }, { status: 400 });
  }

  const sql = getDb();

  // Verify access
  const access = await sql`
    SELECT uo.role FROM user_organizations uo
    JOIN evaluations e ON e.organization_id = uo.organization_id
    JOIN evaluation_entries ee ON ee.evaluation_id = e.id
    WHERE ee.id = ${entryId} AND uo.user_id = ${session.user.id}
  `;
  if (access.length === 0) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 });

  const files = await sql`
    SELECT ef.*, u.name as uploaded_by_name
    FROM evidence_files ef
    LEFT JOIN users u ON u.id = ef.uploaded_by
    WHERE ef.evaluation_entry_id = ${entryId}
    ORDER BY ef.created_at DESC
  `;

  return NextResponse.json(files);
}
