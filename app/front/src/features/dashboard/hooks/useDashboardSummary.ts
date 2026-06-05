import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http-client";
import { dashboardKeys } from "../api/query-keys";

export type DashboardSummary = {
  total_co2_avoided_kg: number;
  total_fuel_saved_liters: number;
  accumulated_economy: number;
  active_tags: number;
  paper_saved_meters: number;
  transaction_count: number;
};

type UseDashboardSummaryParams = {
  organizationId?: number;
  fleetId?: number;
  fuelType?: string;
  fromDate?: string;
  toDate?: string;
};

export const useDashboardSummary = ({
  organizationId,
  fleetId,
  fuelType,
  fromDate,
  toDate,
}: UseDashboardSummaryParams = {}) => {
  return useQuery({
    queryKey: dashboardKeys.summary({
      organizationId,
      fleetId,
      fuelType,
      fromDate,
      toDate,
    }),
    queryFn: () =>
      api
        .get("/api/dashboard/summary", {
          searchParams: {
            ...(organizationId != null && { organization_id: organizationId }),
            ...(fleetId != null && { fleet_id: fleetId }),
            ...(fuelType && { fuel_type: fuelType }),
            ...(fromDate && { from_date: fromDate }),
            ...(toDate && { to_date: toDate }),
          },
        })
        .json<DashboardSummary>(),
  });
};
