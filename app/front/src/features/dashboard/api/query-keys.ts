type DashboardFilterParams = {
  organizationId?: number
  fleetId?: number
  fuelType?: string
  fromDate?: string
  toDate?: string
}

export const dashboardKeys = {
  all: () => ["dashboard"] as const,
  summary: (params: DashboardFilterParams = {}) =>
    [...dashboardKeys.all(), "summary", params] as const,
  dailyStats: (params: DashboardFilterParams & { days?: number } = {}) =>
    [...dashboardKeys.all(), "daily-stats", params] as const,
  emissionsByUF: (params: DashboardFilterParams = {}) =>
    [...dashboardKeys.all(), "emissions-by-uf", params] as const,
}

export const userStatsKeys = {
  all: () => ["user-stats"] as const,
  detail: (userId: number) => [...userStatsKeys.all(), userId] as const,
}
