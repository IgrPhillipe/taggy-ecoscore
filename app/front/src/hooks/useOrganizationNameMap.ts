import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { getOrganizations } from "@/features/fleet/api/requests";
import { organizationKeys } from "@/features/fleet/api/organization-query-keys";

export function useOrganizationNameMap() {
  const { data: organizations = [] } = useQuery({
    queryKey: organizationKeys.list(),
    queryFn: getOrganizations,
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    const map = new Map<number, string>();
    for (const org of organizations) {
      map.set(org.id, org.name);
    }
    return map;
  }, [organizations]);
}
