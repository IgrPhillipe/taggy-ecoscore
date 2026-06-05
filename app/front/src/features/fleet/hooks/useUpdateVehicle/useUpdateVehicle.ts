import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getToastErrorMessage } from "@/lib/api-error"
import { invalidateVehicleQueries } from "@/lib/query-invalidation"
import { updateVehicle } from "../../api/requests"
import type { UpdateVehicleVariables } from "../../api/types"

export const useUpdateVehicle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: UpdateVehicleVariables) => updateVehicle(id, data),
    onSuccess: async (_data, { id }) => {
      await invalidateVehicleQueries(queryClient, { id })
    },
    onError: (error) => {
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao atualizar veículo." }),
      )
    },
  })
}
