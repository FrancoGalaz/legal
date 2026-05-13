# Architecture — Legal Agent CL

## Stack summary

| Layer         | Technology                      | Rationale                                 |
| ------------- | ------------------------------- | ----------------------------------------- |
| Frontend      | Next.js 14+ (App Router)        | SSR, file-based routing, React ecosystem  |
| Backend       | FastAPI (Python 3.11+)          | Async, OpenAPI auto-docs, AI/ML friendly  |
| Database      | PostgreSQL 16                   | Relational, mature, hosted (Supabase TBD) |
| Cache / queue | Redis 7                         | Session cache, background job queue       |
| AI / LLM      | OpenAI-compatible provider      | Contract review via LLM chain             |
| Shared types  | TypeScript (packages/shared-types) | Single source of truth for API contracts |
| Prompts       | Markdown templates              | LLM system prompts, version-controlled    |
| Infra (dev)   | Docker Compose                  | PostgreSQL + Redis for local development  |

## Data flow (MVP)

```
User uploads .pdf/.docx
    │
    ▼
Next.js (app/web) ──POST /api/v1/reviews──▶ FastAPI (services/api)
    │                                              │
    │                                              ▼
    │                                    ┌─ PDF/DOCX parsing ─┐
    │                                    │  LLM prompt assembly│
    │                                    │  (Chile template)   │
    │                                    └──────┬─────────────┘
    │                                           ▼
    │                                    Background task (Redis queue)
    │                                           │
    │                                           ▼
    │                                    Store results in PostgreSQL
    │                                           │
    ◀─────────── GET /api/v1/reviews/:id ───────┘
    │
    ▼
Render review results + risk matrix
```

## Key design decisions

1. **Monorepo** — Single repo with npm workspaces keeps the codebase tight
   during MVP. Can split later if needed.
2. **App Router** — Next.js 14 App Router chosen for RSC, streaming, and
   future-proofing.
3. **No ORM yet** — SQLAlchemy 2.0 is listed but models are not yet defined;
   will be added when the DB schema is finalised.
4. **Chile-first** — Prompts and legal references are scoped to Chilean law
   from day one. No attempt to be jurisdiction-agnostic.
5. **No Word add-in** — Out of scope for the initial scaffold.

## Directory map

```
legal-agent-cl/
├── apps/web/                # Next.js frontend
├── services/api/            # FastAPI backend
│   ├── app/
│   │   ├── api/             # Route handlers
│   │   ├── core/            # Config, deps, security
│   │   ├── models/          # SQLAlchemy models
│   │   └── schemas/         # Pydantic schemas
│   └── pyproject.toml
├── packages/shared-types/   # Shared TS types
├── prompts/                 # LLM system prompt templates
│   └── commercial-legal/
├── infra/                   # Docker Compose & infra config
└── docs/                    # Internal documentation
```
