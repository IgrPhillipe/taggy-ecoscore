import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getFleets } from "@/features/fleet/api/requests";
import { fleetKeys } from "@/features/fleet/api/fleet-query-keys";

export function useFleetNameMap(organizationId?: number) {
  const { data: fleets = [] } = useQuery({
    queryKey: fleetKeys.list(organizationId),
    queryFn: () => getFleets(organizationId != null ? { organizationId } : undefined),
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const map = new Map<number, string>();
    for (const fleet of fleets) {
      map.set(fleet.id, fleet.name);
    }
    return map;
  }, [fleets]);
}
