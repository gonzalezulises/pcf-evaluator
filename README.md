# PCF Evaluator

Sistema de evaluación de procesos organizacionales basado en el framework APQC Process Classification Framework (PCF). Permite a consultores externos mapear los procesos reales de sus clientes contra el estándar APQC PCF (traducido al español), evaluar su madurez, identificar brechas y generar reportes visuales + PDF.

## Arquitectura del Sistema

```
┌─────────────┐     ┌──────────────────────────────────┐
│  Consultor  │────▶│  Next.js 16 App (Vercel)         │
│  (Browser)  │◀────│                                  │
└─────────────┘     │  ┌────────┐  ┌───────────────┐   │
                    │  │Auth.js │  │ API Routes    │   │
                    │  │  JWT   │  │ /api/*        │   │
                    │  └────────┘  └───────┬───────┘   │
                    │                      │           │
                    └──────────────────────┼───────────┘
                                           │
                    ┌──────────────────────┼───────────┐
                    │                      ▼           │
                    │  ┌──────────┐  ┌───────────┐    │
                    │  │  Neon    │  │  Vercel   │    │
                    │  │ Postgres │  │   Blob    │    │
                    │  └──────────┘  └───────────┘    │
                    │         Vercel Platform          │
                    └──────────────────────────────────┘
```

## Stack Tecnológico

| Componente | Tecnología | Versión |
|-----------|-----------|---------|
| Framework | Next.js + React + TypeScript | 16.1 / 19.2 / 5.x |
| Base de datos | Neon Postgres (via @neondatabase/serverless) | - |
| Auth | Auth.js v5 (Credentials + JWT) | 5.0 beta |
| UI | shadcn/ui + Tailwind CSS v4 | - |
| Gráficos | Recharts | 3.x |
| PDF | @react-pdf/renderer | 4.x |
| Archivos | Vercel Blob | 2.x |
| Validación | Zod + React Hook Form | 4.x / 7.x |
| Excel parsing | SheetJS (xlsx) | 0.18 |

## Modelo de Datos

```
pcf_elements ──────┐
  (1,922 filas)    │  1:N
                   ▼
pcf_metrics ───── (3,911 filas)

users ─────────── user_organizations ─── organizations
  │                                          │
  │                                          │ 1:N
  │                                          ▼
  │                                     evaluations
  │                                          │
  │                                          │ 1:N
  │                                          ▼
  └──────────────────────────────── evaluation_entries
                                          │
                                          │ 1:N
                                          ▼
                                    evidence_files
```

## Estructura del Proyecto

```
pcf-evaluator/
├── data/                          # Archivo Excel APQC PCF
│   └── pcf-cross-industry-es.xlsx
├── scripts/                       # Scripts de seeding y utilidades
│   └── seed-pcf.ts
├── src/
│   ├── app/
│   │   ├── (auth)/                # Layout auth (login, register)
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── (dashboard)/           # Layout dashboard con sidebar
│   │   │   ├── organizations/     # CRUD organizaciones
│   │   │   │   └── [orgId]/
│   │   │   │       └── evaluations/
│   │   │   │           └── [evalId]/
│   │   │   │               ├── evaluate/    # Workspace evaluación
│   │   │   │               ├── report/      # Dashboard reportes
│   │   │   │               ├── gap-analysis/ # Análisis brechas
│   │   │   │               └── process-map/  # Mapa procesos
│   │   │   ├── admin/             # Panel administración
│   │   │   └── settings/          # Configuración usuario
│   │   └── api/                   # API routes
│   │       ├── auth/
│   │       ├── organizations/
│   │       ├── evaluations/
│   │       ├── evidence/
│   │       └── pcf/
│   ├── components/
│   │   └── ui/                    # shadcn/ui components
│   ├── hooks/
│   └── lib/                       # Utilidades, DB, auth config
├── public/
└── package.json
```

## Requisitos Previos

- Node.js 20+
- npm
- Cuenta en [Vercel](https://vercel.com)
- Cuenta en [GitHub](https://github.com)
- Base de datos Neon Postgres (creada via Vercel Dashboard)

## Instalación y Setup

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/gonzalezulises/pcf-evaluator.git
   cd pcf-evaluator
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp .env.local.example .env.local
   # Editar .env.local con tus credenciales
   ```

4. **Crear base de datos**
   - Ir a [Vercel Dashboard](https://vercel.com/dashboard) > Storage > Create > Neon Postgres
   - Conectar al proyecto `pcf-evaluator`
   - Ejecutar `vercel env pull .env.local` para obtener las credenciales

5. **Ejecutar seeding de datos APQC**
   ```bash
   npx tsx scripts/seed-pcf.ts
   ```

6. **Iniciar servidor de desarrollo**
   ```bash
   npm run dev
   ```

   Abrir [http://localhost:3000](http://localhost:3000)

## Variables de Entorno

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | Connection string de Neon Postgres |
| `POSTGRES_URL` | URL pooled de Postgres |
| `POSTGRES_URL_NON_POOLING` | URL directa de Postgres |
| `POSTGRES_USER` | Usuario de Postgres |
| `POSTGRES_HOST` | Host de Postgres |
| `POSTGRES_PASSWORD` | Contraseña de Postgres |
| `POSTGRES_DATABASE` | Nombre de la base de datos |
| `AUTH_SECRET` | Secret para Auth.js (generar con `openssl rand -base64 32`) |
| `AUTH_URL` | URL base de la app (`http://localhost:3000` en dev) |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob para archivos |

## Seeding de Datos APQC PCF

El script `scripts/seed-pcf.ts` lee el archivo Excel `data/pcf-cross-industry-es.xlsx` y carga:
- **~1,922 elementos** en la tabla `pcf_elements` (categorías, grupos, procesos, actividades, tareas)
- **~3,911 métricas** en la tabla `pcf_metrics`

```bash
npx tsx scripts/seed-pcf.ts
```

## Desarrollo

```bash
npm run dev      # Servidor de desarrollo (Turbopack)
npm run build    # Build de producción
npm run lint     # Linter ESLint
npm run start    # Servidor de producción
```

## Deployment

El proyecto está configurado para deploy automático en Vercel:
- Push a `main` → deploy a producción
- Push a otras ramas → deploy de preview

## Fases del Proyecto

| Fase | Descripción | Estado |
|------|-------------|--------|
| 0 | Setup del proyecto | Completado |
| 1 | MVP: Auth, CRUD, Workspace evaluación | Pendiente |
| 2 | Reportes y visualización | Pendiente |
| 3 | Mapa de procesos y PDF | Pendiente |
| 4 | Evidencias y multi-usuario | Pendiente |
| 5 | Pulido y administración | Pendiente |

## Licencia

MIT
