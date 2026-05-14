import json
import pytest
from unittest.mock import AsyncMock, Mock, patch

from app.services.llm_service import LLMService, PROMPT_TEMPLATES
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


class TestPromptTemplates:
    def test_all_templates_exist(self):
        """Deben existir templates para commercial, laboral y corporate."""
        assert "commercial" in PROMPT_TEMPLATES
        assert "laboral" in PROMPT_TEMPLATES
        assert "corporate" in PROMPT_TEMPLATES

    def test_commercial_template_has_keywords(self):
        """El template comercial debe mencionar comercio."""
        prompt = PROMPT_TEMPLATES["commercial"]
        assert "comercial" in prompt.lower()

    def test_laboral_template_has_keywords(self):
        """El template laboral debe mencionar trabajo/remuneración."""
        prompt = PROMPT_TEMPLATES["laboral"]
        assert "laboral" in prompt.lower() or "trabajo" in prompt.lower()

    def test_corporate_template_has_keywords(self):
        """El template corporativo debe mencionar accionistas/socios."""
        prompt = PROMPT_TEMPLATES["corporate"]
        assert "accionistas" in prompt.lower() or "socios" in prompt.lower()

    def test_get_prompt_known_types(self, llm_service):
        """get_prompt debe retornar el template correcto para tipos conocidos."""
        for t in ("commercial", "laboral", "corporate"):
            prompt = llm_service.get_prompt(t)
            assert prompt == PROMPT_TEMPLATES[t]

    def test_get_prompt_unknown_falls_back(self, llm_service):
        """get_prompt debe hacer fallback a commercial para tipos desconocidos."""
        prompt = llm_service.get_prompt("inventado")
        assert prompt == PROMPT_TEMPLATES["commercial"]

    def test_get_prompt_default(self, llm_service):
        """get_prompt sin argumento debe retornar commercial."""
        assert llm_service.get_prompt() == PROMPT_TEMPLATES["commercial"]


class TestAnalyzeContract:
    @pytest.mark.asyncio
    async def test_success(self, llm_service):
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
    async def test_with_review_type(self, llm_service):
        """analyze_contract debe pasar el review_type para seleccionar template."""
        mock_data = {
            "choices": [
                {
                    "message": {
                        "content": json.dumps({
                            "overall_risk": "bajo",
                            "clauses": [],
                            "summary": "Contrato laboral estándar."
                        })
                    }
                }
            ]
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = _mock_response(mock_data)

            result = await llm_service.analyze_contract("Contrato de trabajo", review_type="laboral")

        assert result.overall_risk == "bajo"
        assert result.summary == "Contrato laboral estándar."

        # Verify the request included the laboral prompt
        call_kwargs = mock_post.call_args[1]
        sent_messages = call_kwargs["json"]["messages"]
        system_msg = sent_messages[0]["content"]
        assert "laboral" in system_msg.lower() or "trabajo" in system_msg.lower()

    @pytest.mark.asyncio
    async def test_with_markdown_json(self, llm_service):
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
    async def test_missing_api_key(self):
        service = LLMService()
        service.api_key = ""
        with pytest.raises(ValueError, match="No API key configured"):
            await service.analyze_contract("text")

    @pytest.mark.asyncio
    async def test_fallback_on_invalid_schema(self, llm_service):
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
    async def test_http_error(self, llm_service):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = _mock_response(
                {}, status_code=500, raise_error=Exception("Server error")
            )

            with pytest.raises(Exception, match="Server error"):
                await llm_service.analyze_contract("Texto")
