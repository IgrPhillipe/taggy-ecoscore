import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http-client";
import { dashboardKeys } from "../api/query-keys";

export type EmissionsByUFItem = {
  uf: string;
  co2_total_kg: number;
  transaction_count: number;
};

type UseEmissionsByUFParams = {
  organizationId?: number;
  fleetId?: number;
  fuelType?: string;
  fromDate?: string;
  toDate?: string;
};

export const useEmissionsByUF = ({
  organizationId,
  fleetId,
  fuelType,
  fromDate,
  toDate,
}: UseEmissionsByUFParams = {}) => {
  return useQuery({
    queryKey: dashboardKeys.emissionsByUF({
      organizationId,
      fleetId,
      fuelType,
      fromDate,
      toDate,
    }),
    queryFn: () =>
      api
        .get("/api/dashboard/emissions-by-uf", {
          searchParams: {
            ...(organizationId != null && { organization_id: organizationId }),
            ...(fleetId != null && { fleet_id: fleetId }),
            ...(fuelType && { fuel_type: fuelType }),
            ...(fromDate && { from_date: fromDate }),
            ...(toDate && { to_date: toDate }),
          },
        })
        .json<{ items: EmissionsByUFItem[] }>()
        .then((r) => r.items),
  });
};
