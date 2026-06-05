import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import { cn } from "@/lib/utils";
import type { RouteStop } from "../../lib/route-location";
import { AddressField } from "../AddressField";

type DestinationSearchPanelProps = {
  origin: RouteStop | null;
  destination: RouteStop | null;
  originInput: string;
  destinationInput: string;
  onOriginInputChange: (text: string) => void;
  onDestinationInputChange: (text: string) => void;
  onOriginSelect: (stop: RouteStop) => void;
  onDestinationSelect: (stop: RouteStop) => void;
  onOriginClear: () => void;
  onDestinationClear: () => void;
  onUseCurrentLocation: () => Promise<void>;
  onSearch: () => void;
  isLoading?: boolean;
  errorMessage?: string;
  compact?: boolean;
};

export const DestinationSearchPanel = ({
  origin,
  destination,
  originInput,
  destinationInput,
  onOriginInputChange,
  onDestinationInputChange,
  onOriginSelect,
  onDestinationSelect,
  onOriginClear,
  onDestinationClear,
  onUseCurrentLocation,
  onSearch,
  isLoading = false,
  errorMessage,
  compact = false,
}: DestinationSearchPanelProps) => {
  const [geoLoading, setGeoLoading] = useState(false);

  const canSearch = Boolean(origin && destination);

  const handleUseLocation = async () => {
    setGeoLoading(true);
    try {
      await onUseCurrentLocation();
    } finally {
      setGeoLoading(false);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (canSearch && !isLoading) onSearch();
  };

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-3", compact && "p-4")}>
      {!compact ? (
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Calcular rota ecológica
          </h2>
          <p className="text-sm text-muted-foreground">
            Compare rotas e economize emissões
          </p>
        </div>
      ) : (
        <p className="text-sm font-semibold text-foreground">Origem e destino</p>
      )}

      <div className="space-y-3">
        <div className="flex gap-2">
          <AddressField
            id="route-origin"
            label="Origem"
            icon={<MapPin className="h-4 w-4" />}
            placeholder="Busque um endereço..."
            inputValue={originInput}
            resolved={origin}
            onInputChange={onOriginInputChange}
            onSelectStop={onOriginSelect}
            onClear={onOriginClear}
            className="min-w-0 flex-1"
          />
          <div className="flex shrink-0 flex-col justify-end">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleUseLocation}
              disabled={geoLoading}
              title="Usar minha localização"
              className={cn("h-9 w-9", origin && "border-success text-success")}
            >
              {geoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crosshair className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <AddressField
          id="route-destination"
          label="Destino"
          icon={<Search className="h-4 w-4" />}
          placeholder="Busque um endereço..."
          inputValue={destinationInput}
          resolved={destination}
          onInputChange={onDestinationInputChange}
          onSelectStop={onDestinationSelect}
          onClear={onDestinationClear}
        />
      </div>

      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}

      <Button type="submit" className="w-full" disabled={!canSearch || isLoading}>
        <ButtonLoadingContent loading={isLoading}>
          Buscar Rotas
        </ButtonLoadingContent>
      </Button>
    </form>
  );
};
