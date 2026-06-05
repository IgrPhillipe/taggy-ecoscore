import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryStates } from "nuqs";
import { getToastErrorMessage } from "@/lib/api-error";
import { routePageSearchParams } from "../../search-params";
import { reverseGeocodeLabel } from "../../lib/geocoding";
import { routeStopToApiValue, type RouteStop } from "../../lib/route-location";
import { useSuggestRoute } from "../useSuggestRoute";
import type { RouteSuggestResponse } from "../../api/types";

export function useRoutePageState() {
  const [{ origin, destination, route: routeIndex }, setParams] = useQueryStates(
    routePageSearchParams,
    { history: "replace" },
  );

  const [originInput, setOriginInput] = useState(origin?.label ?? "");
  const [destinationInput, setDestinationInput] = useState(destination?.label ?? "");
  const [result, setResult] = useState<RouteSuggestResponse | null>(null);
  const [validationError, setValidationError] = useState<string>();
  const autoSearchDone = useRef(false);

  const suggestRoute = useSuggestRoute();

  useEffect(() => {
    if (origin?.label) setOriginInput(origin.label);
  }, [origin?.label, origin?.lat, origin?.lng]);

  useEffect(() => {
    if (destination?.label) setDestinationInput(destination.label);
  }, [destination?.label, destination?.lat, destination?.lng]);

  const runSearch = useCallback(
    (originStop: RouteStop, destinationStop: RouteStop) => {
      setValidationError(undefined);
      suggestRoute.mutate(
        {
          origin: routeStopToApiValue(originStop),
          destination: routeStopToApiValue(destinationStop),
        },
        {
          onSuccess: (data) => {
            setResult(data);
            setParams({ route: 0 });
          },
          onError: (error) => {
            setValidationError(
              getToastErrorMessage(error, {
                fallback: "Não foi possível calcular a rota. Tente novamente.",
              }),
            );
            setResult(null);
          },
        },
      );
    },
    [setParams, suggestRoute],
  );

  const handleSearch = useCallback(() => {
    if (!origin && !destination) {
      setValidationError("Selecione origem e destino na lista de sugestões.");
      return;
    }
    if (!origin) {
      setValidationError("Selecione a origem na lista de sugestões.");
      return;
    }
    if (!destination) {
      setValidationError("Selecione o destino na lista de sugestões.");
      return;
    }
    runSearch(origin, destination);
  }, [origin, destination, runSearch]);

  useEffect(() => {
    if (autoSearchDone.current || !origin || !destination) return;
    autoSearchDone.current = true;
    runSearch(origin, destination);
  }, [origin, destination, runSearch]);

  const setOriginStop = useCallback(
    (stop: RouteStop | null) => {
      setParams({ origin: stop });
      setOriginInput(stop?.label ?? "");
      if (validationError) setValidationError(undefined);
    },
    [setParams, validationError],
  );

  const setDestinationStop = useCallback(
    (stop: RouteStop | null) => {
      setParams({ destination: stop });
      setDestinationInput(stop?.label ?? "");
      if (validationError) setValidationError(undefined);
    },
    [setParams, validationError],
  );

  const handleOriginInputChange = useCallback(
    (text: string) => {
      setOriginInput(text);
      if (origin) setParams({ origin: null });
    },
    [origin, setParams],
  );

  const handleDestinationInputChange = useCallback(
    (text: string) => {
      setDestinationInput(text);
      if (destination) setParams({ destination: null });
    },
    [destination, setParams],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      setValidationError("Geolocalização não suportada pelo navegador.");
      return;
    }

    return new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const label =
            (await reverseGeocodeLabel(lat, lng)) ??
            `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setOriginStop({ lat, lng, label });
          resolve();
        },
        () => {
          setValidationError(
            "Não foi possível obter sua localização. Verifique as permissões do navegador.",
          );
          resolve();
        },
        { timeout: 8000 },
      );
    });
  }, [setOriginStop]);

  const selectRouteIndex = useCallback(
    (index: number) => {
      setParams({ route: index });
    },
    [setParams],
  );

  const handleEditStops = useCallback(() => {
    setResult(null);
    setValidationError(undefined);
    setParams({ route: 0 });
    setOriginInput(origin?.label ?? "");
    setDestinationInput(destination?.label ?? "");
    suggestRoute.reset();
  }, [destination?.label, origin?.label, setParams, suggestRoute]);

  return {
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
  };
}
