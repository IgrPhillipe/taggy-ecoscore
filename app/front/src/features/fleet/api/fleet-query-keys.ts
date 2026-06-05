export const fleetKeys = {
  all: () => ["fleets"] as const,
  lists: () => [...fleetKeys.all(), "list"] as const,
  list: (organizationId?: number, search?: string) =>
    [...fleetKeys.lists(), organizationId, search] as const,
  detail: (id: number) => [...fleetKeys.all(), id] as const,
  summary: (id: number) => [...fleetKeys.detail(id), "summary"] as const,
  vehicles: (id: number) => [...fleetKeys.detail(id), "vehicles"] as const,
  users: (id: number) => [...fleetKeys.detail(id), "users"] as const,
  transactions: (id: number, page: number, filters: unknown) =>
    [...fleetKeys.detail(id), "transactions", page, filters] as const,
}
