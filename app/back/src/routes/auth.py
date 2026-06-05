"""Autenticação por e-mail e senha."""

import os

import jwt
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db
from src.errors import messages as err
from src.middleware.auth import get_current_user
from src.models.user import User, UserPublic
from src.repositories.user_repository import UserRepository
from src.services.password import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["Auth"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    user: UserPublic


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    user = await UserRepository(db).get_by_email(body.email.strip())
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail=err.INVALID_CREDENTIALS)
    secret = os.environ.get("JWT_SECRET", "change-me-in-development")
    token = jwt.encode(
        {"sub": str(user.id), "email": user.email},
        secret,
        algorithm="HS256",
    )
    return LoginResponse(token=token, user=UserPublic.model_validate(user))


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail=err.CURRENT_PASSWORD_INVALID)
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail=err.PASSWORD_TOO_SHORT)

    updated = await UserRepository(db).update_password(
        current_user.id,
        hash_password(body.new_password),
    )
    if updated is None:
        raise HTTPException(status_code=404, detail=err.USER_NOT_FOUND)
    await db.commit()
    return {"message": "Senha alterada com sucesso."}
