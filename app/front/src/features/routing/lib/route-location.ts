import { createParser } from "nuqs";

export type RouteStop = {
  lat: number;
  lng: number;
  label: string;
};

export function formatSuggestionLabel(
  displayName: string,
  subtitle?: string,
): string {
  if (!subtitle) return displayName;
  return `${displayName}, ${subtitle}`;
}

export function routeStopToApiValue(stop: RouteStop): { lat: number; lng: number } {
  return { lat: stop.lat, lng: stop.lng };
}

function parseCoordsPart(part: string): { lat: number; lng: number } | null {
  const [latRaw, lngRaw] = part.split(",");
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export const parseAsRouteStop = createParser<RouteStop>({
  parse(query) {
    if (!query) return null;
    const pipeIndex = query.indexOf("|");
    const coordsPart = pipeIndex >= 0 ? query.slice(0, pipeIndex) : query;
    const labelPart = pipeIndex >= 0 ? query.slice(pipeIndex + 1) : "";
    const coords = parseCoordsPart(coordsPart);
    if (!coords) return null;
    let label = "";
    try {
      label = labelPart ? decodeURIComponent(labelPart) : "";
    } catch {
      label = labelPart;
    }
    if (!label.trim()) {
      label = `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
    }
    return { ...coords, label };
  },
  serialize(stop) {
    const label = encodeURIComponent(stop.label);
    return `${stop.lat},${stop.lng}|${label}`;
  },
});
