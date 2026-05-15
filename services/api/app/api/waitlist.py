import uuid

import logging
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_async_session
from app.models.waitlist import WaitlistEntry

router = APIRouter(prefix="/waitlist", tags=["waitlist"])
logger = logging.getLogger(__name__)


class WaitlistRequest(BaseModel):
    name: str | None = Field(default=None, max_length=255, description="Nombre opcional del interesado")
    email: str = Field(..., description="Correo electrónico")


class WaitlistResponse(BaseModel):
    id: str
    message: str = "¡Registro exitoso! Te avisaremos cuando lancemos."


@router.post("", response_model=WaitlistResponse, status_code=201)
async def join_waitlist(
    req: WaitlistRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """Register an email in the waitlist (public endpoint, no auth required)."""
    # Simple email validation
    if "@" not in req.email or "." not in req.email:
        raise HTTPException(status_code=400, detail="Correo electrónico no válido")

    # Check if email already exists
    result = await session.execute(
        select(WaitlistEntry).where(WaitlistEntry.email == req.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return WaitlistResponse(
            id=existing.id,
            message="Ya estás en la lista. Te avisaremos cuando lancemos.",
        )

    entry = WaitlistEntry(
        id=str(uuid.uuid4())[:32],
        name=req.name,
        email=req.email,
    )
    session.add(entry)
    await session.commit()
    await session.refresh(entry)

    logger.info("Waitlist entry created: %s (%s)", entry.email, entry.id)

    return WaitlistResponse(id=entry.id)
