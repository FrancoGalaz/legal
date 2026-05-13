import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.document import Document
from app.schemas.documents import DocumentCreateRequest, DocumentResponse

class DocumentStore:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, req: DocumentCreateRequest) -> DocumentResponse:
        doc = Document(
            id=str(uuid.uuid4())[:32],
            tenant_id=req.tenant_id,
            filename=req.filename,
            content_type=req.content_type,
            text_content=req.text_content,
            status="ingested"
        )
        self.session.add(doc)
        await self.session.commit()
        await self.session.refresh(doc)
        return DocumentResponse.model_validate(doc)
