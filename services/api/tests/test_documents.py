import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_create_document():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/documents",
            json={
                "tenant_id": "tenant-test-1",
                "filename": "contrato.pdf",
                "content_type": "application/pdf",
                "text_content": "Contenido del contrato de ejemplo"
            }
        )
    assert response.status_code == 201
    data = response.json()
    assert data["filename"] == "contrato.pdf"
    assert data["tenant_id"] == "tenant-test-1"
    assert "id" in data
    assert data["status"] == "ingested"
