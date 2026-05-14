from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

from app.schemas.review_schemas import AnalysisResult

class ReviewStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class ReviewCreateRequest(BaseModel):
    tenant_id: str = Field(..., description="ID del tenant")
    document_id: str
    review_type: str = "commercial"
    language: str = "es"

class ReviewResponse(BaseModel):
    id: str
    tenant_id: str
    document_id: str
    review_type: str
    language: str
    status: str
    result: Optional[AnalysisResult] = None
    created_at: datetime
    document_filename: Optional[str] = None

    model_config = {"from_attributes": True}


class ReviewStats(BaseModel):
    total_reviews: int = 0
    completed: int = 0
    pending: int = 0
    failed: int = 0
    total_documents: int = 0
    risk_distribution: dict[str, int] = {}
    type_distribution: dict[str, int] = {}
    weekly_trend: list[dict] = []


class ReviewFilterParams(BaseModel):
    tenant_id: str
    status: Optional[str] = None
    review_type: Optional[str] = None
    search: Optional[str] = None
    limit: int = 50
    offset: int = 0
