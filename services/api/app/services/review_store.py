import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.review import Review
from app.schemas.reviews import ReviewCreateRequest, ReviewResponse

class ReviewStore:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, req: ReviewCreateRequest) -> ReviewResponse:
        review = Review(
            id=str(uuid.uuid4())[:32],
            tenant_id=req.tenant_id,
            document_id=req.document_id,
            review_type=req.review_type,
            language=req.language,
            status="pending"
        )
        self.session.add(review)
        await self.session.commit()
        await self.session.refresh(review)
        return ReviewResponse.model_validate(review)

    async def get_by_id(self, review_id: str, tenant_id: str) -> ReviewResponse | None:
        stmt = select(Review).where(
            Review.id == review_id,
            Review.tenant_id == tenant_id
        )
        result = await self.session.execute(stmt)
        review = result.scalar_one_or_none()
        if review:
            return ReviewResponse.model_validate(review)
        return None
