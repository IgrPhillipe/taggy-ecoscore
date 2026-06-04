import { AlertTriangle, CheckCircle, Clock, Leaf, Minus, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatKpiCo2,
  formatKpiDistance,
  formatKpiDuration,
} from "@/features/sustainability/lib/kpi";
import type { RouteAlternative, RouteSuggestResponse } from "../../api/types";

const CONGESTION_LABELS: Record<string, string> = {
  low: "Trânsito livre",
  moderate: "Trânsito moderado",
  heavy: "Trânsito intenso",
};

const CONGESTION_COLORS: Record<string, string> = {
  low: "text-green-600",
  moderate: "text-yellow-600",
  heavy: "text-red-600",
};

function CongestionIcon({ level }: { level: string }) {
  if (level === "low") return <CheckCircle className="h-3.5 w-3.5 text-green-600" />;
  if (level === "heavy") return <AlertTriangle className="h-3.5 w-3.5 text-red-600" />;
  return <Minus className="h-3.5 w-3.5 text-yellow-600" />;
}

type RouteAlternativeCardProps = {
  route: RouteAlternative;
  isSelected: boolean;
  isBest: boolean;
  onSelect: () => void;
};

const RouteAlternativeCard = ({
  route,
  isSelected,
  isBest,
  onSelect,
}: RouteAlternativeCardProps) => (
  <button
    type="button"
    onClick={onSelect}
    className={cn(
      "w-full rounded-xl border-2 p-3 text-left transition-all",
      isSelected
        ? "border-primary bg-primary/5"
        : "border-neutral-200 bg-white hover:border-primary/40",
    )}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          {isBest && (
            <span className="rounded-full bg-[#72C215]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4a8a00]">
              Mais econômica
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            Rota {route.route_index + 1}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-3 text-sm font-medium">
          <span className="flex items-center gap-1">
            <Route className="h-3.5 w-3.5 text-muted-foreground" />
            {formatKpiDistance(route.distance_km)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            {formatKpiDuration(route.duration_min)}
          </span>
        </div>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <CongestionIcon level={route.congestion_level} />
          <span className={CONGESTION_COLORS[route.congestion_level]}>
            {CONGESTION_LABELS[route.congestion_level] ?? route.congestion_level}
          </span>
        </div>

        {route.toll_places_on_route.length > 0 && (
          <span className="text-[11px] text-muted-foreground">
            {route.toll_places_on_route.length} pedágio
            {route.toll_places_on_route.length > 1 ? "s" : ""} na rota
          </span>
        )}
      </div>

      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1 rounded-lg bg-[#72C215]/10 px-2 py-1">
          <Leaf className="h-3.5 w-3.5 text-[#72C215]" />
          <span className="text-sm font-bold text-[#4a8a00]">
            -{route.carbon_saved_pct}%
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {formatKpiCo2(route.carbon_estimate_kg)} CO₂
        </span>
      </div>
    </div>
  </button>
);

type RouteAlternativesPanelProps = {
  result: RouteSuggestResponse;
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
  onEditDestination: () => void;
};

export const RouteAlternativesPanel = ({
  result,
  selectedRouteIndex,
  onSelectRoute,
  onEditDestination,
}: RouteAlternativesPanelProps) => {
  const selected = result.routes[selectedRouteIndex] ?? result.routes[0];

  return (
    <div className="space-y-3">
      <div className="space-y-0.5">
        <h2 className="text-lg font-bold text-foreground">Escolha sua rota</h2>
        <p className="text-sm text-muted-foreground">
          {result.routes.length} rota{result.routes.length > 1 ? "s" : ""} disponível
          {result.routes.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {result.routes.map((route) => (
          <RouteAlternativeCard
            key={route.route_index}
            route={route}
            isSelected={route.route_index === selectedRouteIndex}
            isBest={route.route_index === 0}
            onSelect={() => onSelectRoute(route.route_index)}
          />
        ))}
      </div>

      {selected && (
        <Button
          type="button"
          className="w-full"
          onClick={() => {
            // TODO: deep-link to native maps with coords
            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${result.destination_coords[1]},${result.destination_coords[0]}`,
              "_blank",
            );
          }}
        >
          Iniciar rota no Maps
        </Button>
      )}

      <button
        type="button"
        onClick={onEditDestination}
        className="w-full text-center text-sm font-medium text-primary hover:underline"
      >
        Alterar destino
      </button>
    </div>
  );
};
