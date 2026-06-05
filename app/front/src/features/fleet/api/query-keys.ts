import type { GetVehiclesParams } from "./types"

export const vehicleKeys = {
  all: () => ["vehicles"] as const,
  lists: () => [...vehicleKeys.all(), "list"] as const,
  list: (params: GetVehiclesParams) => [...vehicleKeys.lists(), params] as const,
  details: () => [...vehicleKeys.all(), "detail"] as const,
  detail: (id: number) => [...vehicleKeys.details(), id] as const,
  summary: (id: number) => [...vehicleKeys.detail(id), "summary"] as const,
  transactions: (id: number, page: number, filters: unknown) =>
    [...vehicleKeys.detail(id), "transactions", page, filters] as const,
}
