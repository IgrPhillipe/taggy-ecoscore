import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http-client";

export type EmissionsByUFItem = {
  uf: string;
  co2_total_kg: number;
  transaction_count: number;
};

type UseEmissionsByUFParams = {
  organizationId?: number;
  fleetId?: number;
};

export const useEmissionsByUF = ({
  organizationId,
  fleetId,
}: UseEmissionsByUFParams = {}) => {
  return useQuery({
    queryKey: ["dashboard", "emissions-by-uf", organizationId, fleetId],
    queryFn: () =>
      api
        .get("/api/dashboard/emissions-by-uf", {
          searchParams: {
            ...(organizationId != null && { organization_id: organizationId }),
            ...(fleetId != null && { fleet_id: fleetId }),
          },
        })
        .json<{ items: EmissionsByUFItem[] }>()
        .then((r) => r.items),
  });
};
