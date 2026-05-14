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

@pytest.mark.asyncio
async def test_create_document():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.post(
            "/documents",
            json={
                "tenant_id": "tenant-test-1",
                "filename": "contrato.pdf",
                "content_type": "application/pdf",
                "text_content": "Contenido del contrato de ejemplo"
            },
            headers=headers,
        )
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "contrato.pdf"
    assert data["tenant_id"] == "tenant-test-1"
    assert "id" in data
    assert data["status"] == "ingested"

@pytest.mark.asyncio
async def test_list_documents():
    """GET /documents returns list of documents for authenticated user's tenant."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        headers = {"Authorization": f"Bearer {token}"}

        # Create a doc first
        await client.post(
            "/documents",
            json={
                "tenant_id": "tenant-test-1",
                "filename": "list_test.pdf",
                "content_type": "application/pdf",
                "text_content": "Test content for list",
            },
            headers=headers,
        )

        # List documents
        response = await client.get("/documents", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    filenames = [d["filename"] for d in data]
    assert "list_test.pdf" in filenames
