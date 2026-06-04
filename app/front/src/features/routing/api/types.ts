export type PlaceRef = {
  id: number;
  name: string;
  vicinity: string;
  latitude: number;
  longitude: number;
  payment_by_plate: boolean;
};

export type RouteAlternative = {
  route_index: number;
  distance_km: number;
  duration_min: number;
  geometry: GeoJSON.LineString;
  carbon_estimate_kg: number;
  benchmark_carbon_kg: number;
  carbon_with_tag_kg: number;
  carbon_without_tag_kg: number;
  carbon_saved_kg: number;
  carbon_saved_pct: number;
  fuel_estimate_liters: number;
  congestion_level: "low" | "moderate" | "heavy";
  toll_places_on_route: PlaceRef[];
  parking_places_on_route: PlaceRef[];
};

export type RouteSuggestRequest = {
  origin: string | { lat: number; lng: number };
  destination: string | { lat: number; lng: number };
};

export type RouteSuggestResponse = {
  routes: RouteAlternative[];
  vehicle_fuel_type: string;
  origin_coords: [number, number];
  destination_coords: [number, number];
};

/** @deprecated use RouteSuggestResponse */
export type RouteEstimate = {
  destination: string;
  distanceKm: number;
  durationMin: number;
  carbonEstimateKg: number;
  benchmarkCarbonKg: number;
  carbonSavedKg: number;
  carbonSavedPct: number;
  fuelSavedLiters: number;
};
