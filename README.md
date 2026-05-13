# legal-agent-cl

Chilean legal AI SaaS MVP — contract review agent for the Chilean legal market.

## Structure

```
legal-agent-cl/
├── apps/
│   └── web/               # Next.js 14+ App Router frontend
├── services/
│   └── api/               # FastAPI backend
├── packages/
│   └── shared-types/      # Shared TypeScript types (placeholder)
├── prompts/
│   └── commercial-legal/  # LLM prompt templates (Chile-focused)
├── infra/
│   └── docker-compose.yml # PostgreSQL + Redis
└── docs/
    └── ARCHITECTURE.md    # Architecture overview
```

## Available endpoints

- `GET /health` → liveliness check
- `POST /documents` → ingesta de documento en texto para revisión
- `POST /reviews` → crea una revisión pendiente para un documento existente
- `GET /reviews/{review_id}` → recupera una revisión creada

### Example payloads

#### POST /documents
```json
{
  "filename": "contrato-servicios.docx",
  "content_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text_content": "Cláusula 1. Servicios profesionales.",
  "tenant_id": "tenant-demo"
}
```

#### POST /reviews
```json
{
  "document_id": "doc_xxxxx",
  "review_type": "full",
  "language": "es-CL"
}
```

## Quick start

```bash
# Start infrastructure (requires Docker installed on host)
docker compose -f infra/docker-compose.yml up -d

# Start API
cd services/api
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000

# Start web
cd ../../
npm install
npm run dev:web
```

## Environment

Copy `.env.example` to `.env` and fill in the required values.
