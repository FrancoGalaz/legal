import json
import logging
from typing import Any

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.review_schemas import AnalysisResult, ClauseAnalysis

logger = logging.getLogger(__name__)

CHILEAN_LEGAL_PROMPT = """Eres un abogado experto en derecho chileno especializado en revisión de contratos.

Tu tarea es analizar el siguiente contrato desde la perspectiva del sistema legal chileno, considerando especialmente:
- Código Civil de Chile
- Ley 19.496 sobre Protección de los Derechos de los Consumidores
- Ley 19.628 sobre Protección de la Vida Privada (protección de datos personales)

Instrucciones:
1. Identifica las cláusulas más importantes del contrato
2. Evalúa el riesgo legal de cada cláusula (bajo, medio, alto)
3. Detecta posibles abusos, omisiones o términos desleales
4. Proporciona recomendaciones específicas para cada cláusula problemática
5. Asigna un riesgo general al contrato (bajo, medio, alto)
6. Escribe un resumen ejecutivo conciso

Debes responder EXCLUSIVAMENTE con un objeto JSON válido que tenga esta estructura exacta:
{
  "overall_risk": "bajo|medio|alto",
  "clauses": [
    {
      "ref": "identificador de la cláusula",
      "title": "título de la cláusula",
      "text_excerpt": "extracto relevante del texto",
      "risk": "bajo|medio|alto",
      "finding": "hallazgo detallado",
      "recommendation": "recomendación específica"
    }
  ],
  "summary": "resumen ejecutivo del análisis"
}

No incluyas texto adicional fuera del JSON. Asegúrate de que el JSON sea válido.
"""


class LLMService:
    def __init__(self) -> None:
        self.api_key = settings.OPENAI_API_KEY or settings.OPENROUTER_API_KEY
        self.base_url = settings.OPENAI_BASE_URL.rstrip("/")
        self.model = settings.LLM_MODEL
        self.client = httpx.AsyncClient(timeout=120.0)

    async def analyze_contract(self, text: str) -> AnalysisResult:
        if not self.api_key:
            raise ValueError("No API key configured — set OPENAI_API_KEY or OPENROUTER_API_KEY")

        messages = [
            {"role": "system", "content": CHILEAN_LEGAL_PROMPT},
            {"role": "user", "content": f"Analiza el siguiente contrato:\n\n{text}"},
        ]

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 4000,
        }

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        response = await self.client.post(
            f"{self.base_url}/chat/completions",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

        content = self._extract_content(data)
        return self._parse_analysis(content)

    def _extract_content(self, data: dict[str, Any]) -> str:
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise ValueError(f"Unexpected LLM response structure: {exc}") from exc

    def _parse_analysis(self, content: str) -> AnalysisResult:
        # Try to extract JSON from markdown code blocks
        cleaned = content.strip()
        if cleaned.startswith("```"):
            # Remove opening fence and optional language tag
            lines = cleaned.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()

        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            # Fallback: try to find the first JSON object in the text
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start != -1 and end != -1 and end > start:
                try:
                    parsed = json.loads(cleaned[start : end + 1])
                except json.JSONDecodeError:
                    raise ValueError(f"LLM response is not valid JSON: {exc}") from exc
            else:
                raise ValueError(f"LLM response is not valid JSON: {exc}") from exc

        # Validate with Pydantic
        try:
            return AnalysisResult.model_validate(parsed)
        except ValidationError as exc:
            logger.warning("Pydantic validation failed for LLM response: %s", exc)
            # Fallback: construct a minimal valid result
            return self._fallback_result(parsed)

    def _fallback_result(self, parsed: Any) -> AnalysisResult:
        overall_risk = "medio"
        clauses: list[ClauseAnalysis] = []
        summary = "No se pudo generar un análisis estructurado completo."

        if isinstance(parsed, dict):
            overall_risk = self._safe_get(parsed, "overall_risk", "medio")
            summary = self._safe_get(parsed, "summary", summary)
            raw_clauses = parsed.get("clauses", [])
            if isinstance(raw_clauses, list):
                for rc in raw_clauses:
                    if isinstance(rc, dict):
                        clauses.append(
                            ClauseAnalysis(
                                ref=self._safe_get(rc, "ref", "N/A"),
                                title=self._safe_get(rc, "title", "Sin título"),
                                text_excerpt=self._safe_get(rc, "text_excerpt", ""),
                                risk=self._safe_get(rc, "risk", "medio"),
                                finding=self._safe_get(rc, "finding", ""),
                                recommendation=self._safe_get(rc, "recommendation", ""),
                            )
                        )

        return AnalysisResult(
            overall_risk=overall_risk,
            clauses=clauses,
            summary=summary,
        )

    @staticmethod
    def _safe_get(d: dict[str, Any], key: str, default: str) -> str:
        val = d.get(key)
        if isinstance(val, str):
            return val
        return default if val is None else str(val)
