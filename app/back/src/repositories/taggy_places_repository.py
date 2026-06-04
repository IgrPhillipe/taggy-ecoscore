from datetime import datetime

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.taggy_places import TaggyParkingPlace, TaggyTollPlace

# ~0.5 degrees ≈ 55 km at equator — tight enough for route proximity
_BBOX_DELTA = 0.5


class TaggyPlacesRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Tolls ─────────────────────────────────────────────────────────────────

    async def replace_all_tolls(self, rows: list[TaggyTollPlace]) -> int:
        await self.db.execute(delete(TaggyTollPlace))
        self.db.add_all(rows)
        await self.db.flush()
        return len(rows)

    async def get_all_tolls(self) -> list[TaggyTollPlace]:
        result = await self.db.execute(select(TaggyTollPlace))
        return list(result.scalars().all())

    async def count_tolls(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(TaggyTollPlace))
        return result.scalar_one()

    async def get_last_toll_sync(self) -> datetime | None:
        result = await self.db.execute(
            select(func.max(TaggyTollPlace.synced_at))
        )
        return result.scalar_one_or_none()

    async def get_tolls_near_bbox(
        self,
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
    ) -> list[TaggyTollPlace]:
        result = await self.db.execute(
            select(TaggyTollPlace).where(
                TaggyTollPlace.latitude >= min_lat,
                TaggyTollPlace.latitude <= max_lat,
                TaggyTollPlace.longitude >= min_lng,
                TaggyTollPlace.longitude <= max_lng,
            )
        )
        return list(result.scalars().all())

    # ── Parking ───────────────────────────────────────────────────────────────

    async def replace_all_parking(self, rows: list[TaggyParkingPlace]) -> int:
        await self.db.execute(delete(TaggyParkingPlace))
        self.db.add_all(rows)
        await self.db.flush()
        return len(rows)

    async def get_all_parking(self) -> list[TaggyParkingPlace]:
        result = await self.db.execute(select(TaggyParkingPlace))
        return list(result.scalars().all())

    async def count_parking(self) -> int:
        result = await self.db.execute(select(func.count()).select_from(TaggyParkingPlace))
        return result.scalar_one()

    async def get_last_parking_sync(self) -> datetime | None:
        result = await self.db.execute(
            select(func.max(TaggyParkingPlace.synced_at))
        )
        return result.scalar_one_or_none()

    async def get_parking_near_bbox(
        self,
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
    ) -> list[TaggyParkingPlace]:
        result = await self.db.execute(
            select(TaggyParkingPlace).where(
                TaggyParkingPlace.latitude >= min_lat,
                TaggyParkingPlace.latitude <= max_lat,
                TaggyParkingPlace.longitude >= min_lng,
                TaggyParkingPlace.longitude <= max_lng,
            )
        )
        return list(result.scalars().all())
