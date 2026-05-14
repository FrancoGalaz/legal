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

## Current State (2026-05-13)
- API: FastAPI funcional con endpoints /documents, /reviews, /health. SQLAlchemy models listos.
- Frontend: Next.js 14 con landing page estática (preview.html, stitch-landing-v2.html).
- Build: `/apps/web/out/` generado, listo para deploy.
- CI/CD: GitHub Actions deploy-pages.yml configurado pero necesita token con permiso Actions: Read and write.
- Despliegue pendiente: el build estático existe pero no se ha deployado a GitHub Pages.

## Roadmap (orden de prioridad)

### Fase 1 — Landing + Deploy (AHORA)
1. Hacer push del build estático a GitHub Pages (verificar token y workflow)
2. Mejorar landing page con diseño responsive y contenido real (usar DESIGN.md tokens)
3. Agregar formulario de waitlist/contacto

### Fase 2 — App Funcional
4. Crear páginas de la app: login, dashboard, upload de documentos, resultados de revisión
5. Conectar frontend con API backend (llamar /documents, /reviews desde el frontend)
6. Implementar autenticación (Clerk o NextAuth con proveedor OAuth)
7. Subida de archivos PDF/DOCX con progress bar

### Fase 3 — AI Core
8. Integrar LLM real para revisión de contratos (OpenRouter)
9. Templates de prompts para derecho chileno (comercial, laboral, corporativo)
10. Dashboard con historial de revisiones y métricas

### Fase 4 — Monetización
11. Pricing tiers (freemium + pro)
12. Pasarela de pago (Flow o MercadoPago Chile)
13. Onboarding multi-tenant para estudios jurídicos

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
pnpm dev:web          # desarrollo en :3000
pnpm build:web        # build estático a apps/web/out

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
