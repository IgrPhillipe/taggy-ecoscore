import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAddressSuggestions, retrieveSuggestionCoords, type AddressSuggestion } from "../../hooks/useAddressSuggestions";

type GeoCoords = { lat: number; lng: number };

type DestinationSearchPanelProps = {
  origin: string | GeoCoords;
  onOriginChange: (value: string | GeoCoords) => void;
  destination: string | GeoCoords;
  onDestinationChange: (value: string | GeoCoords) => void;
  onSearch: () => void;
  isLoading?: boolean;
  errorMessage?: string;
};

function SuggestionsList({
  suggestions,
  onSelect,
}: {
  suggestions: AddressSuggestion[];
  onSelect: (s: AddressSuggestion) => void;
}) {
  if (!suggestions.length) return null;
  return (
    <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
      {suggestions.map((s, i) => (
        <li
          key={i}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(s);
          }}
          className="cursor-pointer px-3 py-2 hover:bg-accent hover:text-accent-foreground"
        >
          <p className="truncate text-sm font-medium">{s.display_name}</p>
          {s.subtitle && (
            <p className="truncate text-xs text-muted-foreground">{s.subtitle}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

export const DestinationSearchPanel = ({
  origin,
  onOriginChange,
  destination,
  onDestinationChange,
  onSearch,
  isLoading = false,
  errorMessage,
}: DestinationSearchPanelProps) => {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string>();
  const [originFocused, setOriginFocused] = useState(false);
  const [destFocused, setDestFocused] = useState(false);

  const originText = typeof origin === "string" ? origin : "";
  const isOriginGeo = typeof origin !== "string";

  const destText = typeof destination === "string" ? destination : "";
  const isDestGeo = typeof destination !== "string";

  const { suggestions: originSuggestions, clear: clearOrigin } = useAddressSuggestions(
    originFocused && !isOriginGeo ? originText : "",
  );
  const { suggestions: destSuggestions, clear: clearDest } = useAddressSuggestions(
    destFocused && !isDestGeo ? destText : "",
  );

  const originFilled = isOriginGeo || originText.trim().length > 0;
  const destFilled = isDestGeo || destText.trim().length > 0;
  const canSearch = originFilled && destFilled;

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocalização não suportada pelo navegador.");
      return;
    }
    setGeoLoading(true);
    setGeoError(undefined);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onOriginChange({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLoading(false);
      },
      () => {
        setGeoError("Não foi possível obter sua localização.");
        setGeoLoading(false);
      },
      { timeout: 8000 },
    );
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (canSearch && !isLoading) onSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-bold text-foreground">Calcular rota ecológica</h2>
        <p className="text-sm text-muted-foreground">Compare rotas e economize emissões</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Origin */}
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Origem
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={isOriginGeo ? "" : originText}
                onChange={(e) => onOriginChange(e.target.value)}
                onFocus={() => setOriginFocused(true)}
                onBlur={() => setOriginFocused(false)}
                placeholder="Endereço de origem"
                className={cn("pl-9", isOriginGeo && "bg-green-50 text-green-800 placeholder:text-green-700")}
                readOnly={isOriginGeo}
              />
              {isOriginGeo && (
                <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 truncate text-sm text-green-700">
                  Minha localização
                </span>
              )}
              {!isOriginGeo && originFocused && (
                <SuggestionsList
                  suggestions={originSuggestions}
                  onSelect={async (s) => {
                    clearOrigin();
                    if (s.lat !== null && s.lon !== null) {
                      onOriginChange({ lat: s.lat, lng: s.lon });
                    } else if (s.mapbox_id) {
                      const coords = await retrieveSuggestionCoords(s.mapbox_id);
                      if (coords) onOriginChange({ lat: coords.lat, lng: coords.lon });
                    }
                  }}
                />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleUseLocation}
              disabled={geoLoading}
              title="Usar minha localização"
              className={cn("shrink-0", isOriginGeo && "border-green-500 text-green-600")}
            >
              {geoLoading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Crosshair className="h-4 w-4" />
              }
            </Button>
          </div>
          {geoError && <p className="text-xs text-destructive">{geoError}</p>}
        </div>

        {/* Destination */}
        <div className="min-w-0 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Destino
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={isDestGeo ? "" : destText}
              onChange={(e) => onDestinationChange(e.target.value)}
              onFocus={() => setDestFocused(true)}
              onBlur={() => setDestFocused(false)}
              placeholder="Para onde você vai?"
              className={cn("pl-9", isDestGeo && "bg-blue-50 text-blue-800 placeholder:text-blue-700")}
              readOnly={isDestGeo}
            />
            {isDestGeo && (
              <span className="pointer-events-none absolute left-9 top-1/2 -translate-y-1/2 truncate text-sm text-blue-700">
                Local selecionado
              </span>
            )}
            {!isDestGeo && destFocused && (
              <SuggestionsList
                suggestions={destSuggestions}
                onSelect={async (s) => {
                  clearDest();
                  if (s.lat !== null && s.lon !== null) {
                    onDestinationChange({ lat: s.lat, lng: s.lon });
                  } else if (s.mapbox_id) {
                    const coords = await retrieveSuggestionCoords(s.mapbox_id);
                    if (coords) onDestinationChange({ lat: coords.lat, lng: coords.lon });
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <Button type="submit" className="w-full" disabled={!canSearch || isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Calculando rotas...
          </>
        ) : (
          "Ver rotas ecológicas"
        )}
      </Button>
    </form>
  );
};
