import { Link } from "@tanstack/react-router";
import { DriverFormDialog } from "../../components/DriverFormDialog/DriverFormDialog";
import { DriverCreateDialog } from "../../components/DriverCreateDialog/DriverCreateDialog";
import type {
  ColumnDef,
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { Pencil, Plus, Trash } from "lucide-react";
import { useState } from "react";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { getToastErrorMessage } from "@/lib/api-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { FilterModal, FilterSearchRow } from "@/components/FilterModal";
import { FormField } from "@/components/form/FormField";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import { ActionHintPopover } from "@/components/ActionHintPopover";
import {
  FleetsRelationSelect,
  OrganizationsRelationSelect,
} from "@/components/form/relation-selects";
import { DataTable, entityIdColumn } from "@/components/DataTable";
import { PageLayout } from "@/components/layout/PageLayout";
import { PAGE_SIZE } from "@/constants";
import { useCurrentUser } from "@/features/auth";
import { useOrganizationNameMap } from "@/hooks/useOrganizationNameMap";
import { useFleetNameMap } from "@/hooks/useFleetNameMap";
import type { UserWithVehicle } from "@/features/users/api/types";
import { useDeleteUser } from "@/features/users/hooks/useUpdateUser";
import { useGetDrivers } from "../../hooks/useGetDrivers";
import { ExportButton } from "@/features/reports/components/ExportButton";
import { buildDriverListExportUrl } from "@/features/reports/lib/export-urls";

const columns = (
  onDelete: (driver: UserWithVehicle) => void,
  onEdit: (driver: UserWithVehicle) => void,
  orgNameMap: Map<number, string>,
  fleetNameMap: Map<number, string>,
): ColumnDef<UserWithVehicle>[] => [
  entityIdColumn<UserWithVehicle>(),
  {
    accessorKey: "name",
    header: "Nome",
    enableSorting: true,
  },
  {
    accessorKey: "email",
    header: "E-mail",
    enableSorting: true,
  },
  {
    id: "plate",
    header: "Placa",
    enableSorting: true,
    accessorFn: (row) => row.plate ?? "",
    cell: ({ row }) => row.original.plate ?? "—",
  },
  {
    id: "fleet",
    header: "Frota",
    enableSorting: true,
    accessorFn: (row) =>
      row.isFleetLinked ? String(row.fleetOrganizationId ?? "") : "individual",
    cell: ({ row }) => {
      const driver = row.original;
      if (driver.isFleetLinked) {
        const fleetName =
          driver.fleetId != null
            ? fleetNameMap.get(driver.fleetId) ?? `#${driver.fleetId}`
            : driver.fleetOrganizationId != null
              ? orgNameMap.get(driver.fleetOrganizationId) ??
                `#${driver.fleetOrganizationId}`
              : null;
        if (fleetName) {
          return <Badge variant="outline">{fleetName}</Badge>;
        }
      }
      return "";
    },
  },
  {
    id: "actions",
    header: "Ações",
    enableSorting: false,
    cell: ({ row }) => {
      const driver = row.original;
      return (
        <div className="flex items-center gap-2">
          <ActionHintPopover label="Ver detalhes do motorista">
            <Button asChild variant="outline" size="sm">
              <Link
                to="/motoristas/$id"
                params={{ id: String(driver.id) }}
                aria-label="Ver detalhes do motorista"
              >
                Ver
              </Link>
            </Button>
          </ActionHintPopover>
          <ActionHintPopover label="Editar motorista">
            <Button variant="outline" size="sm" onClick={() => onEdit(driver)} aria-label="Editar motorista">
              <Pencil className="h-4 w-4" />
            </Button>
          </ActionHintPopover>
          <ActionHintPopover label="Excluir motorista">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDelete(driver)}
              aria-label="Excluir motorista"
            >
              <Trash className="h-4 w-4" />
            </Button>
          </ActionHintPopover>
        </div>
      );
    },
  },
];

const driversSearchParams = {
  page: parseAsInteger.withDefault(1),
  sort: parseAsString,
  order: parseAsStringEnum(["asc", "desc"] as const).withDefault("asc"),
  search: parseAsString,
  org: parseAsInteger,
  fleet: parseAsInteger,
};

const FILTER_DEFAULTS = {
  org: undefined as number | undefined,
  fleet: undefined as number | undefined,
};

export const DriversListPage = () => {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const [{ page, sort, order, search, org, fleet }, setParams] = useQueryStates(
    driversSearchParams,
    { history: "replace" },
  );
  const [driverToDelete, setDriverToDelete] = useState<UserWithVehicle | null>(null);
  const [driverToEdit, setDriverToEdit] = useState<UserWithVehicle | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { mutate: deleteDriver, isPending: isDeleting } = useDeleteUser();

  const scopedOrgId =
    user?.role === "gestor_frota"
      ? (user.organization_id ?? undefined)
      : isAdmin
        ? (org ?? undefined)
        : undefined;

  const orgNameMap = useOrganizationNameMap();
  const fleetNameMap = useFleetNameMap(scopedOrgId);

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize: PAGE_SIZE,
  };
  const sorting: SortingState = sort
    ? [{ id: sort, desc: order === "desc" }]
    : [];

  const { data, isLoading, isError, error } = useGetDrivers({
    page,
    pageSize: PAGE_SIZE,
    search: search ?? undefined,
    organizationId: scopedOrgId,
    fleetId: fleet ?? undefined,
    sortBy: sort ?? undefined,
    sortOrder: order,
  });

  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : undefined;

  const {
    open: filterOpen,
    setOpen: setFilterOpen,
    draft,
    setDraft,
    apply: applyFilters,
    clear: clearFilters,
    activeCount,
  } = useFilterDraft({
    applied: {
      org: org ?? undefined,
      fleet: fleet ?? undefined,
    },
    defaults: FILTER_DEFAULTS,
    onApply: (values) =>
      setParams({
        org: values.org ?? null,
        fleet: values.fleet ?? null,
        page: 1,
      }),
  });

  const draftFleetOrgId =
    user?.role === "gestor_frota"
      ? (user.organization_id ?? undefined)
      : isAdmin
        ? (draft.org ?? undefined)
        : undefined;

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    setParams({ page: next.pageIndex + 1 });
  };

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    setParams({
      sort: next[0]?.id ?? null,
      order: next[0]?.desc ? "desc" : "asc",
      page: 1,
    });
  };

  const handleConfirmDelete = () => {
    if (!driverToDelete) return;
    deleteDriver(driverToDelete.id, {
      onSuccess: () => setDriverToDelete(null),
    });
  };

  return (
    <PageLayout
      title="Motoristas"
      description="Consulte e gerencie os motoristas cadastrados no sistema."
    >
      {isError ? (
        <p className="text-destructive" role="alert">
          {getToastErrorMessage(error, {
            fallback: "Erro ao carregar motoristas.",
          })}
        </p>
      ) : (
        <>
          <section className="flex items-center justify-between gap-2">
            <FilterSearchRow
              searchValue={search ?? ""}
              onDebouncedSearchChange={(value) =>
                setParams({ search: value || null, page: 1 })
              }
              placeholder="Buscar por nome, organização ou frota"
              searchId="driver-search"
            >
              <FilterModal
                open={filterOpen}
                onOpenChange={setFilterOpen}
                activeCount={activeCount}
                onApply={applyFilters}
                onClear={clearFilters}
                className="shrink-0"
              >
              {isAdmin ? (
                <FormField id="driver-org" label="Organização">
                  <OrganizationsRelationSelect
                    value={draft.org ?? undefined}
                    onValueChange={(value) =>
                      setDraft((prev) => ({
                        ...prev,
                        org: value ?? undefined,
                        fleet: undefined,
                      }))
                    }
                    placeholder="Todas as organizações"
                    emptyLabel="Todas as organizações"
                    className="w-full"
                  />
                </FormField>
              ) : null}
              <FormField id="driver-fleet" label="Frota">
                <FleetsRelationSelect
                  value={draft.fleet ?? undefined}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, fleet: value ?? undefined }))
                  }
                  organizationId={draftFleetOrgId}
                  placeholder="Todas as frotas"
                  noneLabel="Todas as frotas"
                  className="w-full"
                />
              </FormField>
              </FilterModal>
            </FilterSearchRow>
            <div className="flex items-center gap-2">
              <ExportButton
                url={buildDriverListExportUrl({
                  organizationId: scopedOrgId,
                  fleetId: fleet ?? undefined,
                  search: search ?? undefined,
                })}
              />
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />
                Cadastrar Motorista
              </Button>
            </div>
          </section>

          <DataTable
            columns={columns(setDriverToDelete, setDriverToEdit, orgNameMap, fleetNameMap)}
            data={data?.items ?? []}
            isLoading={isLoading}
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            sorting={sorting}
            onSortingChange={handleSortingChange}
          />
        </>
      )}

      {driverToEdit && (
        <DriverFormDialog
          open={!!driverToEdit}
          onClose={() => setDriverToEdit(null)}
          driver={driverToEdit}
        />
      )}

      <DriverCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />

      <DeleteConfirmDialog
        open={driverToDelete != null}
        onClose={() => setDriverToDelete(null)}
        title="Excluir motorista"
        entityName={driverToDelete?.name}
        isPending={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </PageLayout>
  );
};
