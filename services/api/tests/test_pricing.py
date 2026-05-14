"""Tests for pricing endpoints: plans list, my-plan, upgrade."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


async def get_auth_token(client: AsyncClient) -> str:
    resp = await client.post(
        "/auth/login",
        json={"email": "test@legalagent.cl", "password": "testpass123"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_plans():
    """GET /pricing/plans returns available plans."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/pricing/plans")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) >= 2
    plan_ids = [p["id"] for p in data]
    assert "free" in plan_ids
    assert "pro" in plan_ids

    # Check free plan details
    free_plan = next(p for p in data if p["id"] == "free")
    assert free_plan["price_monthly_clp"] == 0


@pytest.mark.asyncio
async def test_my_plan_authenticated():
    """GET /pricing/my-plan returns user's plan info."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        resp = await client.get("/pricing/my-plan", headers=auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["current_plan"] == "free"
    assert data["plan_label"] == "Gratuito"
    assert data["reviews_limit"] == 3
    assert data["reviews_remaining"] is not None


@pytest.mark.asyncio
async def test_my_plan_unauthenticated():
    """GET /pricing/my-plan without auth returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/pricing/my-plan")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_upgrade_to_pro():
    """POST /pricing/upgrade to Pro works."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)

        # Upgrade to pro
        resp = await client.post(
            "/pricing/upgrade",
            json={"plan": "pro"},
            headers=auth_headers(token),
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["current_plan"] == "pro"
    assert data["reviews_limit"] is None  # unlimited
    assert data["reviews_remaining"] is None  # unlimited


@pytest.mark.asyncio
async def test_upgrade_to_invalid_plan():
    """POST /pricing/upgrade with invalid plan returns 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        resp = await client.post(
            "/pricing/upgrade",
            json={"plan": "platinum"},
            headers=auth_headers(token),
        )
    assert resp.status_code == 400
    assert "no válido" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_upgrade_downgrade_to_free():
    """POST /pricing/upgrade to free (downgrade) works."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)

        # First upgrade to pro
        await client.post(
            "/pricing/upgrade",
            json={"plan": "pro"},
            headers=auth_headers(token),
        )

        # Then downgrade to free
        resp = await client.post(
            "/pricing/upgrade",
            json={"plan": "free"},
            headers=auth_headers(token),
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["current_plan"] == "free"
    assert data["reviews_limit"] == 3
