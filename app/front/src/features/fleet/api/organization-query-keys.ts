export const organizationKeys = {
  all: () => ["organizations"] as const,
  list: () => [...organizationKeys.all(), "list"] as const,
  detail: (id: number) => [...organizationKeys.all(), id] as const,
  summary: (id: number) => [...organizationKeys.detail(id), "summary"] as const,
  users: (id: number) => [...organizationKeys.detail(id), "users"] as const,
}
