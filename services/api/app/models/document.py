from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(255))
    text_content: Mapped[str] = mapped_column(Text())
    tenant_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(32), default="ingested")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    reviews = relationship("Review", back_populates="document", cascade="all, delete-orphan")
