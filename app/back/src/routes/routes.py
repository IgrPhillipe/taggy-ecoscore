from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db
from src.dto.routes import RouteSuggestRequest, RouteSuggestResponse
from src.errors import messages as err
from src.services.route_service import suggest_routes

router = APIRouter(prefix="/routes", tags=["Routes"])


@router.post("/suggest", response_model=dict[str, Any])
async def suggest_route(
    payload: RouteSuggestRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    user_id = 1  # TODO: restore auth
    try:
        result = await suggest_routes(
            db=db,
            origin=payload.origin,
            destination=payload.destination,  # str or {"lat", "lng"}
            user_id=user_id,
        )
        return {"data": result.model_dump(mode="json")}
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=503, detail=err.ROUTE_SERVICE_UNAVAILABLE) from exc
