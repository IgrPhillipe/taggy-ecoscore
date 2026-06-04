"""Autenticação por e-mail e senha."""

import os

import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db
from src.errors import messages as err
from src.models.user import UserPublic
from src.repositories.user_repository import UserRepository
from src.services.password import verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    user: UserPublic


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    user = await UserRepository(db).get_by_email(body.email.strip())
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail=err.INVALID_CREDENTIALS)
    secret = os.environ.get("JWT_SECRET", "change-me-in-development")
    token = jwt.encode({"sub": user.id, "email": user.email}, secret, algorithm="HS256")
    return LoginResponse(token=token, user=UserPublic.model_validate(user))
