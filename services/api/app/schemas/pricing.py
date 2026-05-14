from typing import Optional
from pydantic import BaseModel, Field


class PricingPlanFeature(BaseModel):
    text: str
    included: bool = True


class PricingPlan(BaseModel):
    id: str
    name: str
    description: str
    price_monthly_clp: int  # price in Chilean Pesos
    price_monthly_usd: int
    reviews_limit: Optional[int] = None  # None = unlimited
    documents_limit: Optional[int] = None
    features: list[PricingPlanFeature] = []


PLANS: dict[str, PricingPlan] = {
    "free": PricingPlan(
        id="free",
        name="Gratuito",
        description="Para empezar a revisar contratos sin costo",
        price_monthly_clp=0,
        price_monthly_usd=0,
        reviews_limit=3,
        documents_limit=5,
        features=[
            PricingPlanFeature(text="Hasta 3 revisiones por mes"),
            PricingPlanFeature(text="Hasta 5 documentos almacenados"),
            PricingPlanFeature(text="Análisis básico de cláusulas"),
            PricingPlanFeature(text="Soporte por email"),
            PricingPlanFeature(text="Historial de revisiones", included=False),
            PricingPlanFeature(text="Reportes descargables", included=False),
            PricingPlanFeature(text="Soporte prioritario", included=False),
            PricingPlanFeature(text="API access", included=False),
        ],
    ),
    "pro": PricingPlan(
        id="pro",
        name="Pro",
        description="Para profesionales que necesitan análisis ilimitado",
        price_monthly_clp=19900,
        price_monthly_usd=20,
        reviews_limit=None,  # unlimited
        documents_limit=None,  # unlimited
        features=[
            PricingPlanFeature(text="Revisiones ilimitadas"),
            PricingPlanFeature(text="Documentos ilimitados"),
            PricingPlanFeature(text="Análisis avanzado de cláusulas"),
            PricingPlanFeature(text="Reportes descargables en PDF"),
            PricingPlanFeature(text="Historial completo"),
            PricingPlanFeature(text="Soporte prioritario 24/7"),
            PricingPlanFeature(text="API access"),
            PricingPlanFeature(text="Integración con Flow (próximamente)"),
        ],
    ),
}


class PlanInfoResponse(BaseModel):
    current_plan: str
    plan_label: str
    reviews_used: int = 0
    reviews_limit: Optional[int] = None
    reviews_remaining: Optional[int] = None
    documents_limit: Optional[int] = None
    monthly_price_clp: int = 0


class UpgradeRequest(BaseModel):
    plan: str = Field(..., description="Plan ID: 'pro' or 'free'")
