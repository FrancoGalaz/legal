"""Tests for the tenant (multi-tenant law firm) API.

Covers:
- POST /tenants/onboard — full firm + admin creation
- GET /tenants/me — current tenant info
- GET /tenants/members — list tenant members
- POST /tenants/members — add member (owner only)
- Error cases: duplicate slug, duplicate email, non-owner add member
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.db import SessionLocal
from app.models.tenant import Tenant
from app.models.user import User
from sqlalchemy import select


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
async def test_onboard_tenant_success():
    """POST /tenants/onboard creates tenant + admin user, returns JWT."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/tenants/onboard", json={
            "firm_name": "Estudio Jurídico Test",
            "slug": "estudio-test-1",
            "firm_description": "Un estudio de prueba",
            "admin_name": "Admin Test",
            "admin_email": "admin@estudiotest.cl",
            "admin_password": "secure123",
        })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

    # Verify tenant and user exist in DB
    async with SessionLocal() as session:
        tenant = await session.scalar(
            select(Tenant).where(Tenant.slug == "estudio-test-1")
        )
        assert tenant is not None
        assert tenant.name == "Estudio Jurídico Test"
        assert tenant.member_count == 1

        user = await session.scalar(
            select(User).where(User.email == "admin@estudiotest.cl")
        )
        assert user is not None
        assert user.tenant_id == tenant.id
        assert tenant.owner_id == user.id


@pytest.mark.asyncio
async def test_onboard_duplicate_slug():
    """POST /tenants/onboard with existing slug returns 409."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # First onboard
        await client.post("/tenants/onboard", json={
            "firm_name": "Primer Estudio",
            "slug": "duplicate-slug",
            "admin_name": "Admin 1",
            "admin_email": "admin1@test.cl",
            "admin_password": "secure123",
        })

        # Second onboard with same slug
        resp = await client.post("/tenants/onboard", json={
            "firm_name": "Segundo Estudio",
            "slug": "duplicate-slug",  # same slug
            "admin_name": "Admin 2",
            "admin_email": "admin2@test.cl",
            "admin_password": "secure123",
        })
    assert resp.status_code == 409
    assert "slug" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_onboard_duplicate_email():
    """POST /tenants/onboard with existing email returns 409."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/tenants/onboard", json={
            "firm_name": "Estudio Duplicado",
            "slug": "estudio-dup-email",
            "admin_name": "Admin Dup",
            "admin_email": "test@legalagent.cl",  # already seeded
            "admin_password": "secure123",
        })
    assert resp.status_code == 409
    assert "existe" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_onboard_then_get_my_tenant():
    """After onboarding, GET /tenants/me returns the tenant info."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Onboard
        onboard = await client.post("/tenants/onboard", json={
            "firm_name": "Mi Estudio",
            "slug": "mi-estudio-me",
            "admin_name": "Yo Mismo",
            "admin_email": "yo@miestudio.cl",
            "admin_password": "secure123",
        })
        token = onboard.json()["access_token"]

        # Get my tenant
        resp = await client.get(
            "/tenants/me",
            headers=auth_headers(token),
        )
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Mi Estudio"
    assert data["slug"] == "mi-estudio-me"
    assert data["member_count"] >= 1
    assert "id" in data


@pytest.mark.asyncio
async def test_get_my_tenant_unauthenticated():
    """GET /tenants/me without token returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/tenants/me")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_members():
    """GET /tenants/members returns at least the admin user."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Onboard a new firm
        onboard = await client.post("/tenants/onboard", json={
            "firm_name": "Estudio con Miembros",
            "slug": "estudio-miembros",
            "admin_name": "Admin Firm",
            "admin_email": "admin@firmacl",
            "admin_password": "secure123",
        })
        token = onboard.json()["access_token"]

        # List members
        resp = await client.get(
            "/tenants/members",
            headers=auth_headers(token),
        )
    assert resp.status_code == 200
    members = resp.json()
    assert isinstance(members, list)
    assert len(members) >= 1
    assert any(m["email"] == "admin@firmacl" for m in members)
    # The admin should be marked as owner
    admin = next(m for m in members if m["email"] == "admin@firmacl")
    assert admin["is_owner"] is True


@pytest.mark.asyncio
async def test_add_member_as_owner():
    """POST /tenants/members by owner adds a member successfully."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Onboard a firm
        onboard = await client.post("/tenants/onboard", json={
            "firm_name": "Estudio Owner",
            "slug": "estudio-owner",
            "admin_name": "Owner",
            "admin_email": "owner@test.cl",
            "admin_password": "secure123",
        })
        token = onboard.json()["access_token"]

        # Add member
        resp = await client.post(
            "/tenants/members",
            json={"email": "member@test.cl", "name": "Member User"},
            headers=auth_headers(token),
        )
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "member@test.cl"
    assert data["name"] == "Member User"
    assert data["is_owner"] is False
    assert data["is_active"] is True

    # Verify member count increased
    async with SessionLocal() as session:
        tenant = await session.scalar(
            select(Tenant).where(Tenant.slug == "estudio-owner")
        )
        assert tenant is not None
        assert tenant.member_count >= 2


@pytest.mark.asyncio
async def test_add_member_duplicate_email():
    """POST /tenants/members with existing email returns 409."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Use seeded user as owner (tenant-test-1 owner is test-user-1)
        # But test-user-1 is NOT the owner of tenant-test-1 (no owner_id set in seed)
        # So let's onboard a fresh firm instead
        onboard = await client.post("/tenants/onboard", json={
            "firm_name": "Add Dup Test",
            "slug": "add-dup-test",
            "admin_name": "Admin Add",
            "admin_email": "admin@addtest.cl",
            "admin_password": "secure123",
        })
        token = onboard.json()["access_token"]

        # Add member once
        await client.post(
            "/tenants/members",
            json={"email": "dup@test.cl", "name": "First"},
            headers=auth_headers(token),
        )

        # Add member with same email
        resp = await client.post(
            "/tenants/members",
            json={"email": "dup@test.cl", "name": "Second"},
            headers=auth_headers(token),
        )
    assert resp.status_code == 409
    assert "existe" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_add_member_as_non_owner():
    """POST /tenants/members by non-owner returns 403."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Use the seeded test user which is NOT the tenant owner
        token = await get_auth_token(client)

        resp = await client.post(
            "/tenants/members",
            json={"email": "newmember@test.cl", "name": "New Member"},
            headers=auth_headers(token),
        )
    assert resp.status_code == 403
    assert "administrador" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_list_members_after_adding():
    """After adding members, GET /tenants/members includes them."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Onboard
        onboard = await client.post("/tenants/onboard", json={
            "firm_name": "Team Firm",
            "slug": "team-firm",
            "admin_name": "Team Admin",
            "admin_email": "admin@team.cl",
            "admin_password": "secure123",
        })
        token = onboard.json()["access_token"]

        # Add two members
        await client.post(
            "/tenants/members",
            json={"email": "alice@team.cl", "name": "Alice"},
            headers=auth_headers(token),
        )
        await client.post(
            "/tenants/members",
            json={"email": "bob@team.cl", "name": "Bob"},
            headers=auth_headers(token),
        )

        # List
        resp = await client.get(
            "/tenants/members",
            headers=auth_headers(token),
        )
    assert resp.status_code == 200
    members = resp.json()
    assert len(members) == 3  # admin + alice + bob
    emails = {m["email"] for m in members}
    assert "admin@team.cl" in emails
    assert "alice@team.cl" in emails
    assert "bob@team.cl" in emails


@pytest.mark.asyncio
async def test_onboard_invalid_slug_format():
    """POST /tenants/onboard with invalid slug returns 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/tenants/onboard", json={
            "firm_name": "Bad Slug",
            "slug": "INVALID SLUG!!!",  # spaces and special chars
            "admin_name": "Admin",
            "admin_email": "admin@bad.cl",
            "admin_password": "secure123",
        })
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_onboard_short_password():
    """POST /tenants/onboard with short password returns 422."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/tenants/onboard", json={
            "firm_name": "Short Pwd",
            "slug": "short-pwd",
            "admin_name": "Admin",
            "admin_email": "admin@short.cl",
            "admin_password": "12345",  # less than 6 chars
        })
    assert resp.status_code == 422
