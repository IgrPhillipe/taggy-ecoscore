import type { ReactNode } from "react";
import { CircleDollarSign, ParkingCircle, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlaceRef } from "../../api/types";

type RoutePlacesListProps = {
  tolls: PlaceRef[];
  parking: PlaceRef[];
  className?: string;
};

function PlaceListBlock({
  title,
  icon,
  places,
  accentClass,
  iconClass,
}: {
  title: string;
  icon: ReactNode;
  places: PlaceRef[];
  accentClass: string;
  iconClass: string;
}) {
  if (!places.length) return null;

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className={cn("flex items-center gap-2 rounded-t-lg border-b px-3 py-2", accentClass)}>
        <span className={iconClass}>{icon}</span>
        <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">{title}</p>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {places.length}
        </Badge>
      </div>
      <ul className="max-h-40 divide-y divide-border overflow-y-auto">
        {places.map((place) => (
          <li key={`${place.id}-${place.name}`} className="px-3 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">{place.name}</p>
            <p className="truncate text-xs text-muted-foreground">{place.vicinity}</p>
            {place.payment_by_plate ? (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">
                <Tag className="h-3 w-3" />
                Tag disponível
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoutePlacesList({ tolls, parking, className }: RoutePlacesListProps) {
  if (!tolls.length && !parking.length) return null;

  return (
    <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      <PlaceListBlock
        title="Pedágios na rota"
        icon={<CircleDollarSign className="h-4 w-4" />}
        places={tolls}
        accentClass="bg-destructive/5"
        iconClass="text-destructive"
      />
      <PlaceListBlock
        title="Estacionamentos no destino"
        icon={<ParkingCircle className="h-4 w-4" />}
        places={parking}
        accentClass="bg-primary/5"
        iconClass="text-primary"
      />
    </div>
  );
}
