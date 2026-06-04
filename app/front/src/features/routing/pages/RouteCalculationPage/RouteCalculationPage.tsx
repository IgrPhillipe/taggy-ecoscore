import { useState } from "react";
import { RouteBottomPanel } from "../../components/RouteBottomPanel";
import { DestinationSearchPanel } from "../../components/DestinationSearchPanel";
import { RouteAlternativesPanel } from "../../components/RouteAlternativesPanel";
import { EcoRouteMap } from "../../components/EcoRouteMap";
import { useSuggestRoute } from "../../hooks/useSuggestRoute";
import type { RouteSuggestResponse } from "../../api/types";

type RouteStep = "search" | "results";
type GeoCoords = { lat: number; lng: number };

export const RouteCalculationPage = () => {
  const [step, setStep] = useState<RouteStep>("search");
  const [origin, setOrigin] = useState<string | GeoCoords>("");
  const [destination, setDestination] = useState<string | GeoCoords>("");
  const [result, setResult] = useState<RouteSuggestResponse | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [validationError, setValidationError] = useState<string>();

  const suggestRoute = useSuggestRoute();

  const handleSearch = () => {
    const destFilled =
      typeof destination !== "string" || destination.trim().length > 0;
    const originFilled =
      typeof origin !== "string" || origin.trim().length > 0;

    if (!destFilled || !originFilled) {
      setValidationError("Preencha a origem e o destino para continuar.");
      return;
    }

    setValidationError(undefined);
    suggestRoute.mutate(
      { origin, destination: typeof destination === "string" ? destination.trim() : destination },
      {
        onSuccess: (data) => {
          setResult(data);
          setSelectedRouteIndex(0);
          setStep("results");
        },
        onError: () => {
          setValidationError("Não foi possível calcular a rota. Tente novamente.");
        },
      },
    );
  };

  const handleEditDestination = () => {
    setStep("search");
    setResult(null);
    suggestRoute.reset();
  };

  const originCoords: [number, number] | undefined = result
    ? [result.origin_coords[0], result.origin_coords[1]]
    : undefined;

  const destinationCoords: [number, number] | undefined = result
    ? [result.destination_coords[0], result.destination_coords[1]]
    : undefined;

  return (
    <div className="-m-4 flex min-h-[calc(100dvh-4rem)] flex-col md:-m-8">
      <RouteBottomPanel>
        {step === "search" ? (
          <DestinationSearchPanel
            origin={origin}
            onOriginChange={(value) => {
              setOrigin(value);
              if (validationError) setValidationError(undefined);
            }}
            destination={destination}
            onDestinationChange={(value) => {
              setDestination(value);
              if (validationError) setValidationError(undefined);
            }}
            onSearch={handleSearch}
            isLoading={suggestRoute.isPending}
            errorMessage={validationError}
          />
        ) : result ? (
          <RouteAlternativesPanel
            result={result}
            selectedRouteIndex={selectedRouteIndex}
            onSelectRoute={setSelectedRouteIndex}
            onEditDestination={handleEditDestination}
          />
        ) : null}
      </RouteBottomPanel>

      <EcoRouteMap
        className="min-h-0 flex-1"
        routes={result?.routes}
        selectedRouteIndex={selectedRouteIndex}
        originCoords={originCoords}
        destinationCoords={destinationCoords}
      />
    </div>
  );
};
