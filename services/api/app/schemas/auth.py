from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime


class RegisterRequest(BaseModel):
    email: str = Field(..., description="Correo electrónico")
    password: str = Field(..., min_length=6, description="Contraseña (mín. 6 caracteres)")
    name: str = Field(..., description="Nombre completo")
    tenant_id: str = Field(default="tenant-demo", description="ID del tenant")


class LoginRequest(BaseModel):
    email: str = Field(..., description="Correo electrónico")
    password: str = Field(..., description="Contraseña")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool
    created_at: datetime
    plan: str = "free"
    reviews_used_this_period: int = 0

    model_config = {"from_attributes": True}


class UserWithPlanResponse(UserResponse):
    """Extends UserResponse with computed plan info."""
    plan_label: str = "Gratuito"
    plan_limit: int = 3
    reviews_remaining: int = 3
    tenant_name: Optional[str] = None
