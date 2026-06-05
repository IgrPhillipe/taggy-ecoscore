type DriverListParams = {
  page?: number
  pageSize?: number
  search?: string
  organizationId?: number
  fleetId?: number
}

export const driverKeys = {
  all: () => ["drivers"] as const,
  lists: () => [...driverKeys.all(), "list"] as const,
  list: (params: DriverListParams) => [...driverKeys.lists(), params] as const,
}
