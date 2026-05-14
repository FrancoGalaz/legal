import json
import logging
from typing import Any

import httpx
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.review_schemas import AnalysisResult, ClauseAnalysis

logger = logging.getLogger(__name__)

BASE_INSTRUCTION = """Eres un abogado experto en derecho chileno especializado en revisión de contratos.

Tu tarea es analizar el siguiente contrato desde la perspectiva del sistema legal chileno, considerando especialmente:
- Código Civil de Chile
- Ley 19.496 sobre Protección de los Derechos de los Consumidores
- Ley 19.628 sobre Protección de la Vida Privada (protección de datos personales)

Instrucciones generales:
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

PROMPT_TEMPLATES = {
    "commercial": BASE_INSTRUCTION + """

ESPECIALIZACIÓN: CONTRATO COMERCIAL

Este es un contrato de naturaleza comercial. Al analizarlo, presta especial atención a:

1. **Obligaciones de las partes**: Verifica que exista equilibrio prestacional. Detecta cláusulas que impongan obligaciones excesivas o desproporcionadas para una sola parte.
2. **Precio y forma de pago**: Revisa condiciones de pago, reajustes, intereses moratorios (máximo permitido por ley), multas y garantías.
3. **Plazos de entrega y ejecución**: Evalúa si los plazos son razonables y si existen cláusulas de penalización por atraso.
4. **Garantías**: Analiza boletas de garantía, retenciones, seguros exigidos y su proporcionalidad.
5. **Terminación anticipada**: Revisa causales de término, preaviso, indemnizaciones y efectos de la terminación.
6. **Confidencialidad y propiedad intelectual**: Verifica cláusulas de confidencialidad, cesión de derechos y propiedad de resultados.
7. **Competencia desleal**: Detecta cláusulas restrictivas que puedan ser abusivas o contrarias a la libre competencia.
8. **Legislación aplicable**: Para contratos comerciales internacionales, verifica la ley aplicable y jurisdicción.
9. **Cláusulas abusivas**: Identifica cualquier estipulación que pueda considerarse abusiva según la Ley 19.496 (especialmente en contratos de adhesión).

Enfócate en los riesgos comerciales y económicos del contrato desde la perspectiva chilena.
""",

    "laboral": BASE_INSTRUCTION + """

ESPECIALIZACIÓN: CONTRATO LABORAL

Este es un contrato de naturaleza laboral (relación empleador-trabajador). Al analizarlo, presta especial atención a:

1. **Jornada de trabajo**: Verifica que las horas de trabajo cumplan con el límite legal (45 horas semanales según Ley 21.561). Revisa horas extras, descansos y turnos.
2. **Remuneración**: Revisa que el sueldo base, gratificaciones, bonos y otros beneficios cumplan con el Ingreso Mínimo Mensual y las normas del Código del Trabajo.
3. **Indemnizaciones**: Analiza cláusulas de indemnización por años de servicio, aviso previo (30 días), y causales de despido.
4. **Ferias y permisos**: Verifica feriado legal (15 días hábiles), permisos especiales (nacimiento, fallecimiento, etc.) y días administrativos.
5. **Cláusulas restrictivas**: Examina con especial cuidado pactos de no competencia post-terminación (solo válidos si hay un beneficio económico real para el trabajador), confidencialidad y exclusividad.
6. **Subcontratación**: Si aplica, revisa las obligaciones de la empresa principal respecto a subcontratistas (Ley 20.123).
7. **Seguridad y salud laboral**: Verifica referencias a la Ley 16.744 (accidentes del trabajo y enfermedades profesionales).
8. **Acoso y discriminación**: Revisa cláusulas sobre protocolos de acoso sexual, laboral y no discriminación (Ley 21.643, Ley Karin).
9. **Beneficios adicionales**: Seguros de salud complementarios, planes de previsión, vales de alimentación, etc.

Enfócate en la protección del trabajador y el cumplimiento del Código del Trabajo chileno. Señala cualquier cláusula que pueda vulnerar derechos laborales irrenunciables.
""",

    "corporate": BASE_INSTRUCTION + """

ESPECIALIZACIÓN: CONTRATO SOCIETARIO (CORPORATIVO)

Este es un contrato de naturaleza societaria o corporativa (acuerdos entre accionistas, socios, juntas directivas, fusiones, etc.). Al analizarlo, presta especial atención a:

1. **Estructura de gobierno corporativo**: Revisa la composición del directorio, quórums de votación, derechos de veto y mayorías calificadas.
2. **Derechos de los accionistas/socios**: Analiza derechos a dividendos, preferencia de suscripción, información, retiro y liquidación.
3. **Transferencia de acciones/participaciones**: Verifica cláusulas de derecho preferente, arrastre (drag-along), acompañamiento (tag-along), y valorización de las participaciones.
4. **Aportes y capital**: Revisa las obligaciones de capitalización, aportes adicionales, y consecuencias del incumplimiento.
5. **Disolución y liquidación**: Causales de disolución, procedimiento de liquidación y distribución del remanente.
6. **Resolución de conflictos**: Arbitraje, mediación o tribunales ordinarios. Verifica la competencia y la ley aplicable.
7. **Cláusulas de no competencia**: Especialmente relevantes en acuerdos entre socios fundadores y en joint ventures.
8. **Protección de minorías**: Identifica mecanismos de protección para accionistas minoritarios (derecho a información, designación de directores, etc.).
9. **Cumplimiento normativo**: Referencias a la Ley 18.046 (Sociedades Anónimas), Ley 20.382 (Gobierno Corporativo), CMF, y normas antilavado de dinero.
10. **Responsabilidad de directores**: Analiza cláusulas de exención de responsabilidad, seguros D&O, y estándares de diligencia.

Enfócate en la estructura de control, protección de derechos de los accionistas y cumplimiento de la normativa societaria chilena.
""",
}


class LLMService:
    def __init__(self) -> None:
        self.api_key = settings.OPENAI_API_KEY or settings.OPENROUTER_API_KEY
        self.base_url = settings.OPENAI_BASE_URL.rstrip("/")
        self.model = settings.LLM_MODEL
        self.client = httpx.AsyncClient(timeout=120.0)

    def get_prompt(self, review_type: str = "commercial") -> str:
        """Return the appropriate prompt template for the given contract type."""
        prompt = PROMPT_TEMPLATES.get(review_type)
        if not prompt:
            logger.warning("Unknown review_type '%s', falling back to commercial", review_type)
            prompt = PROMPT_TEMPLATES["commercial"]
        return prompt

    async def analyze_contract(self, text: str, review_type: str = "commercial") -> AnalysisResult:
        if not self.api_key:
            raise ValueError("No API key configured — set OPENAI_API_KEY or OPENROUTER_API_KEY")

        system_prompt = self.get_prompt(review_type)

        messages = [
            {"role": "system", "content": system_prompt},
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
