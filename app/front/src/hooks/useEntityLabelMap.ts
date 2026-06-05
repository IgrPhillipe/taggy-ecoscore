import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

export function useEntityLabelMap<T>(
  ids: Array<number | null | undefined>,
  queryKeyFn: (id: number) => readonly unknown[],
  fetchFn: (id: number) => Promise<T>,
  getLabel: (item: T) => string,
) {
  const uniqueIds = useMemo(
    () => [...new Set(ids.filter((id): id is number => id != null))],
    [ids],
  );

  const queries = useQueries({
    queries: uniqueIds.map((id) => ({
      queryKey: queryKeyFn(id),
      queryFn: () => fetchFn(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  return useMemo(() => {
    const map = new Map<number, string>();
    uniqueIds.forEach((id, index) => {
      const data = queries[index]?.data;
      if (data) map.set(id, getLabel(data));
    });
    return map;
  }, [queries, uniqueIds]);
}
