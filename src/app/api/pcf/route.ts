import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('q');
  const category = searchParams.get('category');
  const level = searchParams.get('level');
  const parentId = searchParams.get('parent');
  const limit = Math.min(Number(searchParams.get('limit') || 100), 500);
  const offset = Number(searchParams.get('offset') || 0);

  const sql = getDb();

  // Search mode
  if (search && search.length >= 2) {
    const pattern = `%${search}%`;
    const results = await sql`
      SELECT pe.*,
        (SELECT COUNT(*) FROM pcf_metrics pm WHERE pm.pcf_element_hierarchy_id = pe.hierarchy_id) as metric_count
      FROM pcf_elements pe
      WHERE (pe.name ILIKE ${pattern} OR pe.hierarchy_id ILIKE ${pattern} OR pe.description ILIKE ${pattern})
        ${category ? sql`AND pe.category_number = ${Number(category)}` : sql``}
        ${level ? sql`AND pe.level = ${Number(level)}` : sql``}
      ORDER BY pe.hierarchy_id
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countResult = await sql`
      SELECT COUNT(*) as total FROM pcf_elements pe
      WHERE (pe.name ILIKE ${pattern} OR pe.hierarchy_id ILIKE ${pattern} OR pe.description ILIKE ${pattern})
        ${category ? sql`AND pe.category_number = ${Number(category)}` : sql``}
        ${level ? sql`AND pe.level = ${Number(level)}` : sql``}
    `;

    return NextResponse.json({
      elements: results,
      total: Number(countResult[0].total),
      limit,
      offset,
    });
  }

  // Browse mode (by parent or top-level)
  if (parentId) {
    const children = await sql`
      SELECT pe.*,
        (SELECT COUNT(*) FROM pcf_elements child WHERE child.parent_hierarchy_id = pe.hierarchy_id) as child_count,
        (SELECT COUNT(*) FROM pcf_metrics pm WHERE pm.pcf_element_hierarchy_id = pe.hierarchy_id) as metric_count
      FROM pcf_elements pe
      WHERE pe.parent_hierarchy_id = ${parentId}
      ORDER BY pe.hierarchy_id
    `;
    return NextResponse.json({ elements: children });
  }

  // Default: top-level categories
  const categories = await sql`
    SELECT pe.*,
      (SELECT COUNT(*) FROM pcf_elements child WHERE child.parent_hierarchy_id = pe.hierarchy_id) as child_count,
      (SELECT COUNT(*) FROM pcf_elements sub WHERE sub.category_number = pe.category_number) as total_elements
    FROM pcf_elements pe
    WHERE pe.level = 1
    ORDER BY pe.category_number
  `;

  return NextResponse.json({ elements: categories });
}
