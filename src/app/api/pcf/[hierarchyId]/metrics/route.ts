import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ hierarchyId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { hierarchyId } = await params;
  const sql = getDb();

  const metrics = await sql`
    SELECT * FROM pcf_metrics
    WHERE pcf_element_hierarchy_id = ${hierarchyId}
    ORDER BY metric_id
  `;

  return NextResponse.json(metrics);
}
