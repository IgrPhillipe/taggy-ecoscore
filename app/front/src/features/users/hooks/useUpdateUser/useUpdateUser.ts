import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getToastErrorMessage } from "@/lib/api-error";
import {
  invalidateDriverQueries,
  invalidateOrganizationQueries,
  invalidateUserQueries,
  invalidateUserVehicleAssignmentQueries,
  removeUserDetailQueries,
} from "@/lib/query-invalidation";
import { DEFAULT_USER_PASSWORD } from "../../constants";
import { createUser, updateUser, deleteUser, updateUserVehicles } from "../../api/requests";
import type { UpdateUserPayload } from "../../api/types";

type UserMutationOptions = {
  silent?: boolean;
  successMessage?: string;
};

export const useCreateUser = (options?: UserMutationOptions) => {
  const queryClient = useQueryClient();
  const silent = options?.silent ?? false;
  const successMessage = options?.successMessage ?? "Usuário criado com sucesso!";

  return useMutation({
    mutationFn: (data: {
      name: string;
      email: string;
      role?: string;
      organization_id?: number | null;
    }) =>
      createUser({
        ...data,
        password: DEFAULT_USER_PASSWORD,
      }),
    onSuccess: async () => {
      await invalidateUserQueries(queryClient);
      await invalidateDriverQueries(queryClient);
      if (!silent) {
        toast.success(successMessage);
      }
    },
    onError: (error) => {
      if (!silent) {
        toast.error(
          getToastErrorMessage(error, { fallback: "Erro ao criar usuário." }),
        );
      }
    },
  });
};

export const useUpdateUser = (options?: UserMutationOptions) => {
  const queryClient = useQueryClient();
  const silent = options?.silent ?? false;

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserPayload }) =>
      updateUser(id, data),
    onSuccess: async (_updatedUser, { id }) => {
      await invalidateUserQueries(queryClient, { id });
      await invalidateDriverQueries(queryClient);
      await invalidateOrganizationQueries(queryClient);
      if (!silent) {
        toast.success("Usuário atualizado com sucesso!");
      }
    },
    onError: (error) => {
      if (!silent) {
        toast.error(
          getToastErrorMessage(error, { fallback: "Erro ao atualizar usuário." }),
        );
      }
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: async (_data, id) => {
      await invalidateUserQueries(queryClient);
      await invalidateDriverQueries(queryClient);
      await invalidateOrganizationQueries(queryClient);
      await removeUserDetailQueries(queryClient, id);
      toast.success("Usuário excluído com sucesso!");
    },
    onError: (error) => {
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao excluir usuário." }),
      );
    },
  });
};

export const useUpdateUserVehicles = (options?: UserMutationOptions) => {
  const queryClient = useQueryClient();
  const silent = options?.silent ?? false;

  return useMutation({
    mutationFn: ({ userId, vehicleIds }: { userId: number; vehicleIds: number[] }) =>
      updateUserVehicles(userId, vehicleIds),
    onSuccess: async (_data, { userId }) => {
      await invalidateUserVehicleAssignmentQueries(queryClient, userId);
      if (!silent) {
        toast.success("Veículos vinculados atualizados.");
      }
    },
    onError: (error) => {
      if (!silent) {
        toast.error(
          getToastErrorMessage(error, {
            fallback: "Erro ao atualizar veículos vinculados.",
          }),
        );
      }
    },
  });
};
