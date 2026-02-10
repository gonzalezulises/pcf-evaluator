import { NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ evidenceId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (session.user.role === 'viewer') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const { evidenceId } = await params;
  const sql = getDb();

  // Get file and verify access
  const files = await sql`
    SELECT ef.*, uo.role as user_role FROM evidence_files ef
    JOIN evaluation_entries ee ON ee.id = ef.evaluation_entry_id
    JOIN evaluations e ON e.id = ee.evaluation_id
    JOIN user_organizations uo ON uo.organization_id = e.organization_id
    WHERE ef.id = ${evidenceId} AND uo.user_id = ${session.user.id}
  `;

  if (files.length === 0) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

  const file = files[0];

  // Delete from Vercel Blob
  try {
    await del(file.blob_url as string);
  } catch {
    // If blob deletion fails, continue with DB deletion
    console.warn('Failed to delete blob:', file.blob_url);
  }

  // Delete from DB
  await sql`DELETE FROM evidence_files WHERE id = ${evidenceId}`;

  return NextResponse.json({ success: true });
}
