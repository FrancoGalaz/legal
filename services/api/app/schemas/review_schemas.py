from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class ClauseAnalysis(BaseModel):
    ref: str = Field(..., description="Reference identifier for the clause")
    title: str = Field(..., description="Title or name of the clause")
    text_excerpt: str = Field(..., description="Relevant excerpt from the contract text")
    risk: str = Field(..., description="Risk level: bajo, medio, or alto")
    finding: str = Field(..., description="Detailed finding about the clause")
    recommendation: str = Field(..., description="Recommended action or modification")


class AnalysisResult(BaseModel):
    overall_risk: str = Field(..., description="Overall contract risk: bajo, medio, or alto")
    clauses: list[ClauseAnalysis] = Field(default_factory=list, description="List of analyzed clauses")
    summary: str = Field(..., description="Executive summary of the contract review")


class DocumentUploadResponse(BaseModel):
    id: str
    filename: str
    status: str
    message: str


class ReviewResponse(BaseModel):
    id: str
    document_id: str
    status: str
    result: Optional[AnalysisResult] = None
    created_at: datetime
