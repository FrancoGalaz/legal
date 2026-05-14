"""Tests for auth endpoints: register, login, /me."""
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


async def get_auth_token(client: AsyncClient) -> str:
    """Helper: login as seeded test user."""
    resp = await client.post(
        "/auth/login",
        json={"email": "test@legalagent.cl", "password": "testpass123"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_register_success():
    """Register a new user returns 201 + token."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/auth/register",
            json={
                "email": "newuser@test.cl",
                "password": "secure123",
                "name": "New User",
                "tenant_id": "tenant-test-1",
            },
        )
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_register_duplicate_email():
    """Register with existing email returns 409."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/auth/register",
            json={
                "email": "test@legalagent.cl",  # already seeded
                "password": "secure123",
                "name": "Duplicate",
            },
        )
    assert resp.status_code == 409
    assert "Ya existe" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_success():
    """Login with valid credentials returns 200 + token."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/auth/login",
            json={"email": "test@legalagent.cl", "password": "testpass123"},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password():
    """Login with wrong password returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/auth/login",
            json={"email": "test@legalagent.cl", "password": "wrongpass"},
        )
    assert resp.status_code == 401
    assert "inválidas" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_login_nonexistent_user():
    """Login with unregistered email returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/auth/login",
            json={"email": "noone@nowhere.cl", "password": "pass123"},
        )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated():
    """GET /auth/me with valid token returns user profile with plan info."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        resp = await client.get("/auth/me", headers=auth_headers(token))
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@legalagent.cl"
    assert data["name"] == "Test User"
    assert data["plan"] == "free"
    assert "plan_label" in data
    assert "plan_limit" in data
    assert "reviews_remaining" in data
    assert data["id"] is not None


@pytest.mark.asyncio
async def test_me_unauthenticated():
    """GET /auth/me without token returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/auth/me")
    assert resp.status_code == 401
    assert "requerida" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_me_invalid_token():
    """GET /auth/me with invalid token returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/auth/me", headers={"Authorization": "Bearer invalid-token"}
        )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_register_then_me():
    """Register a user, then verify /me returns correct data."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register
        register_resp = await client.post(
            "/auth/register",
            json={
                "email": "fresh-test@legalagent.cl",
                "password": "mypassword",
                "name": "Fresh Test",
                "tenant_id": "tenant-test-1",
            },
        )
        assert register_resp.status_code == 201
        token = register_resp.json()["access_token"]

        # Verify /me
        me_resp = await client.get(
            "/auth/me", headers={"Authorization": f"Bearer {token}"}
        )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "fresh-test@legalagent.cl"
    assert me_resp.json()["name"] == "Fresh Test"
