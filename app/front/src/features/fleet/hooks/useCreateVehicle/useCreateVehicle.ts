import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getToastErrorMessage } from "@/lib/api-error"
import { invalidateVehicleQueries } from "@/lib/query-invalidation"
import { createVehicle } from "../../api/requests"

export const useCreateVehicle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createVehicle,
    onSuccess: async () => {
      await invalidateVehicleQueries(queryClient)
    },
    onError: (error) => {
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao cadastrar veículo." }),
      )
    },
  })
}
