import logging
import os
from typing import Any

import jwt
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db
from src.errors import messages as err
from src.models.user import User
from src.repositories.user_repository import UserRepository

logger = logging.getLogger(__name__)

bearer = HTTPBearer()


def _decode_jwt(token: str) -> dict[str, Any]:
    secret = os.environ.get("JWT_SECRET", "change-me-in-development")
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=err.TOKEN_INVALID,
        ) from None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    payload = _decode_jwt(credentials.credentials)
    sub = payload.get("sub")
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=err.TOKEN_MISSING_SUB,
        )
    user = await UserRepository(db).get_by_id(int(sub))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=err.USER_NOT_FOUND,
        )
    return user
