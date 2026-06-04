import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http-client";

export type EmissionsByUFItem = {
  uf: string;
  co2_total_kg: number;
  transaction_count: number;
};

type UseEmissionsByUFParams = {
  organizationId?: number;
};

export const useEmissionsByUF = ({
  organizationId,
}: UseEmissionsByUFParams = {}) => {
  return useQuery({
    queryKey: ["dashboard", "emissions-by-uf", organizationId],
    queryFn: () =>
      api
        .get("/api/dashboard/emissions-by-uf", {
          searchParams: {
            ...(organizationId != null && { organization_id: organizationId }),
          },
        })
        .json<{ items: EmissionsByUFItem[] }>()
        .then((r) => r.items),
  });
};
