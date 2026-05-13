from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.services.document_store import DocumentStore
from app.schemas.documents import DocumentCreateRequest, DocumentResponse

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("", response_model=DocumentResponse, status_code=201)
async def create_document(
    req: DocumentCreateRequest,
    session: AsyncSession = Depends(get_async_session)
):
    store = DocumentStore(session)
    return await store.create(req)

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    tenant_id: str,
    session: AsyncSession = Depends(get_async_session)
):
    store = DocumentStore(session)
    doc = await store.get_by_id(document_id, tenant_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
