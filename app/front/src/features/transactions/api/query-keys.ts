export const transactionKeys = {
  all: () => ["transactions"] as const,
  audit: (params?: unknown) => [...transactionKeys.all(), "audit", params ?? {}] as const,
  detail: (id: number) => [...transactionKeys.all(), id] as const,
  user: (userId: number, page: number, filters: unknown) =>
    [...transactionKeys.all(), "user", userId, page, filters] as const,
}
