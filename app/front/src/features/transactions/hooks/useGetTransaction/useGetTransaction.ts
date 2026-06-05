import { useQuery } from "@tanstack/react-query";
import { getTransaction } from "../../api/requests";
import { transactionKeys } from "../../api/query-keys";

type UseGetTransactionOptions = {
  enabled?: boolean;
};

export const useGetTransaction = (
  id: number,
  options: UseGetTransactionOptions = {},
) => {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => getTransaction(id),
    enabled: options.enabled ?? !!id,
  });
};
