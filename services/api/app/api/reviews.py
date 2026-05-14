import json
import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session, SessionLocal
from app.services.review_store import ReviewStore
from app.services.document_store import DocumentStore
from app.services.llm_service import LLMService
from app.schemas.reviews import ReviewCreateRequest, ReviewResponse

router = APIRouter(prefix="/reviews", tags=["reviews"])
logger = logging.getLogger(__name__)


async def _run_analysis(review_id: str, document_id: str, tenant_id: str, review_type: str = "commercial") -> None:
    async with SessionLocal() as session:
        try:
            doc_store = DocumentStore(session)
            document = await doc_store.get_by_id(document_id, tenant_id)
            if not document:
                review_store = ReviewStore(session)
                await review_store.update_status(review_id, tenant_id, "failed")
                logger.error("Document %s not found for review %s", document_id, review_id)
                return

            llm = LLMService()
            result = await llm.analyze_contract(document.text_content or "", review_type)

            review_store = ReviewStore(session)
            await review_store.update_status(review_id, tenant_id, "completed", result)
        except Exception as exc:
            logger.exception("Analysis failed for review %s: %s", review_id, exc)
            try:
                review_store = ReviewStore(session)
                await review_store.update_status(review_id, tenant_id, "failed")
            except Exception:
                pass


@router.post("", response_model=ReviewResponse, status_code=201)
async def create_review(
    req: ReviewCreateRequest,
    background_tasks: BackgroundTasks,
    session: AsyncSession = Depends(get_async_session)
):
    store = ReviewStore(session)
    review = await store.create(req)
    background_tasks.add_task(_run_analysis, review.id, req.document_id, req.tenant_id, req.review_type)
    return review

@router.get("", response_model=list[ReviewResponse])
async def list_reviews(
    tenant_id: str,
    session: AsyncSession = Depends(get_async_session)
):
    store = ReviewStore(session)
    return await store.list_by_tenant(tenant_id)

@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: str,
    tenant_id: str,  # En producción vendría del token JWT
    session: AsyncSession = Depends(get_async_session)
):
    store = ReviewStore(session)
    review = await store.get_by_id(review_id, tenant_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review
