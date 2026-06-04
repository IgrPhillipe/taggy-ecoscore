import asyncio
from datetime import datetime

import httpx

from src.models.taggy_places import TaggyParkingPlace, TaggyTollPlace

TAGGY_TOLLS_URL = "https://www.taggy.com.br/OndeUsar/ListPlaces"
TAGGY_PARKING_URL = "https://www.taggy.com.br/OndeUsar/ListParkingPlaces"

_HEADERS = {
    "User-Agent": "TaggyEcoScore/1.0",
    "Accept": "application/json",
}


def _parse_toll(raw: dict, now: datetime) -> TaggyTollPlace | None:
    try:
        loc = raw["geometry"]["location"]
        lat = float(loc["lat"])
        lng = float(loc["lng"])
    except (KeyError, TypeError, ValueError):
        return None

    return TaggyTollPlace(
        name=raw.get("name") or "",
        plaza_short_name=raw.get("plazaShortName") or "",
        company_short_name=raw.get("companyShortName") or "",
        vicinity=raw.get("vicinity") or "",
        city=raw.get("city") or "",
        state=raw.get("state") or "",
        latitude=lat,
        longitude=lng,
        payment_by_plate=bool(raw.get("paymentByPlate", False)),
        raw_json=raw,
        synced_at=now,
    )


def _parse_parking(raw: dict, now: datetime) -> TaggyParkingPlace | None:
    try:
        loc = raw["geometry"]["location"]
        lat = float(loc["lat"])
        lng = float(loc["lng"])
    except (KeyError, TypeError, ValueError):
        return None

    return TaggyParkingPlace(
        name=raw.get("name") or "",
        plaza_short_name=raw.get("plazaShortName") or "",
        company_short_name=raw.get("companyShortName") or "",
        vicinity=raw.get("vicinity") or "",
        city=raw.get("city") or "",
        state=raw.get("state") or "",
        latitude=lat,
        longitude=lng,
        payment_by_plate=bool(raw.get("paymentByPlate", False)),
        raw_json=raw,
        synced_at=now,
    )


async def fetch_toll_places() -> list[TaggyTollPlace]:
    now = datetime.utcnow()
    async with httpx.AsyncClient(headers=_HEADERS, timeout=30) as client:
        resp = await client.get(TAGGY_TOLLS_URL)
        resp.raise_for_status()
        data = resp.json()

    items = data if isinstance(data, list) else data.get("results", data.get("data", []))
    places = [_parse_toll(r, now) for r in items]
    return [p for p in places if p is not None]


async def fetch_parking_places() -> list[TaggyParkingPlace]:
    now = datetime.utcnow()
    async with httpx.AsyncClient(headers=_HEADERS, timeout=30) as client:
        resp = await client.get(TAGGY_PARKING_URL)
        resp.raise_for_status()
        data = resp.json()

    items = data if isinstance(data, list) else data.get("results", data.get("data", []))
    places = [_parse_parking(r, now) for r in items]
    return [p for p in places if p is not None]


async def fetch_all_places() -> tuple[list[TaggyTollPlace], list[TaggyParkingPlace]]:
    tolls, parking = await asyncio.gather(fetch_toll_places(), fetch_parking_places())
    return tolls, parking
