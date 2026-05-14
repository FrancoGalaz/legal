from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.core.auth import get_current_user
from app.models.user import User
from app.services.document_store import DocumentStore
from app.services.pdf_extractor import extract_text_from_file
from app.schemas.documents import DocumentCreateRequest, DocumentResponse

router = APIRouter(prefix="/documents", tags=["documents"])

@router.post("", response_model=DocumentResponse, status_code=201)
async def create_document(
    req: DocumentCreateRequest,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    store = DocumentStore(session)
    # Ensure tenant_id matches the authenticated user
    req.tenant_id = current_user.tenant_id
    return await store.create(req)

@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    import asyncio
    file_content = await file.read()
    from io import BytesIO
    bio = BytesIO(file_content)
    text_content = await asyncio.to_thread(extract_text_from_file, bio, file.filename or "document.txt")
    store = DocumentStore(session)
    doc = await store.create(DocumentCreateRequest(
        tenant_id=current_user.tenant_id,
        filename=file.filename or "document",
        content_type=file.content_type or "application/octet-stream",
        text_content=text_content,
    ))
    return doc

@router.get("", response_model=list[DocumentResponse])
async def list_documents(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    store = DocumentStore(session)
    return await store.list_by_tenant(current_user.tenant_id)

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    store = DocumentStore(session)
    doc = await store.get_by_id(document_id, current_user.tenant_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
