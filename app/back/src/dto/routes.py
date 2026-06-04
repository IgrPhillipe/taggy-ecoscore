from pydantic import BaseModel


class PlaceRef(BaseModel):
    id: int
    name: str
    vicinity: str
    latitude: float
    longitude: float
    payment_by_plate: bool


class RouteAlternative(BaseModel):
    route_index: int
    distance_km: float
    duration_min: float
    geometry: dict  # GeoJSON LineString
    carbon_estimate_kg: float
    benchmark_carbon_kg: float
    carbon_saved_kg: float
    carbon_saved_pct: float
    fuel_estimate_liters: float
    congestion_level: str  # "low" | "moderate" | "heavy"
    toll_places_on_route: list[PlaceRef]
    parking_places_on_route: list[PlaceRef]


class RouteSuggestRequest(BaseModel):
    origin: str | dict       # text address or {"lat": float, "lng": float}
    destination: str | dict  # text address or {"lat": float, "lng": float}


class RouteSuggestResponse(BaseModel):
    routes: list[RouteAlternative]
    vehicle_fuel_type: str
    origin_coords: list[float]       # [lng, lat]
    destination_coords: list[float]  # [lng, lat]
