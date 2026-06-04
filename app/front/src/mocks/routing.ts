import type { RouteSuggestResponse, RouteAlternative } from "@/features/routing/api/types";

const MOCK_DESTINATIONS: Record<
  string,
  { distanceKm: number; durationMin: number; lat: number; lng: number }
> = {
  "são paulo": { distanceKm: 45, durationMin: 55, lat: -23.55, lng: -46.63 },
  "rio de janeiro": { distanceKm: 430, durationMin: 360, lat: -22.9, lng: -43.17 },
  "belo horizonte": { distanceKm: 440, durationMin: 330, lat: -19.92, lng: -43.94 },
  "curitiba": { distanceKm: 410, durationMin: 300, lat: -25.42, lng: -49.27 },
  "brasília": { distanceKm: 15, durationMin: 25, lat: -15.78, lng: -47.93 },
  campinas: { distanceKm: 95, durationMin: 75, lat: -22.91, lng: -47.06 },
};

function hashDestination(destination: string): number {
  let hash = 0;
  for (let i = 0; i < destination.length; i++) {
    hash = (hash << 5) - hash + destination.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function resolveRouteMetrics(destination: string) {
  const normalized = destination.trim().toLowerCase();
  const known = MOCK_DESTINATIONS[normalized];
  if (known) return known;
  const hash = hashDestination(normalized);
  return {
    distanceKm: 20 + (hash % 180),
    durationMin: 15 + (hash % 240),
    lat: -23.0 + (hash % 10) * 0.1,
    lng: -46.0 - (hash % 10) * 0.1,
  };
}

function makeRoute(
  index: number,
  distanceKm: number,
  durationMin: number,
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number,
  carbonFactor: number,
  congestion: "low" | "moderate" | "heavy",
): RouteAlternative {
  const drivingKg = Number((distanceKm * carbonFactor).toFixed(2));
  const withoutTagKg = Number((drivingKg * 1.12).toFixed(2));
  const withTagKg = drivingKg;
  const carbonSavedKg = Number(Math.max(withoutTagKg - withTagKg, 0).toFixed(2));
  const carbonSavedPct = withoutTagKg > 0
    ? Math.round((carbonSavedKg / withoutTagKg) * 100)
    : 0;
  const fuelEstimateLiters = Number((distanceKm / 12).toFixed(2));

  return {
    route_index: index,
    distance_km: distanceKm,
    duration_min: durationMin,
    geometry: {
      type: "LineString",
      coordinates: [
        [originLng, originLat],
        [(originLng + destLng) / 2, (originLat + destLat) / 2],
        [destLng, destLat],
      ],
    },
    carbon_estimate_kg: withTagKg,
    benchmark_carbon_kg: withoutTagKg,
    carbon_with_tag_kg: withTagKg,
    carbon_without_tag_kg: withoutTagKg,
    carbon_saved_kg: carbonSavedKg,
    carbon_saved_pct: carbonSavedPct,
    fuel_estimate_liters: fuelEstimateLiters,
    congestion_level: congestion,
    toll_places_on_route: [],
    parking_places_on_route: [],
  };
}

export async function mockSuggestRoute(
  destination: string,
): Promise<RouteSuggestResponse> {
  await new Promise((resolve) => setTimeout(resolve, 700));

  const { distanceKm, durationMin, lat: destLat, lng: destLng } =
    resolveRouteMetrics(destination);

  const originLng = -47.9;
  const originLat = -15.8;

  const routes: RouteAlternative[] = [
    makeRoute(0, distanceKm, durationMin, originLng, originLat, destLng, destLat, 0.14, "low"),
    makeRoute(
      1,
      Math.round(distanceKm * 1.12),
      Math.round(durationMin * 0.92),
      originLng,
      originLat,
      destLng,
      destLat,
      0.14,
      "moderate",
    ),
  ];

  if (distanceKm > 50) {
    routes.push(
      makeRoute(
        2,
        Math.round(distanceKm * 1.25),
        Math.round(durationMin * 1.1),
        originLng,
        originLat,
        destLng,
        destLat,
        0.21,
        "heavy",
      ),
    );
  }

  return {
    routes,
    vehicle_fuel_type: "gasolina_c",
    origin_coords: [originLng, originLat],
    destination_coords: [destLng, destLat],
  };
}
