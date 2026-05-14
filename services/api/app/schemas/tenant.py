from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TenantCreateRequest(BaseModel):
    """Request to create a new tenant (law firm)."""
    name: str = Field(..., min_length=2, max_length=255, description="Nombre del estudio jurídico")
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$", description="Slug único para el estudio (letras minúsculas, números, guiones)")
    description: Optional[str] = Field(None, max_length=1000, description="Descripción del estudio")


class TenantOnboardRequest(BaseModel):
    """Complete onboarding: creates tenant + admin user in one request."""
    # Tenant info
    firm_name: str = Field(..., min_length=2, max_length=255, description="Nombre del estudio jurídico")
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$", description="Slug único para el estudio")
    firm_description: Optional[str] = Field(None, max_length=1000, description="Descripción del estudio")
    # Admin user info
    admin_name: str = Field(..., min_length=2, max_length=255, description="Nombre del administrador")
    admin_email: str = Field(..., description="Correo electrónico del administrador")
    admin_password: str = Field(..., min_length=6, description="Contraseña (mín. 6 caracteres)")


class TenantResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    owner_id: Optional[str] = None
    member_count: int = 1
    is_active: bool = True
    created_at: datetime

    model_config = {"from_attributes": True}


class TenantMemberResponse(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool
    plan: str = "free"
    created_at: datetime
    is_owner: bool = False

    model_config = {"from_attributes": True}


class TenantInviteRequest(BaseModel):
    email: str = Field(..., description="Correo del miembro a invitar")
    name: str = Field(..., min_length=2, max_length=255, description="Nombre del miembro")
