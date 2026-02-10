import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
  console.log('Running migrations...');

  // PCF reference data
  await sql`
    CREATE TABLE IF NOT EXISTS pcf_elements (
      id SERIAL PRIMARY KEY,
      pcf_id VARCHAR(20) NOT NULL,
      hierarchy_id VARCHAR(30) NOT NULL UNIQUE,
      level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 5),
      name TEXT NOT NULL,
      description TEXT,
      parent_hierarchy_id VARCHAR(30),
      category_number SMALLINT NOT NULL
    )
  `;
  console.log('  ✓ pcf_elements');

  await sql`
    CREATE TABLE IF NOT EXISTS pcf_metrics (
      id SERIAL PRIMARY KEY,
      metric_id VARCHAR(30) NOT NULL,
      pcf_element_hierarchy_id VARCHAR(30) REFERENCES pcf_elements(hierarchy_id),
      name TEXT NOT NULL,
      category VARCHAR(50),
      formula TEXT,
      units VARCHAR(50)
    )
  `;
  console.log('  ✓ pcf_metrics');

  // Users and multi-tenancy
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(254) NOT NULL UNIQUE,
      name VARCHAR(200) NOT NULL,
      password_hash VARCHAR(128) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'consultant'
        CHECK (role IN ('admin', 'consultant', 'viewer')),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ users');

  await sql`
    CREATE TABLE IF NOT EXISTS organizations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(300) NOT NULL,
      industry VARCHAR(100),
      country VARCHAR(100),
      contact_name VARCHAR(200),
      contact_email VARCHAR(254),
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ organizations');

  await sql`
    CREATE TABLE IF NOT EXISTS user_organizations (
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      role VARCHAR(20) DEFAULT 'consultant',
      PRIMARY KEY (user_id, organization_id)
    )
  `;
  console.log('  ✓ user_organizations');

  // Evaluations
  await sql`
    CREATE TABLE IF NOT EXISTS evaluations (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
      name VARCHAR(300) NOT NULL,
      description TEXT,
      evaluation_depth SMALLINT NOT NULL DEFAULT 3 CHECK (evaluation_depth BETWEEN 3 AND 5),
      status VARCHAR(20) DEFAULT 'draft'
        CHECK (status IN ('draft', 'in_progress', 'completed', 'archived')),
      included_categories SMALLINT[],
      created_by INTEGER REFERENCES users(id),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ evaluations');

  await sql`
    CREATE TABLE IF NOT EXISTS evaluation_entries (
      id SERIAL PRIMARY KEY,
      evaluation_id INTEGER REFERENCES evaluations(id) ON DELETE CASCADE,
      pcf_element_hierarchy_id VARCHAR(30) NOT NULL,
      maturity_status VARCHAR(30) DEFAULT 'no_evaluado'
        CHECK (maturity_status IN ('no_evaluado','inexistente','parcial','documentado','implementado','optimizado')),
      maturity_score SMALLINT CHECK (maturity_score BETWEEN 0 AND 5),
      client_process_name VARCHAR(300),
      responsible_area VARCHAR(200),
      responsible_person VARCHAR(200),
      notes TEXT,
      evidence_links TEXT[],
      is_applicable BOOLEAN DEFAULT TRUE,
      evaluated_by INTEGER REFERENCES users(id),
      evaluated_at TIMESTAMPTZ,
      UNIQUE(evaluation_id, pcf_element_hierarchy_id)
    )
  `;
  console.log('  ✓ evaluation_entries');

  await sql`
    CREATE TABLE IF NOT EXISTS evidence_files (
      id SERIAL PRIMARY KEY,
      evaluation_entry_id INTEGER REFERENCES evaluation_entries(id) ON DELETE CASCADE,
      file_name VARCHAR(500) NOT NULL,
      file_type VARCHAR(100),
      file_size INTEGER,
      blob_url TEXT NOT NULL,
      uploaded_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('  ✓ evidence_files');

  // Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_pcf_elements_level ON pcf_elements(level)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pcf_elements_parent ON pcf_elements(parent_hierarchy_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pcf_elements_category ON pcf_elements(category_number)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pcf_metrics_element ON pcf_metrics(pcf_element_hierarchy_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_evaluations_org ON evaluations(organization_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_evaluation_entries_eval ON evaluation_entries(evaluation_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_evaluation_entries_pcf ON evaluation_entries(pcf_element_hierarchy_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_evidence_files_entry ON evidence_files(evaluation_entry_id)`;
  console.log('  ✓ indexes');

  console.log('Migrations complete!');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
