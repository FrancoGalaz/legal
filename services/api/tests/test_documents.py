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
