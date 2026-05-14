import json
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.review import Review
from app.models.document import Document
from app.schemas.reviews import ReviewCreateRequest, ReviewResponse, ReviewStats
from app.schemas.review_schemas import AnalysisResult


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

    async def _attach_filename(self, review: Review, response: ReviewResponse) -> ReviewResponse:
        """Attach document filename to a review response."""
        doc = review.document
        if doc:
            response.document_filename = doc.filename
        else:
            response.document_filename = "Documento desconocido"
        return response

    async def get_by_id(self, review_id: str, tenant_id: str) -> ReviewResponse | None:
        stmt = (
            select(Review)
            .options(selectinload(Review.document))
            .where(Review.id == review_id, Review.tenant_id == tenant_id)
        )
        result = await self.session.execute(stmt)
        review = result.scalar_one_or_none()
        if review:
            resp = ReviewResponse.model_validate(review)
            return await self._attach_filename(review, resp)
        return None

    async def list_by_tenant(
        self,
        tenant_id: str,
        status: str | None = None,
        review_type: str | None = None,
        search: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[ReviewResponse]:
        stmt = (
            select(Review)
            .options(selectinload(Review.document))
            .where(Review.tenant_id == tenant_id)
        )

        if status:
            stmt = stmt.where(Review.status == status)
        if review_type:
            stmt = stmt.where(Review.review_type == review_type)
        if search:
            # Search in document filename via join
            stmt = stmt.join(Document, Review.document_id == Document.id).where(
                Document.filename.ilike(f"%{search}%")
            )

        stmt = stmt.order_by(Review.created_at.desc()).offset(offset).limit(limit)

        result = await self.session.execute(stmt)
        reviews = result.scalars().all()
        responses = [ReviewResponse.model_validate(r) for r in reviews]

        # Attach filenames
        for i, review in enumerate(reviews):
            doc = review.document
            if doc:
                responses[i].document_filename = doc.filename
            else:
                responses[i].document_filename = "Documento desconocido"

        return responses

    async def get_stats(self, tenant_id: str) -> ReviewStats:
        """Compute aggregate stats for a tenant."""
        stats = ReviewStats()

        # Total reviews by status
        status_stmt = (
            select(Review.status, func.count(Review.id))
            .where(Review.tenant_id == tenant_id)
            .group_by(Review.status)
        )
        status_result = await self.session.execute(status_stmt)
        for status, count in status_result:
            stats.total_reviews += count
            if status == "completed":
                stats.completed = count
            elif status == "pending":
                stats.pending = count
            elif status == "failed":
                stats.failed = count

        # Total documents
        doc_stmt = select(func.count(Document.id)).where(Document.tenant_id == tenant_id)
        doc_result = await self.session.execute(doc_stmt)
        stats.total_documents = doc_result.scalar() or 0

        # Risk distribution (from completed reviews with result_json)
        risk_stmt = (
            select(Review.result_json)
            .where(
                Review.tenant_id == tenant_id,
                Review.status == "completed",
                Review.result_json.isnot(None),
            )
        )
        risk_result = await self.session.execute(risk_stmt)
        risk_counts: dict[str, int] = {"alto": 0, "medio": 0, "bajo": 0}
        for (result_json,) in risk_result:
            try:
                data = json.loads(result_json)
                risk = data.get("overall_risk", "")
                if risk in risk_counts:
                    risk_counts[risk] += 1
            except (json.JSONDecodeError, TypeError):
                pass
        stats.risk_distribution = risk_counts

        # Review type distribution
        type_stmt = (
            select(Review.review_type, func.count(Review.id))
            .where(Review.tenant_id == tenant_id)
            .group_by(Review.review_type)
        )
        type_result = await self.session.execute(type_stmt)
        type_dist: dict[str, int] = {}
        for review_type, count in type_result:
            type_dist[review_type] = count
        stats.type_distribution = type_dist

        # Weekly trend (last 8 weeks)
        now = datetime.now(timezone.utc)
        weekly_trend = []
        for week_offset in range(7, -1, -1):
            week_start = now - timedelta(weeks=week_offset + 1)
            week_end = now - timedelta(weeks=week_offset)
            count_stmt = (
                select(func.count(Review.id))
                .where(
                    Review.tenant_id == tenant_id,
                    Review.created_at >= week_start,
                    Review.created_at < week_end,
                )
            )
            count_result = await self.session.execute(count_stmt)
            count = count_result.scalar() or 0
            weekly_trend.append({
                "week": week_start.strftime("%Y-%m-%d"),
                "count": count,
            })
        stats.weekly_trend = weekly_trend

        return stats

    async def update_status(self, review_id: str, tenant_id: str, status: str, result: AnalysisResult | None = None) -> ReviewResponse | None:
        stmt = select(Review).where(
            Review.id == review_id,
            Review.tenant_id == tenant_id
        )
        res = await self.session.execute(stmt)
        review = res.scalar_one_or_none()
        if not review:
            return None
        review.status = status
        if result is not None:
            review.result_json = result.model_dump_json()
        self.session.add(review)
        await self.session.commit()
        await self.session.refresh(review)
        return ReviewResponse.model_validate(review)
