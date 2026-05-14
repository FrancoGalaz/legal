import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.db import get_async_session, SessionLocal
from app.models.user import User
from app.services.review_store import ReviewStore
from app.services.document_store import DocumentStore
from app.services.llm_service import LLMService
from app.schemas.reviews import ReviewCreateRequest, ReviewResponse, ReviewStats
from app.api.pricing import check_review_limit, increment_review_usage

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
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(get_current_user),
):
    # Enforce plan limits before creating review
    await check_review_limit(current_user)

    store = ReviewStore(session)
    review = await store.create(req)
    background_tasks.add_task(_run_analysis, review.id, req.document_id, req.tenant_id, req.review_type)

    # Increment usage counter
    await increment_review_usage(current_user, session)
    await session.commit()

    return review


@router.get("/stats", response_model=ReviewStats)
async def get_review_stats(
    tenant_id: str = Query(..., description="ID del tenant"),
    session: AsyncSession = Depends(get_async_session),
):
    store = ReviewStore(session)
    return await store.get_stats(tenant_id)


@router.get("", response_model=list[ReviewResponse])
async def list_reviews(
    tenant_id: str = Query(..., description="ID del tenant"),
    status: str | None = Query(None, description="Filtrar por estado: pending, completed, failed"),
    review_type: str | None = Query(None, description="Filtrar por tipo: commercial, laboral, corporate"),
    search: str | None = Query(None, description="Buscar por nombre de archivo"),
    limit: int = Query(50, ge=1, le=200, description="Máximo de resultados"),
    offset: int = Query(0, ge=0, description="Offset para paginación"),
    session: AsyncSession = Depends(get_async_session),
):
    store = ReviewStore(session)
    return await store.list_by_tenant(
        tenant_id,
        status=status,
        review_type=review_type,
        search=search,
        limit=limit,
        offset=offset,
    )


@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(
    review_id: str,
    tenant_id: str = Query(..., description="ID del tenant"),
    session: AsyncSession = Depends(get_async_session),
):
    store = ReviewStore(session)
    review = await store.get_by_id(review_id, tenant_id)
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    return review
