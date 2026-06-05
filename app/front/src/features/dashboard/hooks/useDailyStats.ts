import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http-client";
import { dashboardKeys } from "../api/query-keys";

export type DailyStatItem = {
  day: string;
  transaction_count: number;
  co2_total_kg: number;
};

type UseDailyStatsParams = {
  days?: number;
  organizationId?: number;
  fleetId?: number;
  fuelType?: string;
  fromDate?: string;
  toDate?: string;
};

export const useDailyStats = ({
  days = 30,
  organizationId,
  fleetId,
  fuelType,
  fromDate,
  toDate,
}: UseDailyStatsParams = {}) => {
  return useQuery({
    queryKey: dashboardKeys.dailyStats({
      days,
      organizationId,
      fleetId,
      fuelType,
      fromDate,
      toDate,
    }),
    queryFn: () =>
      api
        .get("/api/dashboard/daily-stats", {
          searchParams: {
            days,
            ...(organizationId != null && { organization_id: organizationId }),
            ...(fleetId != null && { fleet_id: fleetId }),
            ...(fuelType && { fuel_type: fuelType }),
            ...(fromDate && { from_date: fromDate }),
            ...(toDate && { to_date: toDate }),
          },
        })
        .json<{ items: DailyStatItem[] }>()
        .then((r) => r.items),
  });
};
