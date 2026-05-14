import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.db import SessionLocal
from app.services.document_store import DocumentStore
from app.services.review_store import ReviewStore
from app.schemas.documents import DocumentCreateRequest
from app.schemas.reviews import ReviewCreateRequest
from app.schemas.review_schemas import AnalysisResult, ClauseAnalysis


async def get_auth_token(client: AsyncClient) -> str:
    """Helper: login test user and return a token."""
    resp = await client.post(
        "/auth/login",
        json={"email": "test@legalagent.cl", "password": "testpass123"},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_review_triggers_background_task():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        headers = auth_headers(token)

        # Create a document first
        doc_resp = await client.post(
            "/documents",
            json={
                "tenant_id": "tenant-test-1",
                "filename": "contrato.pdf",
                "content_type": "application/pdf",
                "text_content": "Este es un contrato de prueba para análisis.",
            },
            headers=headers,
        )
        assert doc_resp.status_code == 201
        document_id = doc_resp.json()["id"]

        with patch("app.api.reviews._run_analysis") as mock_run:
            review_resp = await client.post(
                "/reviews",
                json={
                    "tenant_id": "tenant-test-1",
                    "document_id": document_id,
                    "review_type": "commercial",
                    "language": "es",
                },
                headers=headers,
            )

    assert review_resp.status_code == 201
    data = review_resp.json()
    assert data["document_id"] == document_id
    assert data["status"] == "pending"
    assert data["result"] is None
    mock_run.assert_called_once()


@pytest.mark.asyncio
async def test_get_review_after_analysis():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        headers = auth_headers(token)

        # Create a document
        doc_resp = await client.post(
            "/documents",
            json={
                "tenant_id": "tenant-test-1",
                "filename": "contrato.pdf",
                "content_type": "application/pdf",
                "text_content": "Texto del contrato",
            },
            headers=headers,
        )
        document_id = doc_resp.json()["id"]

        # Create a review
        review_resp = await client.post(
            "/reviews",
            json={
                "tenant_id": "tenant-test-1",
                "document_id": document_id,
                "review_type": "commercial",
                "language": "es",
            },
            headers=headers,
        )
        review_id = review_resp.json()["id"]

        # Manually update the review to completed with a result
        result = AnalysisResult(
            overall_risk="bajo",
            clauses=[
                ClauseAnalysis(
                    ref="c1",
                    title="Cláusula 1",
                    text_excerpt="Extracto",
                    risk="bajo",
                    finding="Sin hallazgos",
                    recommendation="Ninguna",
                )
            ],
            summary="Todo en orden",
        )
        async with SessionLocal() as session:
            store = ReviewStore(session)
            await store.update_status(review_id, "tenant-test-1", "completed", result)

        # Get the review
        get_resp = await client.get(
            f"/reviews/{review_id}",
            headers=headers,
        )

    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == review_id
    assert data["status"] == "completed"
    assert data["result"] is not None
    assert data["result"]["overall_risk"] == "bajo"
    assert len(data["result"]["clauses"]) == 1
    assert data["result"]["summary"] == "Todo en orden"


@pytest.mark.asyncio
async def test_run_analysis_directly():
    # Create document and review in DB
    async with SessionLocal() as session:
        doc_store = DocumentStore(session)
        doc = await doc_store.create(DocumentCreateRequest(
            tenant_id="tenant-test-1",
            filename="test.pdf",
            content_type="application/pdf",
            text_content="Contrato de arrendamiento simple",
        ))

        review_store = ReviewStore(session)
        review = await review_store.create(ReviewCreateRequest(
            tenant_id="tenant-test-1",
            document_id=doc.id,
            review_type="commercial",
            language="es",
        ))

    mock_result = AnalysisResult(
        overall_risk="medio",
        clauses=[],
        summary="Resumen directo",
    )

    with patch("app.services.llm_service.LLMService.analyze_contract", new_callable=AsyncMock) as mock_analyze:
        mock_analyze.return_value = mock_result
        from app.api.reviews import _run_analysis
        await _run_analysis(review.id, doc.id, "tenant-test-1")

    async with SessionLocal() as session:
        store = ReviewStore(session)
        updated = await store.get_by_id(review.id, "tenant-test-1")

    assert updated is not None
    assert updated.status == "completed"
    assert updated.result is not None
    assert updated.result.overall_risk == "medio"
    assert updated.result.summary == "Resumen directo"


@pytest.mark.asyncio
async def test_run_analysis_document_not_found():
    from app.api.reviews import _run_analysis

    async with SessionLocal() as session:
        review_store = ReviewStore(session)
        review = await review_store.create(ReviewCreateRequest(
            tenant_id="tenant-test-1",
            document_id="nonexistent-doc",
            review_type="commercial",
            language="es",
        ))

    await _run_analysis(review.id, "nonexistent-doc", "tenant-test-1")

    async with SessionLocal() as session:
        store = ReviewStore(session)
        updated = await store.get_by_id(review.id, "tenant-test-1")

    assert updated is not None
    assert updated.status == "failed"
    assert updated.result is None


@pytest.mark.asyncio
async def test_get_document_by_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        headers = auth_headers(token)

        doc_resp = await client.post(
            "/documents",
            json={
                "tenant_id": "tenant-test-1",
                "filename": "test.pdf",
                "content_type": "application/pdf",
                "text_content": "Contenido",
            },
            headers=headers,
        )
        document_id = doc_resp.json()["id"]

        get_resp = await client.get(f"/documents/{document_id}?tenant_id=tenant-test-1", headers=headers)

    assert get_resp.status_code == 200
    data = get_resp.json()
    assert data["id"] == document_id
    assert data["filename"] == "test.pdf"
    assert data["tenant_id"] == "tenant-test-1"


@pytest.mark.asyncio
async def test_get_document_not_found():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        token = await get_auth_token(client)
        headers = auth_headers(token)
        get_resp = await client.get("/documents/nonexistent?tenant_id=tenant-test-1", headers=headers)

    assert get_resp.status_code == 404
    assert get_resp.json()["detail"] == "Document not found"
