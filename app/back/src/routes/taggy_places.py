from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.connection import get_db
from src.services.taggy_places import (
    get_all_parking,
    get_all_tolls,
    get_taggy_places_summary,
    sync_taggy_places,
)

router = APIRouter(prefix="/taggy-places", tags=["Taggy Places"])


@router.get("/", response_model=dict[str, Any])
async def get_summary(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    data = await get_taggy_places_summary(db)
    return {"data": data}


@router.post("/sync", response_model=dict[str, Any])
async def sync_places(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    try:
        result = await sync_taggy_places(db)
        return {"data": result}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/tolls", response_model=dict[str, Any])
async def list_tolls(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    data = await get_all_tolls(db)
    return {"data": data}


@router.get("/parking", response_model=dict[str, Any])
async def list_parking(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    data = await get_all_parking(db)
    return {"data": data}
