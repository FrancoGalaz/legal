from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Pricing fields
    plan: Mapped[str] = mapped_column(String(32), default="free", nullable=False)
    reviews_used_this_period: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    plan_period_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc).replace(tzinfo=None),
        nullable=False,
    )

    # Flow.cl payment fields
    flow_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)

    @property
    def plan_label(self) -> str:
        return "Pro" if self.plan == "pro" else "Gratuito"
