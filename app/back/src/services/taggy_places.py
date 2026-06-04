from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.providers.taggy_places_provider import fetch_all_places
from src.repositories.taggy_places_repository import TaggyPlacesRepository


async def sync_taggy_places(db: AsyncSession) -> dict:
    repo = TaggyPlacesRepository(db)
    tolls, parking = await fetch_all_places()

    toll_count = await repo.replace_all_tolls(tolls)
    parking_count = await repo.replace_all_parking(parking)
    await db.commit()

    return {
        "tolls_synced": toll_count,
        "parking_synced": parking_count,
        "synced_at": datetime.utcnow().isoformat(),
    }


async def get_taggy_places_summary(db: AsyncSession) -> dict:
    repo = TaggyPlacesRepository(db)
    toll_count = await repo.count_tolls()
    parking_count = await repo.count_parking()
    last_toll_sync = await repo.get_last_toll_sync()
    last_parking_sync = await repo.get_last_parking_sync()

    last_sync = None
    if last_toll_sync and last_parking_sync:
        last_sync = max(last_toll_sync, last_parking_sync)
    elif last_toll_sync or last_parking_sync:
        last_sync = last_toll_sync or last_parking_sync

    return {
        "toll_count": toll_count,
        "parking_count": parking_count,
        "last_synced_at": last_sync.isoformat() if last_sync else None,
    }


async def get_all_tolls(db: AsyncSession) -> list[dict]:
    repo = TaggyPlacesRepository(db)
    rows = await repo.get_all_tolls()
    return [
        {
            "id": r.id,
            "name": r.name,
            "plaza_short_name": r.plaza_short_name,
            "company_short_name": r.company_short_name,
            "vicinity": r.vicinity,
            "city": r.city,
            "state": r.state,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "payment_by_plate": r.payment_by_plate,
            "synced_at": r.synced_at.isoformat(),
        }
        for r in rows
    ]


async def get_all_parking(db: AsyncSession) -> list[dict]:
    repo = TaggyPlacesRepository(db)
    rows = await repo.get_all_parking()
    return [
        {
            "id": r.id,
            "name": r.name,
            "plaza_short_name": r.plaza_short_name,
            "company_short_name": r.company_short_name,
            "vicinity": r.vicinity,
            "city": r.city,
            "state": r.state,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "payment_by_plate": r.payment_by_plate,
            "synced_at": r.synced_at.isoformat(),
        }
        for r in rows
    ]
