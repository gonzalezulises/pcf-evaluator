import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';
import * as XLSX from 'xlsx';
import * as path from 'path';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

function getLevel(hierarchyId: string): number {
  return hierarchyId.split('.').length;
}

function getParentHierarchyId(hierarchyId: string): string | null {
  const parts = hierarchyId.split('.');
  if (parts.length <= 1) return null;
  return parts.slice(0, -1).join('.');
}

function getCategoryNumber(hierarchyId: string): number {
  return parseInt(hierarchyId.split('.')[0], 10);
}

async function seedPcfElements() {
  const filePath = path.join(process.cwd(), 'data', 'pcf-cross-industry-es.xlsx');
  const workbook = XLSX.readFile(filePath);

  const sheet = workbook.Sheets['Combinado'];
  if (!sheet) throw new Error('Sheet "Combinado" not found');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  console.log(`Found ${rows.length} PCF elements to insert`);

  await sql`DELETE FROM pcf_metrics`;
  await sql`DELETE FROM pcf_elements`;
  console.log('Cleared existing PCF data');

  // Sort by level to ensure parents are inserted before children
  const sorted = rows.sort((a, b) => {
    const aLevel = getLevel(String(a['ID Jerárquico']));
    const bLevel = getLevel(String(b['ID Jerárquico']));
    return aLevel - bLevel;
  });

  let inserted = 0;

  for (const row of sorted) {
    const hierarchyId = String(row['ID Jerárquico']).trim();
    const pcfId = String(row['ID PCF']).trim();
    const name = String(row['Nombre'] || '').trim();
    const description = row['Descripción del Elemento']
      ? String(row['Descripción del Elemento']).trim()
      : null;
    const level = getLevel(hierarchyId);
    const parentHierarchyId = getParentHierarchyId(hierarchyId);
    const categoryNumber = getCategoryNumber(hierarchyId);

    await sql`
      INSERT INTO pcf_elements (pcf_id, hierarchy_id, level, name, description, parent_hierarchy_id, category_number)
      VALUES (${pcfId}, ${hierarchyId}, ${level}, ${name}, ${description}, ${parentHierarchyId}, ${categoryNumber})
      ON CONFLICT (hierarchy_id) DO UPDATE SET
        pcf_id = EXCLUDED.pcf_id,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        parent_hierarchy_id = EXCLUDED.parent_hierarchy_id,
        category_number = EXCLUDED.category_number
    `;

    inserted++;
    if (inserted % 200 === 0 || inserted === sorted.length) {
      console.log(`  Elements: ${inserted}/${sorted.length}`);
    }
  }

  console.log(`✓ Inserted ${inserted} PCF elements`);
  return inserted;
}

async function seedPcfMetrics() {
  const filePath = path.join(process.cwd(), 'data', 'pcf-cross-industry-es.xlsx');
  const workbook = XLSX.readFile(filePath);

  const sheet = workbook.Sheets['Métricas'];
  if (!sheet) throw new Error('Sheet "Métricas" not found');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
  console.log(`Found ${rows.length} PCF metrics to insert`);

  let inserted = 0;

  for (const row of rows) {
    const metricId = String(row['ID de Métrica'] || '').trim();
    const hierarchyId = String(row['ID Jerárquico'] || '').trim();
    const name = String(row['Nombre de Métrica'] || '').trim();
    const category = row['Categoría de Métrica']
      ? String(row['Categoría de Métrica']).trim()
      : null;
    const formula = row['Fórmula']
      ? String(row['Fórmula']).trim()
      : null;
    const units = row['Unidades']
      ? String(row['Unidades']).trim()
      : null;

    await sql`
      INSERT INTO pcf_metrics (metric_id, pcf_element_hierarchy_id, name, category, formula, units)
      VALUES (${metricId}, ${hierarchyId}, ${name}, ${category}, ${formula}, ${units})
    `;

    inserted++;
    if (inserted % 500 === 0 || inserted === rows.length) {
      console.log(`  Metrics: ${inserted}/${rows.length}`);
    }
  }

  console.log(`✓ Inserted ${inserted} PCF metrics`);
  return inserted;
}

async function main() {
  console.log('Starting PCF data seeding...\n');

  const elements = await seedPcfElements();
  console.log('');
  const metrics = await seedPcfMetrics();

  console.log('\n--- Summary ---');
  console.log(`PCF Elements: ${elements}`);
  console.log(`PCF Metrics: ${metrics}`);
  console.log('Seeding complete!');
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
