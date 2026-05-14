from pydantic import BaseModel, Field
from datetime import datetime

class DocumentCreateRequest(BaseModel):
    tenant_id: str = Field(..., description="ID del tenant")
    filename: str
    content_type: str = "application/pdf"
    text_content: str = ""

class DocumentResponse(BaseModel):
    id: str
    tenant_id: str
    filename: str
    content_type: str
    text_content: str
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
