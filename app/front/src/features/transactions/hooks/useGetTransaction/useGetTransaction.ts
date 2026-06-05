import { useQuery } from "@tanstack/react-query";
import { getTransaction } from "../../api/requests";

type UseGetTransactionOptions = {
  enabled?: boolean;
};

export const useGetTransaction = (
  id: number,
  options: UseGetTransactionOptions = {},
) => {
  return useQuery({
    queryKey: ["transactions", id],
    queryFn: () => getTransaction(id),
    enabled: options.enabled ?? !!id,
  });
};
