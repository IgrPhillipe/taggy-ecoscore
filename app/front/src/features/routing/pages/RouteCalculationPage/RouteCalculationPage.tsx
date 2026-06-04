import { DestinationSearchPanel } from "../../components/DestinationSearchPanel";
import { RouteAlternativesPanel } from "../../components/RouteAlternativesPanel";
import { EcoRouteMap } from "../../components/EcoRouteMap";
import { RouteSidePanel } from "../../components/RouteSidePanel";
import { useRoutePageState } from "../../hooks/useRoutePageState";

export const RouteCalculationPage = () => {
  const {
    origin,
    destination,
    originInput,
    destinationInput,
    routeIndex,
    result,
    validationError,
    suggestRoute,
    setOriginStop,
    setDestinationStop,
    handleOriginInputChange,
    handleDestinationInputChange,
    handleUseCurrentLocation,
    handleSearch,
    selectRouteIndex,
    handleEditStops,
  } = useRoutePageState();

  const originCoords: [number, number] | undefined = result
    ? [result.origin_coords[0], result.origin_coords[1]]
    : origin
      ? [origin.lng, origin.lat]
      : undefined;

  const destinationCoords: [number, number] | undefined = result
    ? [result.destination_coords[0], result.destination_coords[1]]
    : destination
      ? [destination.lng, destination.lat]
      : undefined;

  const showRoutes = Boolean(result?.routes.length);
  const showSearchForm = !showRoutes;

  return (
    <div className="relative -m-4 h-[calc(100dvh-7.5rem)] min-h-[32rem] overflow-hidden md:-m-8">
      <EcoRouteMap
        className="absolute inset-0 size-full"
        routes={result?.routes}
        selectedRouteIndex={routeIndex}
        originCoords={originCoords}
        destinationCoords={destinationCoords}
        originLabel={origin?.label}
        destinationLabel={destination?.label}
      />

      <aside className="pointer-events-none absolute inset-y-3 right-3 z-20 flex max-h-[calc(100%-1.5rem)] w-[min(100%-1.5rem,20rem)] flex-col gap-3 sm:w-80">
        {showSearchForm ? (
          <RouteSidePanel className="shrink-0 overflow-visible">
            <DestinationSearchPanel
              compact
              origin={origin}
              destination={destination}
              originInput={originInput}
              destinationInput={destinationInput}
              onOriginInputChange={handleOriginInputChange}
              onDestinationInputChange={handleDestinationInputChange}
              onOriginSelect={setOriginStop}
              onDestinationSelect={setDestinationStop}
              onOriginClear={() => setOriginStop(null)}
              onDestinationClear={() => setDestinationStop(null)}
              onUseCurrentLocation={handleUseCurrentLocation}
              onSearch={handleSearch}
              isLoading={suggestRoute.isPending}
              errorMessage={validationError}
            />
          </RouteSidePanel>
        ) : null}

        {showRoutes && result ? (
          <RouteSidePanel className="min-h-0 flex-1 overflow-hidden">
            <RouteAlternativesPanel
              result={result}
              originLabel={origin?.label}
              destinationLabel={destination?.label}
              selectedRouteIndex={routeIndex}
              onSelectRoute={selectRouteIndex}
              onEditStops={handleEditStops}
            />
          </RouteSidePanel>
        ) : null}
      </aside>
    </div>
  );
};
