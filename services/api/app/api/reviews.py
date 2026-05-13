from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_async_session
from app.services.review_store import ReviewStore
from app.schemas.reviews import ReviewCreateRequest, ReviewResponse

router = APIRouter(prefix="/reviews", tags=["reviews"])

@router.post("", response_model=ReviewResponse, status_code=201)
async def create_review(
    req: ReviewCreateRequest,
    session: AsyncSession = Depends(get_async_session)
):
    store = ReviewStore(session)
    return await store.create(req)

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
