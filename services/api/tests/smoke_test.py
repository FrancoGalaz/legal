#!/usr/bin/env python3
"""
E2E Smoke Test — Legal Agent CL API

Standalone verification script for cron/deployment monitoring.
Tests every critical endpoint in sequence, exits with non-zero on failure.
No pytest dependency — runs standalone with `python smoke_test.py`.

Usage:
    cd services/api && source .venv/bin/activate && python tests/smoke_test.py

Exit codes:
    0 — all checks passed
    1 — one or more checks failed
"""
import os
import sys
import json
import traceback

# Ensure we can import the app
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
API_DIR = os.path.dirname(SCRIPT_DIR)
sys.path.insert(0, API_DIR)

# Set test DB before any imports
TEST_DB = os.path.join(API_DIR, "test_smoke.db")
if os.path.exists(TEST_DB):
    os.unlink(TEST_DB)
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB}"

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.db import init_db, SessionLocal
from app.core.auth import hash_password
from app.models.tenant import Tenant
from app.models.user import User

RESULTS: list[tuple[str, str]] = []  # (name, "PASS" | "FAIL: reason")


def check(description: str, condition: bool, detail: str = "") -> None:
    if condition:
        RESULTS.append((description, "PASS"))
        print(f"  ✓ {description}")
    else:
        msg = f"FAIL: {description}"
        if detail:
            msg += f" — {detail}"
        RESULTS.append((description, msg))
        print(f"  ✗ {msg}")


async def run():
    print("=" * 60)
    print("  Legal Agent CL — E2E Smoke Test")
    print("=" * 60)

    # ── 1. Setup test DB with seed data ──────────────────────────
    print("\n[1/9] Inicializando base de datos de prueba...")
    await init_db()
    async with SessionLocal() as session:
        tenant = Tenant(
            id="smoke-tenant-1", name="Smoke Test Firm", slug="smoke-test-firm"
        )
        session.add(tenant)
        user = User(
            id="smoke-user-1",
            email="smoke@test.cl",
            name="Smoke User",
            hashed_password=hash_password("smokepass123"),
            tenant_id="smoke-tenant-1",
            plan="free",
        )
        session.add(user)
        await session.commit()
    print("  ✓ Seed data creada")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # ── 2. Health endpoint ──────────────────────────────────────
        print("\n[2/9] Verificando health endpoint...")
        resp = await client.get("/health")
        check("Health returns 200", resp.status_code == 200)
        if resp.status_code == 200:
            data = resp.json()
            check("Health status is 'ok'", data.get("status") == "ok")
            check("Health version is set", bool(data.get("version")))

        # ── 3. Public endpoints (waitlist, pricing plans) ───────────
        print("\n[3/9] Verificando endpoints públicos...")
        resp = await client.post(
            "/waitlist",
            json={"name": "Smoke Tester", "email": "smoke-waitlist@test.cl"},
        )
        check("Waitlist POST returns 201", resp.status_code == 201, str(resp.json()))
        if resp.status_code == 201:
            data = resp.json()
            check("Waitlist response has id", "id" in data)
            check("Waitlist response has message", "message" in data)

        resp = await client.get("/pricing/plans")
        check("Pricing plans returns 200", resp.status_code == 200)
        if resp.status_code == 200:
            plans = resp.json()
            plan_ids = [p["id"] for p in plans]
            check("Pricing includes 'free' plan", "free" in plan_ids, str(plan_ids))
            check("Pricing includes 'pro' plan", "pro" in plan_ids, str(plan_ids))

        # ── 4. Register a new user ─────────────────────────────────
        print("\n[4/9] Probando registro de usuario...")
        resp = await client.post(
            "/auth/register",
            json={
                "email": "fresh-e2e@test.cl",
                "password": "e2epass123",
                "name": "E2E User",
            },
        )
        check("Register returns 201", resp.status_code == 201, str(resp.json()))
        if resp.status_code == 201:
            fresh_token = resp.json()["access_token"]
            check("Register returns access_token", bool(fresh_token))
        else:
            fresh_token = None

        resp = await client.post(
            "/auth/register",
            json={
                "email": "smoke@test.cl",  # duplicate
                "password": "e2epass123",
                "name": "Duplicate",
            },
        )
        check("Register duplicate email returns 409", resp.status_code == 409)

        # ── 5. Login ───────────────────────────────────────────────
        print("\n[5/9] Probando login...")
        resp = await client.post(
            "/auth/login",
            json={"email": "smoke@test.cl", "password": "smokepass123"},
        )
        check("Login valid returns 200", resp.status_code == 200)
        token = None
        if resp.status_code == 200:
            token = resp.json()["access_token"]
            check("Login returns access_token", bool(token))
        else:
            print("  ⚠  Cannot proceed — login failed")

        resp = await client.post(
            "/auth/login",
            json={"email": "smoke@test.cl", "password": "wrongpass"},
        )
        check("Login wrong password returns 401", resp.status_code == 401)

        resp = await client.post(
            "/auth/login",
            json={"email": "noone@nowhere.cl", "password": "anypass"},
        )
        check("Login nonexistent returns 401", resp.status_code == 401)

        # Bail out if we couldn't get a token
        if not token:
            print("\n  ❌ No se pudo obtener token — saltando pruebas auth-protegidas")
            return

        auth_h = {"Authorization": f"Bearer {token}"}

        # ── 6. GET /me ─────────────────────────────────────────────
        print("\n[6/9] Verificando /auth/me...")
        resp = await client.get("/auth/me", headers=auth_h)
        check("/me returns 200", resp.status_code == 200)
        if resp.status_code == 200:
            me = resp.json()
            check("/me has email", me.get("email") == "smoke@test.cl")
            check("/me has tenant_id", bool(me.get("tenant_id")))
            check("/me has tenant_name", bool(me.get("tenant_name")))
            check("/me has plan info", "plan" in me and "plan_limit" in me)
            check("/me has reviews_remaining", "reviews_remaining" in me)

        # Unauthenticated
        resp = await client.get("/auth/me")
        check("/me no auth returns 401", resp.status_code == 401)

        resp = await client.get(
            "/auth/me", headers={"Authorization": "Bearer invalid-token"}
        )
        check("/me invalid token returns 401", resp.status_code == 401)

        # ── 7. Pricing/my-plan (auth-protected) ────────────────────
        print("\n[7/9] Verificando pricing endpoints...")
        resp = await client.get("/pricing/my-plan", headers=auth_h)
        check("My-plan returns 200", resp.status_code == 200)
        if resp.status_code == 200:
            plan = resp.json()
            check("My-plan shows free plan", plan.get("current_plan") == "free")
            check("My-plan has reviews_limit", bool(plan.get("reviews_limit")))

        resp = await client.get("/pricing/my-plan")
        check("My-plan no auth returns 401", resp.status_code == 401)

        # ── 8. Documents (auth-protected) ──────────────────────────
        print("\n[8/9] Verificando document endpoints...")

        # Create document
        resp = await client.post(
            "/documents",
            json={
                "filename": "test_contract.txt",
                "content_type": "text/plain",
                "text_content": "Cláusula de confidencialidad estándar.",
                "tenant_id": "smoke-tenant-1",
            },
            headers=auth_h,
        )
        check("Create document returns 201", resp.status_code == 201, str(resp.status_code))
        doc_id = None
        if resp.status_code == 201:
            doc = resp.json()
            doc_id = doc.get("id")
            check("Document has id", bool(doc_id))
            check("Document has filename", doc.get("filename") == "test_contract.txt")

        # List documents
        resp = await client.get("/documents", headers=auth_h)
        check("List documents returns 200", resp.status_code == 200)
        if resp.status_code == 200:
            docs = resp.json()
            check("Documents list is array", isinstance(docs, list))
            check("Documents has at least 1 item", len(docs) >= 1)

        # Unauthorized access
        resp = await client.get("/documents")
        check("List documents no auth returns 401", resp.status_code == 401)
        resp = await client.post(
            "/documents",
            json={"filename": "leak.txt", "content_type": "text/plain", "text_content": ""},
        )
        check("Create document no auth returns 401", resp.status_code == 401)

        # ── 9. Reviews (auth-protected) ────────────────────────────
        print("\n[9/9] Verificando review endpoints...")
        if not doc_id:
            print("  ⚠  Saltando reviews — no hay document_id")
        else:
            resp = await client.post(
                "/reviews",
                json={
                    "document_id": doc_id,
                    "tenant_id": "smoke-tenant-1",
                    "review_type": "commercial",
                },
                headers=auth_h,
            )
            check("Create review returns 201", resp.status_code == 201, str(resp.status_code))
            review_id = None
            if resp.status_code == 201:
                review = resp.json()
                review_id = review.get("id")
                check("Review has id", bool(review_id))
                check("Review status is pending", review.get("status") == "pending")

            # List reviews
            resp = await client.get("/reviews", headers=auth_h)
            check("List reviews returns 200", resp.status_code == 200)
            if resp.status_code == 200:
                reviews = resp.json()
                check("Reviews list is array", isinstance(reviews, list))

            # Stats
            resp = await client.get("/reviews/stats", headers=auth_h)
            check("Reviews stats returns 200", resp.status_code == 200)
            if resp.status_code == 200:
                stats = resp.json()
                check("Stats has total_reviews", "total_reviews" in stats)
                check("Stats has risk_distribution", "risk_distribution" in stats)
                check("Stats has weekly_trend", "weekly_trend" in stats)

            # Unauthorized
            resp = await client.post(
                "/reviews",
                json={"document_id": doc_id, "tenant_id": "smoke-tenant-1", "review_type": "commercial"},
            )
            check("Create review no auth returns 401", resp.status_code == 401)

    # ── Summary ──────────────────────────────────────────────────
    print("\n" + "=" * 60)
    passed = sum(1 for _, r in RESULTS if r == "PASS")
    failed = [(desc, reason) for desc, reason in RESULTS if reason != "PASS"]
    total = len(RESULTS)
    print(f"  Resultado: {passed}/{total} pasaron, {len(failed)} fallaron")
    if failed:
        print("\n  Fallos:")
        for desc, reason in failed[:10]:
            print(f"    • {reason}")
    print("=" * 60)

    # Cleanup
    if os.path.exists(TEST_DB):
        os.unlink(TEST_DB)

    return len(failed) == 0


def main():
    import asyncio

    success = asyncio.run(run())
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
