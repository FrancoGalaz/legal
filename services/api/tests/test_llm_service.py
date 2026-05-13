import json
import pytest
from unittest.mock import AsyncMock, Mock, patch

from app.services.llm_service import LLMService
from app.schemas.review_schemas import AnalysisResult, ClauseAnalysis


@pytest.fixture
def llm_service():
    service = LLMService()
    service.api_key = "test-key"
    return service


def _mock_response(data: dict, status_code: int = 200, raise_error: Exception | None = None):
    response = Mock()
    response.status_code = status_code
    response.json.return_value = data
    if raise_error:
        response.raise_for_status.side_effect = raise_error
    else:
        response.raise_for_status = lambda: None
    return response


@pytest.mark.asyncio
async def test_analyze_contract_success(llm_service):
    mock_data = {
        "choices": [
            {
                "message": {
                    "content": json.dumps({
                        "overall_risk": "alto",
                        "clauses": [
                            {
                                "ref": "cl-1",
                                "title": "Confidencialidad",
                                "text_excerpt": "El receptor se compromete a...",
                                "risk": "alto",
                                "finding": "Falta definir tiempo de vigencia",
                                "recommendation": "Agregar plazo de 2 años"
                            }
                        ],
                        "summary": "El contrato presenta riesgos significativos."
                    })
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = _mock_response(mock_data)

        result = await llm_service.analyze_contract("Texto de contrato de prueba")

    assert isinstance(result, AnalysisResult)
    assert result.overall_risk == "alto"
    assert len(result.clauses) == 1
    assert result.clauses[0].ref == "cl-1"
    assert result.summary == "El contrato presenta riesgos significativos."
    mock_post.assert_awaited_once()


@pytest.mark.asyncio
async def test_analyze_contract_with_markdown_json(llm_service):
    content = """```json
{"overall_risk": "bajo", "clauses": [], "summary": "Sin problemas"}
```"""
    mock_data = {
        "choices": [{"message": {"content": content}}]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = _mock_response(mock_data)

        result = await llm_service.analyze_contract("Contrato simple")

    assert result.overall_risk == "bajo"
    assert result.clauses == []
    assert result.summary == "Sin problemas"


@pytest.mark.asyncio
async def test_analyze_contract_missing_api_key():
    service = LLMService()
    service.api_key = ""
    with pytest.raises(ValueError, match="No API key configured"):
        await service.analyze_contract("text")


@pytest.mark.asyncio
async def test_analyze_contract_fallback_on_invalid_schema(llm_service):
    mock_data = {
        "choices": [
            {
                "message": {
                    "content": json.dumps({
                        "overall_risk": "medio",
                        "clauses": [
                            {
                                "ref": "c1",
                                "title": "Términos",
                                "risk": "medio",
                                # missing text_excerpt, finding, recommendation
                            }
                        ],
                        "summary": "Resumen de prueba"
                    })
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = _mock_response(mock_data)

        result = await llm_service.analyze_contract("Texto")

    assert result.overall_risk == "medio"
    assert len(result.clauses) == 1
    assert result.clauses[0].title == "Términos"
    assert result.clauses[0].text_excerpt == ""


@pytest.mark.asyncio
async def test_analyze_contract_http_error(llm_service):
    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = _mock_response(
            {}, status_code=500, raise_error=Exception("Server error")
        )

        with pytest.raises(Exception, match="Server error"):
            await llm_service.analyze_contract("Texto")
