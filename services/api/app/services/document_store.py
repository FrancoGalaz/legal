import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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

    async def get_by_id(self, document_id: str, tenant_id: str) -> DocumentResponse | None:
        stmt = select(Document).where(
            Document.id == document_id,
            Document.tenant_id == tenant_id
        )
        result = await self.session.execute(stmt)
        doc = result.scalar_one_or_none()
        if doc:
            return DocumentResponse.model_validate(doc)
        return None

    async def list_by_tenant(self, tenant_id: str) -> list[DocumentResponse]:
        stmt = (
            select(Document)
            .where(Document.tenant_id == tenant_id)
            .order_by(Document.created_at.desc())
        )
        result = await self.session.execute(stmt)
        docs = result.scalars().all()
        return [DocumentResponse.model_validate(d) for d in docs]
