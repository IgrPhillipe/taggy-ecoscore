import { useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  CircleDollarSign,
  Clock,
  Fuel,
  Leaf,
  MapPin,
  Minus,
  ParkingCircle,
  Pencil,
  Route as RouteIcon,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatKpiCo2,
  formatKpiDistance,
  formatKpiDuration,
  formatKpiFuel,
} from "@/features/sustainability/lib/kpi";
import type { PlaceRef, RouteAlternative, RouteSuggestResponse } from "../../api/types";

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

function MetricTile({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-2.5 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 flex items-center gap-1 text-sm font-semibold tabular-nums",
          highlight ? "text-success" : "text-foreground",
        )}
      >
        {icon}
        {value}
      </p>
    </div>
  );
}

function PlacesAccordion({
  title,
  icon,
  places,
  defaultOpen = false,
}: {
  title: string;
  icon: ReactNode;
  places: PlaceRef[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!places.length) return null;

  return (
    <div className="overflow-hidden rounded-md border border-border/60 bg-background">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
      >
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
            {places.length}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          {open ? "Recolher" : "Expandir"}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
          />
        </span>
      </button>

      {open ? (
        <div className="border-t border-border/60 bg-muted/20">
          <ul className="max-h-40 divide-y divide-border/50 overflow-y-auto">
            {places.map((place) => (
              <li key={`${place.id}-${place.name}`} className="px-3 py-2.5">
                <p className="text-sm font-medium leading-snug text-foreground">{place.name}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                  {place.vicinity}
                </p>
                {place.payment_by_plate ? (
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-success">
                    <Tag className="h-3 w-3" />
                    Tag disponível
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

type RouteInfoCardProps = {
  route: RouteAlternative;
  isSelected: boolean;
  isBest: boolean;
  onSelect: () => void;
};

function RouteInfoCard({ route, isSelected, isBest, onSelect }: RouteInfoCardProps) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-shadow",
        isSelected
          ? "border-primary shadow-md ring-1 ring-primary/30"
          : "border-border hover:border-primary/30 hover:shadow-sm",
      )}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        className="cursor-pointer p-3 outline-none"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-sm font-bold text-foreground">
                Rota {route.route_index + 1}
              </span>
              {isBest ? (
                <span className="rounded-md bg-success/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-success">
                  Mais verde
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CongestionIcon level={route.congestion_level} />
              <span className={CONGESTION_COLORS[route.congestion_level]}>
                {CONGESTION_LABELS[route.congestion_level] ?? route.congestion_level}
              </span>
            </div>
          </div>

          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              isSelected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/40 bg-background",
            )}
            aria-hidden
          >
            {isSelected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <MetricTile
            label="Distância"
            value={formatKpiDistance(route.distance_km)}
            icon={<RouteIcon className="h-3.5 w-3.5 text-muted-foreground" />}
          />
          <MetricTile
            label="Duração"
            value={formatKpiDuration(route.duration_min)}
            icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />}
          />
          <MetricTile
            label="Combustível"
            value={formatKpiFuel(route.fuel_estimate_liters)}
            icon={<Fuel className="h-3.5 w-3.5 text-muted-foreground" />}
          />
          <MetricTile
            label="CO₂ estimado"
            value={formatKpiCo2(
              route.carbon_with_tag_kg ?? route.carbon_estimate_kg,
            )}
            icon={<Leaf className="h-3.5 w-3.5 text-success" />}
            highlight
          />
        </div>
      </div>

      {isSelected ? (
        <div className="space-y-2 border-t border-border px-3 pb-3 pt-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Locais Taggy no trajeto
          </p>
          <PlacesAccordion
            title="Pedágios"
            icon={<CircleDollarSign className="h-4 w-4 shrink-0 text-destructive" />}
            places={route.toll_places_on_route}
          />
          <PlacesAccordion
            title="Estacionamentos"
            icon={<ParkingCircle className="h-4 w-4 shrink-0 text-primary" />}
            places={route.parking_places_on_route}
          />
          {!route.toll_places_on_route.length &&
          !route.parking_places_on_route.length ? (
            <p className="text-xs text-muted-foreground">
              Nenhum pedágio ou estacionamento Taggy nesta rota.
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

type RouteAlternativesPanelProps = {
  result: RouteSuggestResponse;
  originLabel?: string;
  destinationLabel?: string;
  selectedRouteIndex: number;
  onSelectRoute: (index: number) => void;
  onEditStops: () => void;
};

export const RouteAlternativesPanel = ({
  result,
  originLabel,
  destinationLabel,
  selectedRouteIndex,
  onSelectRoute,
  onEditStops,
}: RouteAlternativesPanelProps) => {
  const selected = result.routes[selectedRouteIndex] ?? result.routes[0];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-2 border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">Rotas no trajeto</p>
        <p className="text-xs text-muted-foreground">
          {result.routes.length === 1
            ? "1 opção encontrada"
            : `${result.routes.length} opções encontradas`}
        </p>
        {originLabel || destinationLabel ? (
          <div className="space-y-1 rounded-lg bg-muted/40 px-2.5 py-2 text-xs">
            {originLabel ? (
              <p className="flex gap-1.5 leading-snug text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                <span>
                  <span className="font-medium text-foreground">De: </span>
                  {originLabel}
                </span>
              </p>
            ) : null}
            {destinationLabel ? (
              <p className="flex gap-1.5 leading-snug text-muted-foreground">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span>
                  <span className="font-medium text-foreground">Para: </span>
                  {destinationLabel}
                </span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {result.routes.map((route) => (
          <RouteInfoCard
            key={route.route_index}
            route={route}
            isSelected={route.route_index === selectedRouteIndex}
            isBest={route.route_index === 0}
            onSelect={() => onSelectRoute(route.route_index)}
          />
        ))}
      </div>

      <div className="shrink-0 space-y-2 border-t border-border p-3">
        {selected ? (
          <Button
            type="button"
            className="w-full"
            onClick={() => {
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${result.destination_coords[1]},${result.destination_coords[0]}`,
                "_blank",
              );
            }}
          >
            Iniciar rota no Maps
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onEditStops}
        >
          <Pencil className="mr-2 h-4 w-4" />
          Alterar origem e destino
        </Button>
      </div>
    </div>
  );
};
