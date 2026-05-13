import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_create_review():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/reviews",
            json={
                "tenant_id": "tenant-test-1",
                "document_id": "doc-123",
                "review_type": "commercial",
                "language": "es"
            }
        )
    assert response.status_code == 201
    data = response.json()
    assert data["document_id"] == "doc-123"
    assert data["status"] == "pending"

@pytest.mark.asyncio
async def test_get_review():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/reviews/test-id?tenant_id=tenant-test-1")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_get_review_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/reviews/nonexistent?tenant_id=tenant-test-1")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_list_reviews():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/reviews?tenant_id=tenant-test-1")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
