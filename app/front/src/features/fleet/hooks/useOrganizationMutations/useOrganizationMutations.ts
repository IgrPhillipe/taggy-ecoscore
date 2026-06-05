import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getToastErrorMessage } from "@/lib/api-error";
import {
  invalidateOrganizationQueries,
  invalidateUserQueries,
} from "@/lib/query-invalidation";
import {
  createOrganization,
  deleteOrganization,
  linkOrganizationUser,
  unlinkOrganizationUser,
  updateOrganization,
} from "../../api/requests";
import type { OrgFormData } from "../../components/OrgFormDialog";

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OrgFormData) =>
      createOrganization({ name: data.name, cnpj: data.cnpj || undefined }),
    onSuccess: async () => {
      await invalidateOrganizationQueries(queryClient);
      toast.success("Organização criada.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao criar organização." }),
      ),
  });
};

export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: OrgFormData }) =>
      updateOrganization(id, { name: data.name, cnpj: data.cnpj || undefined }),
    onSuccess: async (_data, { id }) => {
      await invalidateOrganizationQueries(queryClient, { id });
      toast.success("Organização atualizada.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, {
          fallback: "Erro ao atualizar organização.",
        }),
      ),
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteOrganization(id),
    onSuccess: async (_data, id) => {
      await invalidateOrganizationQueries(queryClient, { id });
      toast.success("Organização removida.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, {
          fallback: "Erro ao remover organização.",
        }),
      ),
  });
};

export const useLinkOrganizationUser = (orgId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => linkOrganizationUser(orgId, userId),
    onSuccess: async () => {
      await invalidateOrganizationQueries(queryClient, { id: orgId });
      await invalidateUserQueries(queryClient);
      toast.success("Usuário vinculado.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao vincular usuário." }),
      ),
  });
};

export const useUnlinkOrganizationUser = (orgId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => unlinkOrganizationUser(orgId, userId),
    onSuccess: async () => {
      await invalidateOrganizationQueries(queryClient, { id: orgId });
      await invalidateUserQueries(queryClient);
      toast.success("Usuário desvinculado.");
    },
    onError: (error) =>
      toast.error(
        getToastErrorMessage(error, { fallback: "Erro ao desvincular usuário." }),
      ),
  });
};
