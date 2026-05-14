import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.db import get_async_session
from app.models.user import User
from app.schemas.pricing import PLANS, PlanInfoResponse, PricingPlan, UpgradeRequest

router = APIRouter(prefix="/pricing", tags=["pricing"])
logger = logging.getLogger(__name__)

# Plan limits configuration
PLAN_LIMITS: dict[str, dict] = {
    "free": {"reviews_limit": 3, "documents_limit": 5},
    "pro": {"reviews_limit": None, "documents_limit": None},  # unlimited
}


def get_plan_info(user: User) -> PlanInfoResponse:
    """Build PlanInfoResponse from a user's plan data."""
    limits = PLAN_LIMITS.get(user.plan, PLAN_LIMITS["free"])
    reviews_limit = limits["reviews_limit"]

    # Use naive UTC for comparison (SQLite strips tzinfo)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    period_start = user.plan_period_start
    if period_start.tzinfo is not None:
        period_start = period_start.replace(tzinfo=None)

    # Reset if more than 30 days have passed
    if (now - period_start).days >= 30:
        reviews_used = 0
        reviews_remaining = reviews_limit
    else:
        reviews_used = user.reviews_used_this_period
        reviews_remaining = max(0, (reviews_limit or 99999) - reviews_used) if reviews_limit is not None else None

    plan_config = PLANS.get(user.plan, PLANS["free"])
    return PlanInfoResponse(
        current_plan=user.plan,
        plan_label=user.plan_label,
        reviews_used=reviews_used,
        reviews_limit=reviews_limit,
        reviews_remaining=reviews_remaining,
        documents_limit=limits["documents_limit"],
        monthly_price_clp=plan_config.price_monthly_clp,
    )


async def check_review_limit(user: User) -> None:
    """Raises 403 if the user has reached their review limit for the period."""
    limits = PLAN_LIMITS.get(user.plan, PLAN_LIMITS["free"])
    reviews_limit = limits["reviews_limit"]
    if reviews_limit is None:
        return  # unlimited

    # Use naive UTC for comparison
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    period_start = user.plan_period_start
    if period_start.tzinfo is not None:
        period_start = period_start.replace(tzinfo=None)

    # Reset if 30+ days have passed
    if (now - period_start).days >= 30:
        user.reviews_used_this_period = 0
        user.plan_period_start = now

    if user.reviews_used_this_period >= reviews_limit:
        raise HTTPException(
            status_code=403,
            detail=f"Has alcanzado el límite de {reviews_limit} revisiones de tu plan {user.plan_label}. "
                   f"Actualiza a Pro para revisiones ilimitadas.",
        )


async def increment_review_usage(user: User, session: AsyncSession) -> None:
    """Increment the user's review usage counter."""
    user.reviews_used_this_period = User.reviews_used_this_period + 1
    session.add(user)


@router.get("/plans", response_model=list[PricingPlan])
async def list_plans():
    """Return available pricing plans."""
    return list(PLANS.values())


@router.get("/my-plan", response_model=PlanInfoResponse)
async def get_my_plan(
    current_user: User = Depends(get_current_user),
):
    """Get the current user's plan info and usage."""
    return get_plan_info(current_user)


@router.post("/upgrade", response_model=PlanInfoResponse)
async def upgrade_plan(
    req: UpgradeRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Upgrade or downgrade the user's plan."""
    if req.plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Plan '{req.plan}' no válido. Opciones: {', '.join(PLANS.keys())}")

    old_plan = current_user.plan
    current_user.plan = req.plan
    # Reset usage counter on upgrade
    if req.plan == "pro" or old_plan == "pro":
        current_user.reviews_used_this_period = 0
        current_user.plan_period_start = datetime.now(timezone.utc).replace(tzinfo=None)

    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    logger.info("User %s changed plan: %s -> %s", current_user.email, old_plan, req.plan)
    return get_plan_info(current_user)
