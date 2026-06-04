import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAZIL_CENTER } from "@/components/map";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  escapeMapPopupText,
  PARKING_MARKER_ICON,
  TOLL_MARKER_ICON,
} from "../../lib/map-place-markers";
import type { PlaceRef, RouteAlternative } from "../../api/types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
const ROUTE_COLORS = ["#72C215", "#F59E0B", "#EF4444"];
const MAX_ROUTES = 5; // upper bound for layer cleanup

type EcoRouteMapProps = {
  className?: string;
  routes?: RouteAlternative[];
  selectedRouteIndex?: number;
  originCoords?: [number, number];
  destinationCoords?: [number, number];
  originLabel?: string;
  destinationLabel?: string;
};

const PARKING_RADIUS_M = 2000;
const PARKING_RADIUS_SOURCE = "parking-radius";
const PARKING_RADIUS_FILL = "parking-radius-fill";
const PARKING_RADIUS_OUTLINE = "parking-radius-outline";

/** Generate a GeoJSON circle polygon (64 points) around [lng, lat] with radius in metres. */
function makeCircleGeoJSON(lng: number, lat: number, radiusM: number): GeoJSON.Feature {
  const points = 64;
  const earthRadius = 6371000;
  const coords: [number, number][] = [];
  for (let i = 0; i <= points; i++) {
    const angle = (i * 2 * Math.PI) / points;
    const dLat = (radiusM / earthRadius) * (180 / Math.PI);
    const dLng = dLat / Math.cos((lat * Math.PI) / 180);
    coords.push([lng + dLng * Math.sin(angle), lat + dLat * Math.cos(angle)]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

function clearAllRouteLayers(map: mapboxgl.Map) {
  for (let i = 0; i < MAX_ROUTES; i++) {
    const layerId = `route-line-${i}`;
    const sourceId = `route-${i}`;
    if (map.getLayer(layerId)) map.removeLayer(layerId);
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  }
  if (map.getLayer(PARKING_RADIUS_FILL)) map.removeLayer(PARKING_RADIUS_FILL);
  if (map.getLayer(PARKING_RADIUS_OUTLINE)) map.removeLayer(PARKING_RADIUS_OUTLINE);
  if (map.getSource(PARKING_RADIUS_SOURCE)) map.removeSource(PARKING_RADIUS_SOURCE);
  document.querySelectorAll(".eco-route-marker").forEach((el) => el.remove());
}

type PlaceMarkerKind = "toll" | "parking";

const PLACE_MARKER_STYLES: Record<
  PlaceMarkerKind,
  { color: string; label: string; iconSvg: string }
> = {
  toll: { color: "#dc2626", label: "Pedágio", iconSvg: TOLL_MARKER_ICON },
  parking: { color: "#2563eb", label: "Estacionamento", iconSvg: PARKING_MARKER_ICON },
};

function addPlaceMarker(
  map: mapboxgl.Map,
  place: PlaceRef,
  kind: PlaceMarkerKind,
) {
  const { color, label, iconSvg } = PLACE_MARKER_STYLES[kind];
  const el = document.createElement("div");
  el.className = "eco-route-marker";
  el.style.cssText = [
    `background:${color}`,
    "border:2px solid white",
    "border-radius:50%",
    "box-shadow:0 2px 6px rgba(0,0,0,0.35)",
    "cursor:pointer",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "width:28px",
    "height:28px",
  ].join(";");
  el.innerHTML = iconSvg;
  el.title = `${label}: ${place.name}`;
  const popup = new mapboxgl.Popup({ offset: 14, closeButton: false }).setHTML(
    `<div style="font-size:12px;max-width:180px;line-height:1.4">
      <b>${escapeMapPopupText(label)}</b><br/>
      ${escapeMapPopupText(place.name)}<br/>
      <span style="color:#666">${escapeMapPopupText(place.vicinity)}</span>
    </div>`,
  );
  new mapboxgl.Marker(el).setLngLat([place.longitude, place.latitude]).setPopup(popup).addTo(map);
}

function addEndpointMarker(
  map: mapboxgl.Map,
  coords: [number, number],
  color: string,
  label: string,
) {
  const el = document.createElement("div");
  el.className = "eco-route-marker eco-route-endpoint";
  el.style.cssText = [
    `background:${color}`,
    "border:2px solid white",
    "border-radius:50%",
    "box-shadow:0 2px 6px rgba(0,0,0,0.35)",
    "width:14px",
    "height:14px",
  ].join(";");
  const popup = new mapboxgl.Popup({ offset: 12, closeButton: false }).setHTML(
    `<div style="font-size:12px;max-width:220px;line-height:1.4">
      <b>${escapeMapPopupText(label)}</b>
    </div>`,
  );
  new mapboxgl.Marker(el).setLngLat(coords).setPopup(popup).addTo(map);
}

export const EcoRouteMap = ({
  className,
  routes = [],
  selectedRouteIndex = 0,
  originCoords,
  destinationCoords,
  originLabel,
  destinationLabel,
}: EcoRouteMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pendingDrawRef = useRef<(() => void) | null>(null);

  // Init map once
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: BRAZIL_CENTER,
      zoom: 4,
    });
    map.addControl(new mapboxgl.NavigationControl(), "bottom-left");

    map.once("load", () => {
      mapRef.current = map;
      map.resize();
      requestAnimationFrame(() => map.resize());
      if (pendingDrawRef.current) {
        pendingDrawRef.current();
        pendingDrawRef.current = null;
      }
    });

    const container = containerRef.current;
    const resizeObserver =
      container &&
      new ResizeObserver(() => {
        map.resize();
      });
    if (resizeObserver && container) {
      resizeObserver.observe(container);
    }

    return () => {
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw whenever routes or selection change
  useEffect(() => {
    if (routes.length === 0) return;

    const draw = () => {
      const map = mapRef.current;
      if (!map) return;

      clearAllRouteLayers(map);

      // Draw non-selected routes first (z-order: selected on top)
      const drawOrder = [...routes].sort((a, b) => {
        if (a.route_index === selectedRouteIndex) return 1;
        if (b.route_index === selectedRouteIndex) return -1;
        return 0;
      });

      drawOrder.forEach((route) => {
        const isSelected = route.route_index === selectedRouteIndex;
        const color = ROUTE_COLORS[route.route_index % ROUTE_COLORS.length] ?? "#72C215";

        map.addSource(`route-${route.route_index}`, {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: route.geometry },
        });
        map.addLayer({
          id: `route-line-${route.route_index}`,
          type: "line",
          source: `route-${route.route_index}`,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": color,
            "line-width": isSelected ? 5 : 3,
            "line-opacity": isSelected ? 1 : 0.45,
          },
        });
      });

      // Markers for selected route only
      const selected = routes.find((r) => r.route_index === selectedRouteIndex) ?? routes[0];
      if (selected) {
        selected.toll_places_on_route.forEach((p) => addPlaceMarker(map, p, "toll"));
        selected.parking_places_on_route.forEach((p) => addPlaceMarker(map, p, "parking"));
      }

      if (originCoords && originLabel) {
        addEndpointMarker(map, originCoords, "#16a34a", originLabel);
      }
      if (destinationCoords && destinationLabel) {
        addEndpointMarker(map, destinationCoords, "#2563eb", destinationLabel);
      }

      // Parking search radius circle around destination
      if (destinationCoords) {
        const [dLng, dLat] = destinationCoords;
        map.addSource(PARKING_RADIUS_SOURCE, {
          type: "geojson",
          data: makeCircleGeoJSON(dLng, dLat, PARKING_RADIUS_M),
        });
        map.addLayer({
          id: PARKING_RADIUS_FILL,
          type: "fill",
          source: PARKING_RADIUS_SOURCE,
          paint: { "fill-color": "#2563eb", "fill-opacity": 0.06 },
        });
        map.addLayer({
          id: PARKING_RADIUS_OUTLINE,
          type: "line",
          source: PARKING_RADIUS_SOURCE,
          paint: { "line-color": "#2563eb", "line-width": 1.5, "line-dasharray": [4, 3], "line-opacity": 0.5 },
        });
      }

      // Fit bounds
      const coords = selected?.geometry.coordinates as [number, number][] | undefined;
      if (coords && coords.length > 0) {
        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0]),
        );
        map.fitBounds(bounds, {
          padding: { top: 48, bottom: 48, left: 48, right: routes.length > 0 ? 340 : 48 },
          maxZoom: 14,
          duration: 800,
        });
      } else if (originCoords && destinationCoords) {
        map.fitBounds(new mapboxgl.LngLatBounds(originCoords, destinationCoords), {
          padding: { top: 48, bottom: 48, left: 48, right: 48 },
        });
      }
    };

    if (mapRef.current) {
      draw();
    } else {
      // Map not ready yet — queue for when it loads
      pendingDrawRef.current = draw;
    }
  }, [routes, selectedRouteIndex, originCoords, destinationCoords]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-3 border border-dashed border-neutral-300 bg-neutral-50 text-center",
          className,
        )}
      >
        <MapPin className="h-10 w-10 text-muted-foreground" />
        <p className="max-w-xs text-sm text-muted-foreground">
          Configure VITE_MAPBOX_ACCESS_TOKEN para visualizar o mapa
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("size-full min-h-[200px] overflow-hidden", className)}
    />
  );
};
