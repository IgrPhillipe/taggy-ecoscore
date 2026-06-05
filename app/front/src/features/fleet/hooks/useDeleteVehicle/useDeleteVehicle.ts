import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { getToastErrorMessage } from "@/lib/api-error"
import {
  invalidateVehicleQueries,
  removeVehicleDetailQueries,
} from "@/lib/query-invalidation"
import { deleteVehicle } from "../../api/requests"

export const useDeleteVehicle = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteVehicle(id),
    onSuccess: async (_data, id) => {
      await invalidateVehicleQueries(queryClient)
      await removeVehicleDetailQueries(queryClient, id)
    },
    onError: (error) => {
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao remover veículo." }),
      )
    },
  })
}
