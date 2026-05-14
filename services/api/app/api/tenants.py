import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    create_access_token,
    get_current_user,
    hash_password,
)
from app.core.db import get_async_session
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.schemas.tenant import (
    TenantInviteRequest,
    TenantMemberResponse,
    TenantOnboardRequest,
    TenantResponse,
)

router = APIRouter(prefix="/tenants", tags=["tenants"])
logger = logging.getLogger(__name__)


@router.post("/onboard", response_model=TokenResponse, status_code=201)
async def onboard_tenant(
    req: TenantOnboardRequest,
    session: AsyncSession = Depends(get_async_session),
):
    """Create a new law firm (tenant) and its admin user in one request.

    This is the multi-tenant onboarding flow for estudios jurídicos.
    Creates the tenant and admin user atomically, returns a JWT token.
    """
    # Check if slug is already taken
    result = await session.execute(select(Tenant).where(Tenant.slug == req.slug))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El slug '{req.slug}' ya está en uso. Elige otro nombre para tu estudio.",
        )

    # Check if email is already registered
    result = await session.execute(select(User).where(User.email == req.admin_email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con este correo electrónico",
        )

    # Create tenant
    tenant_id = str(uuid.uuid4())[:32]
    tenant = Tenant(
        id=tenant_id,
        name=req.firm_name,
        slug=req.slug,
        description=req.firm_description,
    )
    session.add(tenant)

    # Create admin user
    user_id = str(uuid.uuid4())[:32]
    user = User(
        id=user_id,
        email=req.admin_email,
        name=req.admin_name,
        hashed_password=hash_password(req.admin_password),
        tenant_id=tenant_id,
    )
    session.add(user)

    # Update tenant with owner
    tenant.owner_id = user_id

    await session.commit()
    await session.refresh(tenant)

    token = create_access_token(user.id, tenant.id)
    logger.info(
        "New tenant onboarded: %s (slug=%s) — admin: %s (%s)",
        tenant.name, tenant.slug, user.email, user.id,
    )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=TenantResponse)
async def get_my_tenant(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Get the current user's tenant (law firm) details."""
    result = await session.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Estudio jurídico no encontrado")
    return tenant


@router.get("/members", response_model=list[TenantMemberResponse])
async def list_members(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """List all members of the current user's tenant (law firm)."""
    result = await session.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Estudio jurídico no encontrado")

    # Get all users in this tenant
    result = await session.execute(
        select(User).where(User.tenant_id == current_user.tenant_id).order_by(User.created_at)
    )
    users = result.scalars().all()

    members = []
    for u in users:
        members.append(TenantMemberResponse(
            id=u.id,
            email=u.email,
            name=u.name,
            is_active=u.is_active,
            plan=u.plan,
            created_at=u.created_at,
            is_owner=(u.id == tenant.owner_id),
        ))
    return members


@router.post("/members", response_model=TenantMemberResponse, status_code=201)
async def add_member(
    req: TenantInviteRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Add a new member to the tenant (law firm).

    Only the tenant owner can add members.
    """
    # Verify current user is the tenant owner
    result = await session.execute(
        select(Tenant).where(Tenant.id == current_user.tenant_id)
    )
    tenant = result.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Estudio jurídico no encontrado")
    if tenant.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el administrador del estudio puede agregar miembros.",
        )

    # Check if email already exists
    result = await session.execute(select(User).where(User.email == req.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un usuario con este correo electrónico",
        )

    # Create new user under this tenant
    import secrets
    import string
    temp_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(12))

    user_id = str(uuid.uuid4())[:32]
    user = User(
        id=user_id,
        email=req.email,
        name=req.name,
        hashed_password=hash_password(temp_password),
        tenant_id=tenant.id,
        is_active=True,
        plan=current_user.plan,  # Same plan as the firm
    )
    session.add(user)

    # Update member count
    tenant.member_count = Tenant.member_count + 1
    session.add(tenant)

    await session.commit()
    await session.refresh(user)

    logger.info(
        "Member added to tenant %s: %s (%s) by admin %s",
        tenant.name, user.email, user.id, current_user.email,
    )

    return TenantMemberResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        is_active=user.is_active,
        plan=user.plan,
        created_at=user.created_at,
        is_owner=False,
    )
