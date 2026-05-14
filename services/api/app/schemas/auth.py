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

    model_config = {"from_attributes": True}
