import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getToastErrorMessage } from "@/lib/api-error";
import { invalidateTransactionImpactQueries } from "@/lib/query-invalidation";
import { processTransaction } from "../../api/requests";
import type { ProcessTransactionBody } from "../../api/types";

export const useProcessTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: ProcessTransactionBody) => processTransaction(body),
    onSuccess: async (result, body) => {
      const transaction = result.data?.transaction;
      await invalidateTransactionImpactQueries(queryClient, {
        userId: body.user_id ?? transaction?.user_id ?? undefined,
        vehicleId: body.vehicle_id ?? transaction?.vehicle_id ?? undefined,
        organizationId: body.organization_id ?? transaction?.organization_id ?? undefined,
      });
    },
    onError: (error) => {
      toast.error(
        getToastErrorMessage(error, {
          fallback: "Não foi possível processar a simulação.",
        }),
      );
    },
  });
};
