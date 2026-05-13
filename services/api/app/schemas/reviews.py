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

    model_config = {"from_attributes": True}
