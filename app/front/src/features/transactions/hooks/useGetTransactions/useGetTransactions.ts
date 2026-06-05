import { useQuery } from "@tanstack/react-query";
import { getTransactions } from "../../api/requests";
import { transactionKeys } from "../../api/query-keys";
import type { GetTransactionsParams } from "../../api/types";

export const useGetTransactions = (params: GetTransactionsParams = {}) => {
  return useQuery({
    queryKey: transactionKeys.audit(params),
    queryFn: () => getTransactions(params),
  });
};
