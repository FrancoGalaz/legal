# Legal Agent CL

SaaS legal chileno: revisión de contratos con IA. Next.js 14 (App Router) + FastAPI + PostgreSQL.

🌐 **Live:** https://francogalaz.github.io/legal/
📦 **Repo:** https://github.com/FrancoGalaz/legal.git

## Stack

| Capa        | Tecnología                              |
| ----------- | --------------------------------------- |
| Frontend    | Next.js 14 App Router, static export    |
| Backend     | FastAPI + SQLAlchemy async (PostgreSQL) |
| Auth        | JWT (python-jose + passlib/bcrypt)      |
| AI          | OpenRouter API (DeepSeek V4, etc.)      |
| Testing     | pytest + pytest-asyncio + httpx         |
| Pagos       | Flow.cl (Webpay)                        |
| Dev infra   | Docker Compose (PostgreSQL + Redis)     |

## Features

- **Revisión de contratos con IA** — analiza contratos comerciales, laborales y corporativos con prompts especializados en derecho chileno
- **Autenticación JWT** — registro/login con email, tokens seguros, proteccion de rutas
- **Aislamiento multi-tenant** — cada usuario/estudio obtiene datos aislados
- **Dashboard** — métricas de revisiones, distribución de riesgo, tendencias semanales
- **Historial** — filtros por estado, tipo de revisión, búsqueda por nombre de archivo
- **Subida de archivos** — PDF, DOCX y TXT con extracción de texto (drag & drop)
- **Planes (freemium)** — Free (3 revisiones/mes) y Pro (ilimitado)
- **Pasarela de pago Flow.cl** — checkout vía Webpay, webhook de confirmación
- **Onboarding para estudios** — registro de firmas legales con equipo multi-usuario
- **Landing page** — diseño premium responsive, waitlist, FAQ, SEO

## Estructura del proyecto

```
legal-agent-cl/
├── apps/web/                # Next.js 14 App Router frontend
├── services/api/            # FastAPI backend
│   ├── app/
│   │   ├── api/             # Routers (auth, documents, reviews, pricing, tenants)
│   │   ├── core/            # Config, DB, JWT auth
│   │   ├── models/          # SQLAlchemy models (User, Tenant, Document, Review)
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # Business logic (LLM, Flow, extraction)
│   └── tests/               # 93 tests automatizados
├── prompts/                 # LLM prompt templates (derecho chileno)
├── infra/                   # Docker Compose (PostgreSQL + Redis)
└── docs/                    # Architecture docs
```

## API endpoints

| Método | Ruta                               | Auth     | Descripción                        |
| ------ | ---------------------------------- | -------- | ---------------------------------- |
| GET    | `/health`                          | No       | Health check                       |
| POST   | `/waitlist`                        | No       | Registrar email en waitlist        |
| POST   | `/auth/register`                   | No       | Crear cuenta (auto-tenant)         |
| POST   | `/auth/login`                      | No       | Iniciar sesión → JWT               |
| GET    | `/auth/me`                         | JWT      | Perfil del usuario + tenant        |
| POST   | `/documents`                       | JWT      | Crear documento                    |
| POST   | `/documents/upload`                | JWT      | Subir archivo (PDF/DOCX/TXT)       |
| GET    | `/documents`                       | JWT      | Listar documentos                  |
| GET    | `/documents/{id}`                  | JWT      | Detalle de documento               |
| POST   | `/reviews`                         | JWT      | Crear revisión (con análisis IA)   |
| GET    | `/reviews`                         | JWT      | Listar revisiones (con filtros)    |
| GET    | `/reviews/stats`                   | JWT      | Estadísticas del dashboard         |
| GET    | `/reviews/{id}`                    | JWT      | Detalle de revisión                |
| GET    | `/pricing/plans`                   | No       | Listar planes disponibles          |
| GET    | `/pricing/my-plan`                 | JWT      | Plan actual del usuario            |
| POST   | `/pricing/upgrade`                 | JWT      | Cambiar de plan                    |
| POST   | `/pricing/create-checkout`         | JWT      | Crear checkout Flow.cl             |
| POST   | `/pricing/flow-webhook`            | No       | Webhook de confirmación Flow.cl    |
| POST   | `/tenants/onboard`                 | No       | Onboarding para estudios jurídicos |
| GET    | `/tenants/me`                      | JWT      | Info del tenant actual             |
| GET    | `/tenants/members`                 | JWT      | Miembros del equipo                |
| POST   | `/tenants/members`                 | JWT      | Invitar miembro (solo admin)       |

## Quick start

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/FrancoGalaz/legal.git
cd legal

# 2. Infraestructura (PostgreSQL + Redis)
docker compose -f infra/docker-compose.yml up -d

# 3. Backend
cd services/api
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # editar con tus claves
uvicorn app.main:app --reload --port 8000

# 4. Frontend (otra terminal)
cd apps/web
pnpm install            # usa pnpm, no npm
pnpm dev:web            # Next.js dev server
```

## Testing

```bash
cd services/api && source .venv/bin/activate && pytest -x
```

93 tests: auth, pricing, documents, reviews, LLM service, tenants, waitlist, PDF extraction, Flow.cl.

## Configuración

Copia `.env.example` a `.env` y completa las variables requeridas:

| Variable                  | Requerido | Descripción                              |
| ------------------------- | --------- | ---------------------------------------- |
| `DATABASE_URL`            | Sí        | PostgreSQL connection string             |
| `JWT_SECRET_KEY`          | Sí        | Clave secreta para tokens JWT (64 chars) |
| `OPENROUTER_API_KEY`      | Sí        | API key de OpenRouter para el LLM        |
| `NEXT_PUBLIC_API_URL`     | Sí        | URL base de la API para el frontend      |
| `FLOW_API_KEY`            | No        | API key de Flow.cl (producción)          |
| `FLOW_SECRET_KEY`         | No        | Secret key de Flow.cl (producción)       |

## Despliegue

El frontend se despliega como **static export** en GitHub Pages mediante el workflow `deploy-pages.yml` en cada push a `main`.

Estado actual: **MVP completo** — auth, dashboard, subida de contratos, revisión IA, historial, pricing, Flow.cl, multi-tenant.
