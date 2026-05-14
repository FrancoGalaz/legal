# AGENTS — Legal Agent CL

## What This Is
SaaS legal chileno: revisión de contratos con IA. Next.js 14 (App Router) + FastAPI + PostgreSQL.
GitHub: https://github.com/FrancoGalaz/legal.git (público)
GitHub Pages: https://francogalaz.github.io/legal (NEXT_OUTPUT=export, base path /legal)

## Rules
- **Autónomo**: avanzar sin preguntar. Solo pausar ante blockers reales (credenciales, APIs caídas, acciones destructivas).
- **Commits atómicos**: un cambio lógico por commit. Push inmediato después de cada commit.
- **Español**: código en inglés, commits y docs en español.
- **No romper el build**: `pnpm build` y `pytest` deben pasar antes de commitear.
- **Design system**: usar tokens de DESIGN.md, no hex literals.

## Current State (2026-05-14)
- **Fase 1 COMPLETA**: Landing page premium con responsive, waitlist form, CI/CD deploy-pages.yml funcional.
- **GitHub Pages LIVE**: https://francogalaz.github.io/legal/ — HTTP 200, incluye waitlist.
- **Fase 2 (App Funcional) COMPLETA**: dashboard, contracts, history, review/new, review/[id] pages.
- **Fase 3 (AI Core) parcial**: LLMService con OpenRouter, prompts de derecho chileno, análisis background.
- **Auth implementada (JWT)**: login/registro en frontend + backend con JWT, User model en DB, proteccion de rutas cliente-side.
- **Backend FastAPI**: endpoints /auth/register, /auth/login, /auth/me, /documents, /reviews, /documents/upload, /health con SQLAlchemy async.
- **API URL**: todas las paginas usan `NEXT_PUBLIC_API_URL` en vez de URLs hardcodeadas.

## Roadmap (orden de prioridad)

### Fase 2 — App Funcional (CONTINUAR)
4. ✅ Crear páginas de la app: login, dashboard, upload de documentos, resultados de revisión
5. ✅ Conectar frontend con API backend (llamar /documents, /reviews desde el frontend)
6. ✅ **Implementar autenticación (JWT con login/registro)** — login/registro con email y password, JWT tokens en backend, proteccion de rutas en frontend
7. ✅ Subida de archivos PDF/DOCX con drag-and-drop y progress bar

### Fase 3 — AI Core
8. ✅ Integrar LLM real para revisión de contratos (OpenRouter)
9. ✅ Templates de prompts específicos por tipo de contrato (comercial, laboral, corporativo)
10. ❌ Dashboard con historial de revisiones y métricas avanzadas (parcialmente hecho)

### Fase 4 — Monetización
11. ❌ Pricing tiers (freemium + pro)
12. ❌ Pasarela de pago (Flow o MercadoPago Chile)
13. ❌ Onboarding multi-tenant para estudios jurídicos

### Fase 1 — Landing + Deploy (COMPLETADA)
1. ✅ Push del build estático a GitHub Pages (funcionando con deploy-pages.yml)
2. ✅ Landing page con diseño responsive y contenido real (usando DESIGN.md tokens)
3. ✅ Formulario de waitlist/contacto

## Environment
- Node >= 18, pnpm 10+
- Python 3.11+ con venv en services/api/.venv
- PostgreSQL 16 + Redis 7 vía Docker Compose
- Variables en .env (ver .env.example)

## Key Commands
```bash
# Frontend
cd /home/pcagente/Documentos/Legal/legal-agent-cl
pnpm install
pnpm build:web        # build estático a apps/web/out
cd apps/web && /home/pcagente/.npm-global/bin/pnpm build  # workaround si npm está roto

# Backend
cd services/api
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Tests
cd services/api && source .venv/bin/activate && pytest -x

# Infra
docker compose -f infra/docker-compose.yml up -d
```

## Design System
Ver DESIGN.md en raíz. Tokens principales:
- Primary: #111827, Tertiary (acento): #2563EB
- Font: Inter, Mono: JetBrains Mono
- Radius: sm 6px, md 10px, lg 16px

## Pitfalls
- `.env` está protegido por Hermes — usar sed/shell para editarlo, no patch tool.
- GitHub Pages requiere `pnpm-workspace.yaml` en raíz (YA EXISTE).
- Token fine-grained de GitHub necesita permiso Actions: Read and write.
- `apps/web/pnpm-lock.yaml` está untracked — no debe commitearse (está en .gitignore implícito, verificar).
- NEXT_OUTPUT=export requiere que todas las rutas sean static-friendly (no APIs, no middleware dinámico).
- npm/npx del sistema está roto (Node 24) — usar `pnpm` directamente o `/home/pcagente/.npm-global/bin/pnpm`.
- `apps/web/src/app/app/review/new/page.tsx` ya usa `NEXT_PUBLIC_API_URL` (revisar que las demas paginas tambien)
- LLM necesita `OPENROUTER_API_KEY` en `.env` para funcionar.
