"""
Eco-route calculation service.

Flow:
1. Geocode origin/destination (if string) via Mapbox Geocoding API
2. Call Mapbox Directions API (driving-traffic, alternatives=true)
3. Per alternative: calculate CO2 using vehicle fuel_type + autonomy via CalcEngine
4. Proximity-filter Taggy toll/parking from DB against route bounding box
5. Return sorted by carbon_estimate_kg ASC (greenest first)
"""

from __future__ import annotations

import math
import os
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from src.dto.routes import PlaceRef, RouteAlternative, RouteSuggestResponse
from src.engine import CalcEngine
from src.repositories.fuel_prices_repository import FuelPricesRepository
from src.repositories.taggy_places_repository import TaggyPlacesRepository
from src.repositories.technical_specs_repository import TechnicalSpecsRepository
from src.repositories.vehicle_repository import VehicleRepository

# Default emission kg/km used as benchmark (gasoline baseline per CETESB)
_BENCHMARK_KG_PER_KM = 0.21
# Fallback autonomy if vehicle has no average_autonomy_km set
_DEFAULT_AUTONOMY_KM = 12.0


def _mapbox_token() -> str:
    token = os.environ.get("MAPBOX_ACCESS_TOKEN", "")
    if not token:
        raise RuntimeError("MAPBOX_ACCESS_TOKEN não configurado.")
    return token


async def _geocode(text: str, proximity_lnglat: list[float] | None = None) -> list[float]:
    """Returns [lng, lat]."""
    params: dict = {
        "access_token": _mapbox_token(),
        "country": "br",
        "limit": 1,
        "types": "poi,address,place",
        "language": "pt",
    }
    if proximity_lnglat:
        params["proximity"] = f"{proximity_lnglat[0]},{proximity_lnglat[1]}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"https://api.mapbox.com/geocoding/v5/mapbox.places/{text}.json",
            params=params,
        )
        resp.raise_for_status()
    features = resp.json().get("features", [])
    if not features:
        raise ValueError(f"Endereço não encontrado: {text!r}")
    return features[0]["center"]  # [lng, lat]


async def _directions(
    origin_lnglat: list[float],
    dest_lnglat: list[float],
) -> list[dict]:
    """Returns list of Mapbox route objects."""
    coords = f"{origin_lnglat[0]},{origin_lnglat[1]};{dest_lnglat[0]},{dest_lnglat[1]}"
    params = {
        "access_token": _mapbox_token(),
        "alternatives": "true",
        "overview": "full",
        "geometries": "geojson",
        "annotations": "congestion",
        "steps": "false",
    }
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"https://api.mapbox.com/directions/v5/mapbox/driving-traffic/{coords}",
            params=params,
        )
        resp.raise_for_status()
    data = resp.json()
    return data.get("routes", [])


def _congestion_level(legs: list[dict]) -> str:
    """Aggregate congestion annotation from legs into low/moderate/heavy."""
    counts: dict[str, int] = {"unknown": 0, "low": 0, "moderate": 0, "heavy": 0, "severe": 0}
    for leg in legs:
        ann = leg.get("annotation", {})
        for c in ann.get("congestion", []):
            counts[c] = counts.get(c, 0) + 1
    total = sum(counts.values()) or 1
    heavy_pct = (counts.get("heavy", 0) + counts.get("severe", 0)) / total
    moderate_pct = counts.get("moderate", 0) / total
    if heavy_pct > 0.15:
        return "heavy"
    if moderate_pct > 0.25 or heavy_pct > 0.05:
        return "moderate"
    return "low"


def _route_bbox(coords: list[list[float]]) -> tuple[float, float, float, float]:
    """Returns (min_lat, max_lat, min_lng, max_lng) with 0.05° padding."""
    lngs = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    pad = 0.05
    return min(lats) - pad, max(lats) + pad, min(lngs) - pad, max(lngs) + pad


def _dist_point_to_segment(
    px: float, py: float,
    ax: float, ay: float,
    bx: float, by: float,
) -> float:
    """Minimum distance from point P to segment AB (in degrees, planar approx)."""
    dx, dy = bx - ax, by - ay
    seg_len_sq = dx * dx + dy * dy
    if seg_len_sq == 0:
        return math.sqrt((px - ax) ** 2 + (py - ay) ** 2)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / seg_len_sq))
    proj_x = ax + t * dx
    proj_y = ay + t * dy
    return math.sqrt((px - proj_x) ** 2 + (py - proj_y) ** 2)


def _point_near_route(
    lat: float,
    lng: float,
    route_coords: list[list[float]],
    threshold_deg: float = 0.00027,  # ~30 m — toll must be ON the road
) -> bool:
    """Check if point is within threshold_deg of any route segment (perpendicular distance)."""
    for i in range(len(route_coords) - 1):
        a, b = route_coords[i], route_coords[i + 1]
        dist = _dist_point_to_segment(lng, lat, a[0], a[1], b[0], b[1])
        if dist <= threshold_deg:
            return True
    return False


def _dedupe_places_by_proximity(
    places: list,
    threshold_deg: float = 0.0018,  # ~200 m — merge same physical plaza
) -> list:
    """Remove duplicate place entries that represent the same physical location."""
    kept: list = []
    for p in places:
        is_dup = False
        for k in kept:
            dlat = p.latitude - k.latitude
            dlng = p.longitude - k.longitude
            if math.sqrt(dlat * dlat + dlng * dlng) <= threshold_deg:
                is_dup = True
                break
        if not is_dup:
            kept.append(p)
    return kept


def _point_near_dest(
    lat: float,
    lng: float,
    dest_lnglat: list[float],
    threshold_deg: float = 0.018,  # ~2 km
) -> bool:
    """Check if point is within threshold_deg of destination."""
    dlat = lat - dest_lnglat[1]
    dlng = lng - dest_lnglat[0]
    return math.sqrt(dlat * dlat + dlng * dlng) <= threshold_deg


# Time penalty per toll stop (queue + transaction) for duration estimate
_TOLL_TIME_PENALTY_MIN = 2.5

# Fallback idle CO2 when CalcEngine unavailable (~0.15 kg per 180s at pedágio)
_FALLBACK_PED_BASELINE_SEC = 180
_FALLBACK_PED_ELAPSED_SEC = 15
_FALLBACK_PARK_BASELINE_SEC = 120
_FALLBACK_PARK_ELAPSED_SEC = 30
_FALLBACK_CO2_PER_PED_BASELINE = 0.15


def _idle_co2_kg(
    wait_sec: int,
    category: str,
    fuel_type: str,
    engine: CalcEngine | None,
) -> float:
    """CO₂e from idling for wait_sec at a toll/parking (full wait, not time saved)."""
    if wait_sec <= 0:
        return 0.0
    if engine:
        fuel = engine.calculate_avoided_idle_fuel(wait_sec, category, fuel_type)
        return round(engine.calculate_co2e_from_fuel(fuel, fuel_type)["co2e_total_kg"], 4)
    # Proxy aligned with legacy per-toll penalty
    return round((wait_sec / _FALLBACK_PED_BASELINE_SEC) * _FALLBACK_CO2_PER_PED_BASELINE, 4)


def _baseline_times(engine: CalcEngine | None) -> dict[str, int]:
    if engine:
        baselines = engine.specs["baselines"]
        return {
            "pedagio_baseline": int(baselines["pedagio"]["avg_wait_sec"]),
            "pedagio_elapsed": int(
                baselines["pedagio"].get("with_tag_avg_sec", _FALLBACK_PED_ELAPSED_SEC)
            ),
            "estacionamento_baseline": int(baselines["estacionamento"]["avg_wait_sec"]),
            "estacionamento_elapsed": int(
                baselines["estacionamento"].get(
                    "with_tag_avg_sec", _FALLBACK_PARK_ELAPSED_SEC
                )
            ),
        }
    return {
        "pedagio_baseline": _FALLBACK_PED_BASELINE_SEC,
        "pedagio_elapsed": _FALLBACK_PED_ELAPSED_SEC,
        "estacionamento_baseline": _FALLBACK_PARK_BASELINE_SEC,
        "estacionamento_elapsed": _FALLBACK_PARK_ELAPSED_SEC,
    }


def _route_carbon_scenarios(
    driving_co2_kg: float,
    toll_count: int,
    parking_count: int,
    category: str,
    fuel_type: str,
    engine: CalcEngine | None,
) -> tuple[float, float, float, float]:
    """
    Returns (with_tag_kg, without_tag_kg, saved_kg, saved_pct).
    Sem tag: idle nos tempos baseline + papel nos pedágios.
    Com tag: idle nos tempos com tag (passagem rápida).
    """
    times = _baseline_times(engine)
    per_toll_without = _idle_co2_kg(
        times["pedagio_baseline"], category, fuel_type, engine
    )
    per_toll_with = _idle_co2_kg(times["pedagio_elapsed"], category, fuel_type, engine)
    per_park_without = _idle_co2_kg(
        times["estacionamento_baseline"], category, fuel_type, engine
    )
    per_park_with = _idle_co2_kg(
        times["estacionamento_elapsed"], category, fuel_type, engine
    )

    stops_without = toll_count * per_toll_without + parking_count * per_park_without
    stops_with = toll_count * per_toll_with + parking_count * per_park_with

    paper_kg = 0.0
    if engine and toll_count > 0:
        paper_kg = round(
            engine.calculate_paper_and_water_savings(True)["co2"] * toll_count, 4
        )

    without_tag = round(driving_co2_kg + stops_without + paper_kg, 4)
    with_tag = round(driving_co2_kg + stops_with, 4)
    saved = round(max(without_tag - with_tag, 0), 4)
    saved_pct = round((saved / without_tag * 100) if without_tag > 0 else 0.0, 1)
    return with_tag, without_tag, saved, saved_pct


def _calc_co2(
    distance_km: float,
    fuel_type: str,
    autonomy_km: float,
    engine: CalcEngine,
) -> float:
    """
    Estimate trip CO2e in kg.

    For liquid fuels: fuel_liters = distance_km / autonomy_km → engine.calculate_co2e
    For electric: fuel_kwh = distance_km / autonomy_km (kWh/km implicit in autonomy)
    """
    if autonomy_km <= 0:
        autonomy_km = _DEFAULT_AUTONOMY_KM
    fuel_amount = distance_km / autonomy_km
    result = engine.calculate_co2e_from_fuel(fuel_amount, fuel_type)
    return round(result["co2e_total_kg"], 4)


async def suggest_routes(
    db: AsyncSession,
    origin: str | dict,
    destination: str | dict,
    user_id: int,
) -> RouteSuggestResponse:
    # ── 1. Resolve coordinates ────────────────────────────────────────────────
    if isinstance(origin, dict):
        origin_coords = [float(origin["lng"]), float(origin["lat"])]
    else:
        origin_coords = await _geocode(origin)

    if isinstance(destination, dict):
        dest_coords = [float(destination["lng"]), float(destination["lat"])]
    else:
        # Use origin as proximity hint so geocoding stays in the same region
        dest_coords = await _geocode(destination, proximity_lnglat=origin_coords)

    # ── 2. Get Mapbox routes ──────────────────────────────────────────────────
    mb_routes = await _directions(origin_coords, dest_coords)
    if not mb_routes:
        raise ValueError("Nenhuma rota encontrada entre os pontos informados.")

    # ── 3. Load vehicle + specs ───────────────────────────────────────────────
    vehicle_repo = VehicleRepository(db)
    specs_repo = TechnicalSpecsRepository(db)
    prices_repo = FuelPricesRepository(db)

    # Get user's first vehicle (motorista typically has one)
    vehicles = await vehicle_repo.get_all()
    vehicle = next((v for v in vehicles if v.user_id == user_id), None)

    fuel_type = vehicle.fuel_type if vehicle else "gasolina_c"
    vehicle_category = vehicle.category if vehicle else "leve"
    autonomy_km = vehicle.average_autonomy_km if vehicle and vehicle.average_autonomy_km else _DEFAULT_AUTONOMY_KM

    # Build CalcEngine — try to load real specs, fall back to benchmark-only
    engine: CalcEngine | None = None
    try:
        from src.dto.fuel_price import fuel_rows_to_engine_prices_map
        from src.dto.technical_specs import technical_specs_to_engine_dict

        specs_row = await specs_repo.get_by_id(1)
        fuel_rows = await prices_repo.get_all()
        if specs_row and fuel_rows:
            prices_map = fuel_rows_to_engine_prices_map(fuel_rows)
            specs_dict = technical_specs_to_engine_dict(specs_row, prices_map)
            engine = CalcEngine(specs_dict)
    except Exception:
        engine = None

    # ── 4. Load Taggy places ──────────────────────────────────────────────────
    taggy_repo = TaggyPlacesRepository(db)

    # ── 5. Build alternatives ─────────────────────────────────────────────────
    alternatives: list[RouteAlternative] = []

    for idx, mb_route in enumerate(mb_routes):
        distance_m: float = mb_route.get("distance", 0)
        duration_s: float = mb_route.get("duration", 0)
        distance_km = round(distance_m / 1000, 2)
        duration_min = round(duration_s / 60, 1)

        geometry = mb_route.get("geometry", {})
        route_coords: list[list[float]] = geometry.get("coordinates", [])

        congestion = _congestion_level(mb_route.get("legs", []))

        # CO2 calculation
        if engine:
            carbon_kg = _calc_co2(distance_km, fuel_type, autonomy_km, engine)
        else:
            # Fallback: use benchmark factor adjusted for fuel type
            _factors = {
                "diesel_s10": 0.24,
                "gasolina_c": 0.21,
                "etanol": 0.12,
                "gnv": 0.18,
                "eletrico": 0.03,
            }
            carbon_kg = round(distance_km * _factors.get(fuel_type, 0.21), 4)

        fuel_liters = round(distance_km / autonomy_km, 3) if autonomy_km > 0 else 0

        # Taggy proximity
        toll_refs: list[PlaceRef] = []
        parking_refs: list[PlaceRef] = []

        if route_coords:
            min_lat, max_lat, min_lng, max_lng = _route_bbox(route_coords)
            tolls = await taggy_repo.get_tolls_near_bbox(min_lat, max_lat, min_lng, max_lng)

            for t in _dedupe_places_by_proximity(tolls):
                if _point_near_route(t.latitude, t.longitude, route_coords):
                    toll_refs.append(
                        PlaceRef(
                            id=t.id or 0,
                            name=t.name,
                            vicinity=t.vicinity,
                            latitude=t.latitude,
                            longitude=t.longitude,
                            payment_by_plate=t.payment_by_plate,
                        )
                    )

            # Parking: only within 1 km of destination
            dest_bbox_pad = 0.020  # ~2.2 km bbox to pre-filter, then precise check
            dest_lat, dest_lng = dest_coords[1], dest_coords[0]
            parking = await taggy_repo.get_parking_near_bbox(
                dest_lat - dest_bbox_pad,
                dest_lat + dest_bbox_pad,
                dest_lng - dest_bbox_pad,
                dest_lng + dest_bbox_pad,
            )
            for p in parking:
                if _point_near_dest(p.latitude, p.longitude, dest_coords):
                    parking_refs.append(
                        PlaceRef(
                            id=p.id or 0,
                            name=p.name,
                            vicinity=p.vicinity,
                            latitude=p.latitude,
                            longitude=p.longitude,
                            payment_by_plate=p.payment_by_plate,
                        )
                    )

        toll_count = len(toll_refs)
        parking_count = len(parking_refs)
        if toll_count > 0:
            duration_min = round(duration_min + toll_count * _TOLL_TIME_PENALTY_MIN, 1)

        with_tag_kg, without_tag_kg, carbon_saved, carbon_saved_pct = _route_carbon_scenarios(
            driving_co2_kg=carbon_kg,
            toll_count=toll_count,
            parking_count=parking_count,
            category=vehicle_category,
            fuel_type=fuel_type,
            engine=engine,
        )

        alternatives.append(
            RouteAlternative(
                route_index=idx,
                distance_km=distance_km,
                duration_min=duration_min,
                geometry=geometry,
                carbon_estimate_kg=with_tag_kg,
                benchmark_carbon_kg=without_tag_kg,
                carbon_with_tag_kg=with_tag_kg,
                carbon_without_tag_kg=without_tag_kg,
                carbon_saved_kg=carbon_saved,
                carbon_saved_pct=carbon_saved_pct,
                fuel_estimate_liters=fuel_liters,
                congestion_level=congestion,
                toll_places_on_route=toll_refs,
                parking_places_on_route=parking_refs,
            )
        )

    # Sort greenest first
    alternatives.sort(key=lambda r: r.carbon_estimate_kg)
    for i, alt in enumerate(alternatives):
        alt.route_index = i

    return RouteSuggestResponse(
        routes=alternatives,
        vehicle_fuel_type=fuel_type,
        origin_coords=origin_coords,
        destination_coords=dest_coords,
    )
