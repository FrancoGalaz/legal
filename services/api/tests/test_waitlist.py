import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_waitlist_register_success():
    """POST /waitlist with valid email returns 201 + id."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/waitlist", json={
            "name": "Test User",
            "email": "test@test.cl",
        })
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert "registro exitoso" in data["message"].lower()


@pytest.mark.asyncio
async def test_waitlist_duplicate():
    """POST /waitlist with existing email returns 201 but with duplicate message."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.post("/waitlist", json={
            "name": "Test", "email": "dupe@test.cl",
        })
        resp = await client.post("/waitlist", json={
            "name": "Test Dupe", "email": "dupe@test.cl",
        })
    assert resp.status_code == 201
    data = resp.json()
    assert "ya estás" in data["message"].lower()


@pytest.mark.asyncio
async def test_waitlist_no_name():
    """POST /waitlist without name should still work."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/waitlist", json={
            "email": "noname@test.cl",
        })
    assert resp.status_code == 201


@pytest.mark.asyncio
async def test_waitlist_invalid_email():
    """POST /waitlist with invalid email returns 400."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/waitlist", json={
            "email": "not-an-email",
        })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_waitlist_empty_email():
    """POST /waitlist with empty email returns 400 (custom validation)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/waitlist", json={
            "email": "",
        })
    assert resp.status_code == 400
