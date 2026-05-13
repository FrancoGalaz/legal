from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.services.document_store import DocumentStore
from app.services.pdf_extractor import extract_text_from_file
from app.schemas.documents import DocumentCreateRequest, DocumentResponse

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("", response_model=DocumentResponse, status_code=201)
async def create_document(
    req: DocumentCreateRequest,
    session: AsyncSession = Depends(get_async_session)
):
    store = DocumentStore(session)
    return await store.create(req)

@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    tenant_id: str = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session)
):
    import asyncio
    file_content = await file.read()
    from io import BytesIO
    bio = BytesIO(file_content)
    text_content = await asyncio.to_thread(extract_text_from_file, bio, file.filename or "document.txt")
    store = DocumentStore(session)
    doc = await store.create(DocumentCreateRequest(
        tenant_id=tenant_id,
        filename=file.filename or "document",
        content_type=file.content_type or "application/octet-stream",
        text_content=text_content,
    ))
    return doc

@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    tenant_id: str,
    session: AsyncSession = Depends(get_async_session)
):
    store = DocumentStore(session)
    return await store.list_by_tenant(tenant_id)

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
