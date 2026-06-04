import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { MapPin } from "lucide-react";

import "mapbox-gl/dist/mapbox-gl.css";

import {
  useEmissionsByUF,
  type EmissionsByUFItem,
} from "@/features/dashboard/hooks/useEmissionsByUF";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as
  | string
  | undefined;
const BRAZIL_CENTER: [number, number] = [-52, -14];
const TAGGY_GREEN = "#72C215";
const EMPTY_COLOR = "#e5e7eb";

const BRAZIL_STATES_GEOJSON_URL =
  "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

type Props = {
  organizationId?: number;
};

function interpolateColor(from: string, to: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(from);
  const [r2, g2, b2] = parse(to);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

function buildColorExpression(
  items: EmissionsByUFItem[],
): string | mapboxgl.Expression {
  if (items.length === 0) return EMPTY_COLOR;

  const max = Math.max(...items.map((i) => i.co2_total_kg));
  const pairs: (string | mapboxgl.Expression)[] = [];

  for (const item of items) {
    const intensity = max > 0 ? item.co2_total_kg / max : 0;
    pairs.push(item.uf.toUpperCase());
    pairs.push(interpolateColor(EMPTY_COLOR, TAGGY_GREEN, intensity));
  }

  return [
    "match",
    ["get", "uf"],
    ...pairs,
    EMPTY_COLOR,
  ] as mapboxgl.Expression;
}

const SOURCE_ID = "taggy-brazil-states";
const LAYER_FILL_ID = "taggy-brazil-fill";
const LAYER_LINE_ID = "taggy-brazil-line";
const LAYER_HIT_ID = "taggy-brazil-hit";

export const RegionalEmissionsMap = ({ organizationId }: Props) => {
  const { data: items = [] } = useEmissionsByUF({ organizationId });

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);
  const mapLoadedRef = useRef(false);
  const itemsRef = useRef<EmissionsByUFItem[]>(items);
  itemsRef.current = items;

  function applyColors(map: mapboxgl.Map) {
    if (!map.getLayer(LAYER_FILL_ID)) return;
    map.setPaintProperty(
      LAYER_FILL_ID,
      "fill-color",
      buildColorExpression(itemsRef.current),
    );
  }

  useEffect(() => {
    if (!MAPBOX_TOKEN || !mapContainerRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: BRAZIL_CENTER,
      zoom: 3.2,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    popupRef.current = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
    });

    map.on("load", () => {
      mapLoadedRef.current = true;

      fetch(BRAZIL_STATES_GEOJSON_URL)
        .then((r) => r.json())
        .then((geojson: GeoJSON.FeatureCollection) => {
          // `sigla` already contains UF code (e.g. "SP", "RJ")
          const enriched: GeoJSON.FeatureCollection = {
            ...geojson,
            features: geojson.features.map((f) => ({
              ...f,
              properties: {
                ...f.properties,
                uf: (f.properties?.sigla as string | undefined)?.toUpperCase() ?? null,
              },
            })),
          };

          if (!mapRef.current) return;

          map.addSource(SOURCE_ID, { type: "geojson", data: enriched });

          map.addLayer({
            id: LAYER_FILL_ID,
            type: "fill",
            source: SOURCE_ID,
            paint: {
              "fill-color": buildColorExpression(itemsRef.current),
              "fill-opacity": 0.85,
            },
          });

          map.addLayer({
            id: LAYER_LINE_ID,
            type: "line",
            source: SOURCE_ID,
            paint: {
              "line-color": "#aaa",
              "line-width": 0.5,
            },
          });

          map.addLayer({
            id: LAYER_HIT_ID,
            type: "fill",
            source: SOURCE_ID,
            paint: {
              "fill-color": "rgba(0,0,0,0)",
              "fill-opacity": 0,
            },
          });

          map.on("mousemove", LAYER_HIT_ID, (e) => {
            map.getCanvas().style.cursor = "pointer";
            const feature = e.features?.[0];
            if (!feature) return;

            const uf = feature.properties?.uf as string | null;
            const dataMap = Object.fromEntries(
              itemsRef.current.map((i) => [i.uf.toUpperCase(), i]),
            );
            const entry = uf ? dataMap[uf] : undefined;
            const name =
              (feature.properties?.name as string | undefined) ?? uf ?? "–";
            const co2 = entry
              ? `${entry.co2_total_kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg CO₂`
              : "Sem dados";
            const txLine = entry
              ? `<br/>${entry.transaction_count.toLocaleString("pt-BR")} transações`
              : "";

            popupRef.current
              ?.setLngLat(e.lngLat)
              .setHTML(
                `<div style="font-size:12px;line-height:1.6">
                  <strong>${uf ?? name}</strong><br/>
                  ${co2}${txLine}
                </div>`,
              )
              .addTo(map);
          });

          map.on("mouseleave", LAYER_HIT_ID, () => {
            map.getCanvas().style.cursor = "";
            popupRef.current?.remove();
          });

          // Apply colors in case items already arrived before fetch completed
          applyColors(map);
        });
    });

    mapRef.current = map;

    return () => {
      mapLoadedRef.current = false;
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply colors whenever items update (handles async load after map ready)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoadedRef.current) return;
    applyColors(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const maxCo2 =
    items.length > 0 ? Math.max(...items.map((i) => i.co2_total_kg)) : 0;

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex min-h-[320px] flex-col gap-4 rounded border border-neutral-300 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Emissões & Eficiência por Região
        </p>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded border border-dashed border-neutral-300 bg-neutral-50 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground" />
          <p className="max-w-xs text-sm text-muted-foreground">Em Breve</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[320px] flex-col gap-4 rounded border border-neutral-300 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
        Emissões & Eficiência por Região
      </p>

      <div
        ref={mapContainerRef}
        className="min-h-[280px] flex-1 overflow-hidden rounded-md"
      />

      {items.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span>0 kg</span>
          <div
            className="h-2 flex-1 rounded"
            style={{
              background: `linear-gradient(to right, ${EMPTY_COLOR}, ${TAGGY_GREEN})`,
            }}
          />
          <span>
            {maxCo2.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} kg
            CO₂
          </span>
        </div>
      )}
    </div>
  );
};
