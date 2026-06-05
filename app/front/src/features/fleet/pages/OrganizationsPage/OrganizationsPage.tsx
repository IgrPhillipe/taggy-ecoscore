import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash } from "lucide-react";
import { useMemo, useState } from "react";
import { ActionHintPopover } from "@/components/ActionHintPopover";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { DataTable, entityIdColumn } from "@/components/DataTable";
import { PageLayout } from "@/components/layout/PageLayout";
import { FilterInput } from "@/components/ui/FilterInput";
import { Button } from "@/components/ui/button";
import type { ColumnDef } from "@tanstack/react-table";
import { getOrganizations } from "../../api/requests";
import { organizationKeys } from "../../api/organization-query-keys";
import type { Organization } from "../../api/types";
import {
  OrgFormDialog,
} from "../../components/OrgFormDialog";
import {
  useCreateOrganization,
  useDeleteOrganization,
  useUpdateOrganization,
} from "../../hooks/useOrganizationMutations";

export const OrganizationsPage = () => {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Organization | null>(null);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: organizationKeys.list(),
    queryFn: getOrganizations,
  });

  const createMutation = useCreateOrganization();
  const updateMutation = useUpdateOrganization();
  const deleteMutation = useDeleteOrganization();

  const filtered = useMemo(() => {
    if (!search.trim()) return orgs;
    const q = search.toLowerCase();
    return orgs.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.cnpj ?? "").toLowerCase().includes(q) ||
        String(o.id).includes(q),
    );
  }, [orgs, search]);

  const columns: ColumnDef<Organization>[] = [
    entityIdColumn<Organization>(),
    { accessorKey: "name", header: "NOME", enableSorting: true },
    {
      accessorKey: "cnpj",
      header: "CNPJ",
      cell: ({ row }) => row.original.cnpj ?? "—",
    },
    {
      accessorKey: "created_at",
      header: "CRIADO EM",
      cell: ({ row }) =>
        new Date(row.original.created_at).toLocaleDateString("pt-BR"),
    },
    {
      id: "actions",
      header: "AÇÕES",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <ActionHintPopover label="Ver detalhes da organização">
            <Button asChild variant="outline" size="sm">
              <Link
                to="/organizacoes/$id"
                params={{ id: String(row.original.id) }}
                aria-label="Ver detalhes da organização"
              >
                Ver
              </Link>
            </Button>
          </ActionHintPopover>
          <ActionHintPopover label="Editar organização">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditTarget(row.original)}
              aria-label="Editar organização"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </ActionHintPopover>
          <ActionHintPopover label="Excluir organização">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOrgToDelete(row.original)}
              aria-label="Excluir organização"
            >
              <Trash className="h-3 w-3" />
            </Button>
          </ActionHintPopover>
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      title="Organizações"
      description="Gerencie as organizações do sistema."
    >
      <div className="flex items-center justify-between gap-3">
        <FilterInput
          placeholder="Buscar por nome, CNPJ ou ID"
          value={search}
          debounceMs={300}
          onDebouncedChange={setSearch}
        />
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1 h-4 w-4" />
          Nova Organização
        </Button>
      </div>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} />

      <OrgFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nova Organização"
        isPending={createMutation.isPending}
        onSubmit={(data) =>
          createMutation.mutate(data, { onSuccess: () => setCreateOpen(false) })
        }
      />

      {editTarget && (
        <OrgFormDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title="Editar Organização"
          isPending={updateMutation.isPending}
          initial={{ name: editTarget.name, cnpj: editTarget.cnpj ?? "" }}
          onSubmit={(data) =>
            updateMutation.mutate(
              { id: editTarget.id, data },
              { onSuccess: () => setEditTarget(null) },
            )
          }
        />
      )}

      <DeleteConfirmDialog
        open={orgToDelete != null}
        onClose={() => setOrgToDelete(null)}
        title="Excluir organização"
        entityName={orgToDelete?.name}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!orgToDelete) return;
          deleteMutation.mutate(orgToDelete.id, {
            onSuccess: () => setOrgToDelete(null),
          });
        }}
      />
    </PageLayout>
  );
};
