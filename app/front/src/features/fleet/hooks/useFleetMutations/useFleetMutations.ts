import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getToastErrorMessage } from "@/lib/api-error";
import {
  invalidateFleetQueries,
  invalidateUserQueries,
  invalidateVehicleQueries,
} from "@/lib/query-invalidation";
import {
  createFleet,
  deleteFleet,
  linkFleetUser,
  linkFleetVehicle,
  unlinkFleetUser,
  unlinkFleetVehicle,
  updateFleet,
} from "../../api/requests";

export const useCreateFleet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; organization_id: number }) => createFleet(data),
    onSuccess: async () => {
      await invalidateFleetQueries(queryClient);
      toast.success("Frota criada com sucesso.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao criar frota." }),
      ),
  });
};

export const useUpdateFleet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string } }) =>
      updateFleet(id, data),
    onSuccess: async (_data, { id }) => {
      await invalidateFleetQueries(queryClient, { id });
      toast.success("Frota atualizada.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao atualizar frota." }),
      ),
  });
};

export const useDeleteFleet = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteFleet(id),
    onSuccess: async (_data, id) => {
      await invalidateFleetQueries(queryClient, { id });
      toast.success("Frota removida.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao remover frota." }),
      ),
  });
};

export const useLinkFleetVehicle = (fleetId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicleId: number) => linkFleetVehicle(fleetId, vehicleId),
    onSuccess: async () => {
      await invalidateFleetQueries(queryClient, { id: fleetId });
      await invalidateVehicleQueries(queryClient);
      toast.success("Veículo vinculado.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao vincular veículo." }),
      ),
  });
};

export const useUnlinkFleetVehicle = (fleetId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vehicleId: number) => unlinkFleetVehicle(fleetId, vehicleId),
    onSuccess: async () => {
      await invalidateFleetQueries(queryClient, { id: fleetId });
      await invalidateVehicleQueries(queryClient);
      toast.success("Veículo desvinculado.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao desvincular veículo." }),
      ),
  });
};

export const useLinkFleetUser = (fleetId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => linkFleetUser(fleetId, userId),
    onSuccess: async () => {
      await invalidateFleetQueries(queryClient, { id: fleetId });
      await invalidateUserQueries(queryClient);
      toast.success("Usuário vinculado.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao vincular usuário." }),
      ),
  });
};

export const useUnlinkFleetUser = (fleetId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => unlinkFleetUser(fleetId, userId),
    onSuccess: async () => {
      await invalidateFleetQueries(queryClient, { id: fleetId });
      await invalidateUserQueries(queryClient);
      toast.success("Usuário desvinculado.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao desvincular usuário." }),
      ),
  });
};
