import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.db import get_async_session
from app.models.user import User
from app.schemas.pricing import (
    PLANS,
    CheckoutRequest,
    CheckoutResponse,
    PaymentStatusResponse,
    PlanInfoResponse,
    PricingPlan,
    UpgradeRequest,
)
from app.services.flow_service import FlowError, FlowService

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
    """Upgrade or downgrade the user's plan.

    If upgrading to Pro, checks if the user has already paid via Flow.
    If no Flow subscription exists, it's a manual upgrade (free trial mode).
    """
    if req.plan not in PLANS:
        raise HTTPException(status_code=400, detail=f"Plan '{req.plan}' no válido. Opciones: {', '.join(PLANS.keys())}")

    old_plan = current_user.plan

    # If upgrading to pro, check for existing payment
    if req.plan == "pro" and not current_user.flow_subscription_id:
        logger.warning(
            "User %s upgrading to Pro without Flow subscription — free trial upgrade",
            current_user.email,
        )

    current_user.plan = req.plan
    # Reset usage counter on plan change
    if req.plan == "pro" or old_plan == "pro":
        current_user.reviews_used_this_period = 0
        current_user.plan_period_start = datetime.now(timezone.utc).replace(tzinfo=None)

    session.add(current_user)
    await session.commit()
    await session.refresh(current_user)

    logger.info("User %s changed plan: %s -> %s", current_user.email, old_plan, req.plan)
    return get_plan_info(current_user)


# ── Flow.cl checkout & webhook ──────────────────────────


@router.post("/create-checkout", response_model=CheckoutResponse)
async def create_checkout(
    req: CheckoutRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a Flow.cl payment checkout for the Pro plan.

    Generates a payment link that redirects the user to Flow/Webpay.
    """
    if req.plan != "pro":
        raise HTTPException(status_code=400, detail="Solo el plan Pro está disponible para pago.")

    if current_user.plan == "pro" and current_user.flow_subscription_id:
        raise HTTPException(status_code=400, detail="Ya tienes una suscripción Pro activa.")

    flow = FlowService()

    if not flow.enabled:
        raise HTTPException(
            status_code=503,
            detail="Pasarela de pago no configurada. Contacta al administrador.",
        )

    # Generate a unique commerce order
    now_ts = int(datetime.now(timezone.utc).timestamp())
    commerce_order = f"PRO-{current_user.id[:8]}-{now_ts}"

    plan = PLANS["pro"]

    try:
        result = await flow.create_checkout(
            commerce_order=commerce_order,
            subject="Plan Pro - Legal Agent CL (1 mes)",
            amount=plan.price_monthly_clp,
            email=current_user.email,
        )
    except FlowError as e:
        logger.error("Flow checkout failed for user %s: %s", current_user.email, e)
        raise HTTPException(status_code=502, detail=f"Error al crear el pago: {e}") from e

    logger.info(
        "Checkout created for user %s: order=%s flow_order=%s",
        current_user.email,
        commerce_order,
        result.flow_order,
    )

    return CheckoutResponse(
        payment_url=result.payment_url,
        flow_order=result.flow_order,
    )


@router.post("/flow-webhook")
async def flow_webhook(
    request: Request,
    session: AsyncSession = Depends(get_async_session),
):
    """Webhook endpoint called by Flow.cl after a payment is processed.

    Flow sends a POST with form-encoded body containing:
      - apiKey: str
      - flowOrder: str
      - token: str (verification hash)

    We verify authenticity via hash, then activate the Pro plan for the user.
    """
    form = await request.form()
    flow_order = form.get("flowOrder", "")
    token = form.get("token", "")

    logger.info("Flow webhook received: flowOrder=%s", flow_order)

    flow = FlowService()
    if not flow.enabled:
        logger.error("Flow webhook called but Flow is not configured")
        return PlainTextResponse("ERROR: Flow no configurado", status_code=500)

    # Verify the webhook is authentic
    if not flow.verify_webhook(token, flow_order):
        logger.warning("Flow webhook hash verification failed: flowOrder=%s", flow_order)
        return PlainTextResponse("ERROR: Hash inválido", status_code=403)

    # Fetch payment status to confirm
    try:
        payment_status = await flow.get_payment_status(token)
    except FlowError as e:
        logger.error("Flow status check failed for %s: %s", flow_order, e)
        return PlainTextResponse(f"ERROR: {e}", status_code=502)

    logger.info(
        "Flow payment status: order=%s flow_order=%s status=%d amount=%d",
        payment_status.commerce_order,
        payment_status.flow_order,
        payment_status.status,
        payment_status.amount,
    )

    # Status codes: 1=pendiente, 2=aprobada, 3=rechazada, 4=cancelada
    if payment_status.status == 2:
        # Payment approved — find user by commerce order
        commerce_order = payment_status.commerce_order
        user_id_prefix = commerce_order.split("-")[1] if "-" in commerce_order else ""

        if not user_id_prefix:
            logger.error("Cannot parse user from commerce_order: %s", commerce_order)
            return PlainTextResponse("ERROR: commerce_order inválido", status_code=400)

        # Find user — the commerce order contains the user ID prefix
        result = await session.execute(
            select(User).where(User.id.like(f"{user_id_prefix}%"))
        )
        user = result.scalar_one_or_none()

        if not user:
            logger.error("User not found for commerce_order: %s", commerce_order)
            return PlainTextResponse("ERROR: Usuario no encontrado", status_code=404)

        # Activate Pro plan
        old_plan = user.plan
        user.plan = "pro"
        user.reviews_used_this_period = 0
        user.plan_period_start = datetime.now(timezone.utc).replace(tzinfo=None)
        user.flow_subscription_id = flow_order

        session.add(user)
        await session.commit()

        logger.info(
            "User %s upgraded to Pro via Flow payment: flow_order=%s (old_plan=%s)",
            user.email,
            flow_order,
            old_plan,
        )
        return PlainTextResponse("OK")
    else:
        logger.info(
            "Flow payment not approved (status=%d) for order=%s",
            payment_status.status,
            payment_status.commerce_order,
        )
        # Still return OK to acknowledge receipt; payment not activated
        return PlainTextResponse("OK")


@router.get("/payment-status", response_model=PaymentStatusResponse)
async def get_payment_status(
    commerce_order: str = Query(..., description="Commerce order ID from checkout"),
    current_user: User = Depends(get_current_user),
):
    """Check the status of a payment after returning from Flow.

    The frontend redirects to /app/payment/return after Flow checkout.
    This endpoint provides the current status for display.
    """
    flow = FlowService()

    if not flow.enabled:
        raise HTTPException(status_code=503, detail="Pasarela de pago no configurada.")

    # Try to find a review that matches this commerce order
    if current_user.plan == "pro" and current_user.flow_subscription_id:
        return PaymentStatusResponse(
            status="approved",
            plan="pro",
            message="Pago confirmado. ¡Bienvenido a Pro!",
        )

    # Payment not yet processed (webhook may still be pending)
    return PaymentStatusResponse(
        status="pending",
        plan=current_user.plan,
        message="El pago está siendo procesado. Si el problema persiste, contacta a soporte.",
    )
