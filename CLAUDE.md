# PCF Evaluator — Contexto para Claude Code

## Qué es este proyecto

Sistema web para consultores que evalúan procesos organizacionales contra el framework APQC PCF (Process Classification Framework). Permite mapear procesos reales del cliente al estándar, evaluar madurez (0-5), identificar brechas y generar reportes PDF.

## Stack

- **Next.js 16** + React 19 + TypeScript + Tailwind v4
- **Neon Postgres** via `@neondatabase/serverless` (raw SQL, no ORM)
- **Auth.js v5** (Credentials provider + JWT strategy)
- **shadcn/ui** para componentes UI
- **Recharts** para gráficos
- **@react-pdf/renderer** para generación de PDF serverless
- **Vercel Blob** para archivos de evidencia
- **Zod** + React Hook Form para validación
- **SheetJS (xlsx)** para parsear Excel en seeding

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/           # Login, register (layout minimalista)
│   ├── (dashboard)/      # Todo el dashboard (layout con sidebar)
│   │   ├── organizations/
│   │   │   └── [orgId]/evaluations/[evalId]/
│   │   │       ├── evaluate/      # Workspace principal (page.tsx + workspace.tsx)
│   │   │       ├── report/        # Dashboard con gráficos
│   │   │       ├── gap-analysis/  # Análisis de brechas
│   │   │       └── process-map/   # Mapa arquitectura APQC
│   │   ├── admin/
│   │   │   ├── users/    # Gestión de usuarios (admin only)
│   │   │   └── pcf/      # Navegador de datos PCF
│   │   └── settings/     # Perfil + cambio de contraseña
│   └── api/
│       ├── auth/          # NextAuth + register
│       ├── admin/users/   # CRUD usuarios (admin only)
│       ├── organizations/ # CRUD orgs + members + evaluations
│       ├── evaluations/   # entries, stats, pdf
│       ├── evidence/      # upload/delete archivos (Vercel Blob)
│       ├── pcf/           # browse/search datos PCF + métricas
│       └── settings/      # actualizar perfil/password
├── components/
│   ├── ui/               # shadcn/ui (auto-generados)
│   ├── charts/           # radar, bars, donut, heatmap
│   ├── evidence-upload.tsx  # drag-and-drop upload
│   └── org-members.tsx      # gestión equipo
├── lib/                  # DB, auth, constants, utils, pdf-template
└── hooks/
data/                     # Excel APQC PCF
scripts/                  # migrate.ts, seed-pcf.ts
```

## Estado del proyecto

Todas las fases (0-5) están implementadas y desplegadas en producción.

### Rutas implementadas (31 total):
- 2 auth pages (login, register)
- 11 dashboard pages
- 18 API routes

## Base de datos

SQL raw con `@neondatabase/serverless`. No usamos ORM.

### Tablas principales:
- `pcf_elements` — Elementos APQC (niveles 1-5, ~1,922 filas). Campo clave: `hierarchy_id` (ej: "1.1.1")
- `pcf_metrics` — Métricas asociadas (~3,911 filas)
- `users` — Usuarios con roles (admin, consultant, viewer)
- `organizations` — Organizaciones/clientes evaluados
- `user_organizations` — Tabla pivote multi-tenancy
- `evaluations` — Evaluaciones con profundidad configurable (3-5 niveles)
- `evaluation_entries` — Resultado por proceso (madurez, notas, evidencia)
- `evidence_files` — Archivos subidos a Vercel Blob

### Escala de madurez:
```
no_evaluado (0) → inexistente (1) → parcial (2) → documentado (3) → implementado (4) → optimizado (5)
```

### Colores de madurez:
```typescript
const MATURITY_COLORS = {
  no_evaluado: '#E2E8F0',
  inexistente: '#FC8181',
  parcial:     '#F6AD55',
  documentado: '#F6E05E',
  implementado:'#68D391',
  optimizado:  '#4FD1C5',
};
```

## Patrones de código

### Queries a DB
```typescript
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL!);
const rows = await sql`SELECT * FROM users WHERE id = ${userId}`;
```

### Auth
Auth.js v5 con Credentials + JWT. Middleware protege rutas (dashboard). Admin routes requieren role='admin'. Acceso a orgs via `user_organizations`.

### Validación
Zod schemas + React Hook Form con @hookform/resolvers.

## Convenciones

- Idioma del código: inglés
- Idioma de la UI: español
- Idioma de datos APQC: español (pre-traducido)
- Passwords: bcryptjs
- Archivos: Vercel Blob (CDN incluido)
- Fechas: TIMESTAMPTZ
- IDs: SERIAL (auto-increment)

## Comandos útiles

```bash
npm run dev          # Dev server
npm run build        # Build producción
npm run lint         # ESLint
npx tsx scripts/seed-pcf.ts  # Cargar datos APQC
```

## Variables de entorno necesarias

- `DATABASE_URL` — Neon Postgres connection string
- `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` — URLs de Postgres
- `AUTH_SECRET` — Secret para Auth.js
- `AUTH_URL` — URL base de la app
- `BLOB_READ_WRITE_TOKEN` — Token de Vercel Blob

## Notas importantes

- El archivo Excel PCF está en `data/pcf-cross-industry-es.xlsx` (no commitear si >100MB)
- `hierarchy_id` es el identificador clave de procesos APQC (formato "1.1.1.1.1")
- El padre se deriva quitando el último segmento: "1.1.1" → padre "1.1"
- Las evaluaciones pueden tener profundidad 3, 4 o 5 niveles
- `included_categories` filtra qué categorías APQC (1-13) evaluar
- Auto-save en workspace con debounce 1.5s
