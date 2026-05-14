import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


async def get_auth_token(client: AsyncClient) -> str:
    """Helper: register/login test user and return a token."""
    resp = await client.post(
        "/auth/login",
        json={"email": "test@legalagent.cl", "password": "testpass123"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_review():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        response = await client.post(
            "/reviews",
            json={
                "tenant_id": "tenant-test-1",
                "document_id": "doc-123",
                "review_type": "commercial",
                "language": "es",
            },
            headers=auth_headers(token),
        )
    assert response.status_code == 201
    data = response.json()
    assert data["document_id"] == "doc-123"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_get_review():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        response = await client.get(
            "/reviews/test-id",
            headers=auth_headers(token),
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_review_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        response = await client.get(
            "/reviews/nonexistent",
            headers=auth_headers(token),
        )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_reviews():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        response = await client.get(
            "/reviews",
            headers=auth_headers(token),
        )
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_review_stats():
    """GET /reviews/stats returns aggregate statistics for a tenant."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)

        # Create a document first
        doc_resp = await client.post(
            "/documents",
            json={
                "tenant_id": "tenant-test-1",
                "filename": "stats_test.pdf",
                "content_type": "application/pdf",
                "text_content": "Test content for stats",
            },
            headers=auth_headers(token),
        )
        doc_id = doc_resp.json()["id"]

        # Create a review
        await client.post(
            "/reviews",
            json={
                "tenant_id": "tenant-test-1",
                "document_id": doc_id,
                "review_type": "commercial",
                "language": "es",
            },
            headers=auth_headers(token),
        )

        # Get stats
        stats_resp = await client.get(
            "/reviews/stats",
            headers=auth_headers(token),
        )
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert "total_reviews" in stats
    assert "pending" in stats
    assert "risk_distribution" in stats
    assert "type_distribution" in stats
    assert "weekly_trend" in stats
    assert stats["total_reviews"] >= 1
