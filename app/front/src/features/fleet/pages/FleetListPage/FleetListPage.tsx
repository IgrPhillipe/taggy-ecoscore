import type {
  ColumnDef,
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { Link } from "@tanstack/react-router";
import { Pencil, Plus, Trash } from "lucide-react";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { useState } from "react";
import { ActionHintPopover } from "@/components/ActionHintPopover";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { FilterModal, FilterSearchRow } from "@/components/FilterModal";
import { FormField } from "@/components/form/FormField";
import {
  FleetsRelationSelect,
  OrganizationsRelationSelect,
} from "@/components/form/relation-selects";
import { Button } from "@/components/ui/button";
import { DataTable, entityIdColumn } from "@/components/DataTable";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { PageLayout } from "@/components/layout/PageLayout";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import { PAGE_SIZE } from "@/constants";
import { FUEL_TYPE_OPTIONS } from "@/features/dashboard/constants";
import { useCurrentUser } from "@/features/auth";
import { useGetVehicles } from "../../hooks/useGetVehicles";
import { useDeleteVehicle } from "../../hooks/useDeleteVehicle";
import type { Vehicle } from "../../schemas/vehicle-schema";
import { VehicleFormDialog } from "../../components/VehicleFormDialog/VehicleFormDialog";
import { ExportButton } from "@/features/reports/components/ExportButton";
import { buildVehicleListExportUrl } from "@/features/reports/lib/export-urls";

const VehicleActions = ({
  vehicle,
  onEdit,
  onDelete,
}: {
  vehicle: Vehicle;
  onEdit: (v: Vehicle) => void;
  onDelete: (v: Vehicle) => void;
}) => {
  return (
    <div className="flex items-center gap-2">
      <ActionHintPopover label="Ver detalhes do veículo">
        <Button asChild variant="outline" size="sm">
          <Link
            to="/frota/$id"
            params={{ id: String(vehicle.id) }}
            aria-label="Ver detalhes do veículo"
          >
            Ver
          </Link>
        </Button>
      </ActionHintPopover>
      <ActionHintPopover label="Editar veículo">
        <Button variant="outline" size="sm" onClick={() => onEdit(vehicle)} aria-label="Editar veículo">
          <Pencil className="h-4 w-4" />
        </Button>
      </ActionHintPopover>
      <ActionHintPopover label="Excluir veículo">
        <Button type="button" variant="outline" size="sm" onClick={() => onDelete(vehicle)} aria-label="Excluir veículo">
          <Trash className="h-4 w-4" />
        </Button>
      </ActionHintPopover>
    </div>
  );
};

const fleetSearchParams = {
  page: parseAsInteger.withDefault(1),
  sort: parseAsString,
  order: parseAsStringEnum(["asc", "desc"] as const).withDefault("asc"),
  search: parseAsString,
  fuel_type: parseAsString,
  sem_frota: parseAsStringEnum(["all", "yes", "no"] as const).withDefault("all"),
  org: parseAsInteger,
  fleet: parseAsInteger,
};

const SEM_FROTA_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "yes", label: "Sem frota" },
  { value: "no", label: "Com frota" },
];

const FILTER_DEFAULTS = {
  fuel_type: undefined as string | undefined,
  org: undefined as number | undefined,
  fleet: undefined as number | undefined,
  sem_frota: "all" as "all" | "yes" | "no",
};

export const FleetListPage = () => {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const [{ page, sort, order, search, fuel_type, sem_frota, org, fleet }, setParams] =
    useQueryStates(fleetSearchParams, { history: "replace" });
  const [createOpen, setCreateOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const { mutate: deleteVehicle, isPending: isDeletingVehicle } = useDeleteVehicle();

  const scopedOrgId =
    user?.role === "gestor_frota"
      ? (user.organization_id ?? undefined)
      : isAdmin
        ? (org ?? undefined)
        : undefined;

  const semFrotaParam =
    isAdmin && sem_frota === "yes" ? true : isAdmin && sem_frota === "no" ? false : undefined;

  const pagination: PaginationState = { pageIndex: page - 1, pageSize: PAGE_SIZE };
  const sorting: SortingState = sort ? [{ id: sort, desc: order === "desc" }] : [];

  const { data, isLoading } = useGetVehicles({
    page,
    pageSize: PAGE_SIZE,
    sortBy: sort ?? undefined,
    sortOrder: order,
    search: search ?? undefined,
    fuelType: fuel_type ?? undefined,
    organizationId: scopedOrgId,
    fleetId: fleet ?? undefined,
    semFrota: semFrotaParam,
  });

  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : undefined;

  const appliedFilters = {
    fuel_type: fuel_type ?? undefined,
    org: org ?? undefined,
    fleet: fleet ?? undefined,
    sem_frota,
  };

  const {
    open: filterOpen,
    setOpen: setFilterOpen,
    draft,
    setDraft,
    apply: applyFilters,
    clear: clearFilters,
    activeCount,
  } = useFilterDraft({
    applied: appliedFilters,
    defaults: FILTER_DEFAULTS,
    onApply: (values) =>
      setParams({
        fuel_type: values.fuel_type ?? null,
        org: values.org ?? null,
        fleet: values.fleet ?? null,
        sem_frota: values.sem_frota,
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
    setParams({ sort: next[0]?.id ?? null, order: next[0]?.desc ? "desc" : "asc", page: 1 });
  };

  const columns: ColumnDef<Vehicle>[] = [
    entityIdColumn<Vehicle>(),
    { accessorKey: "id_tag", header: "TAG ID", enableSorting: true },
    { accessorKey: "license_plate", header: "PLACA", enableSorting: true },
    { accessorKey: "model", header: "MODELO", enableSorting: true },
    { accessorKey: "fuel_type", header: "TIPO DE COMBUSTÍVEL", enableSorting: true },
    {
      accessorKey: "category",
      header: "CATEGORIA",
      enableSorting: true,
      cell: ({ row }) =>
        row.original.category === "pesado" ? "Pesado" : "Leve",
    },
    {
      id: "actions",
      header: "AÇÕES",
      enableSorting: false,
      cell: ({ row }) => (
        <VehicleActions
          vehicle={row.original}
          onEdit={setEditVehicle}
          onDelete={setVehicleToDelete}
        />
      ),
    },
  ];

  return (
    <PageLayout
      title="Veículos"
      description="Consulte e gerencie os veículos da frota."
    >
      <section className="flex items-center justify-between gap-2">
        <FilterSearchRow
          searchValue={search ?? ""}
          onDebouncedSearchChange={(value) =>
            setParams({ search: value || null, page: 1 })
          }
          placeholder="Buscar por placa, modelo ou TAG"
          searchId="vehicle-search"
        >
          <FilterModal
            open={filterOpen}
            onOpenChange={setFilterOpen}
            activeCount={activeCount}
            onApply={applyFilters}
            onClear={clearFilters}
            className="shrink-0"
          >
          <FormField id="vehicle-fuel" label="Combustível">
            <FilterSelect
              value={draft.fuel_type ?? "all"}
              onValueChange={(v) =>
                setDraft((prev) => ({
                  ...prev,
                  fuel_type: v === "all" ? undefined : v,
                }))
              }
              options={[
                { value: "all", label: "Todos combustíveis" },
                ...FUEL_TYPE_OPTIONS,
              ]}
              placeholder="Combustível"
              className="w-full"
            />
          </FormField>
          {isAdmin ? (
            <FormField id="vehicle-org" label="Organização">
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
          <FormField id="vehicle-fleet" label="Frota">
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
          {isAdmin ? (
            <FormField id="vehicle-sem-frota" label="Vínculo com frota">
              <FilterSelect
                value={draft.sem_frota}
                onValueChange={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    sem_frota: v as typeof draft.sem_frota,
                  }))
                }
                options={SEM_FROTA_OPTIONS}
                placeholder="Sem frota"
                className="w-full"
              />
            </FormField>
          ) : null}
          </FilterModal>
        </FilterSearchRow>
        <div className="flex items-center gap-2">
          <ExportButton
            url={buildVehicleListExportUrl({
              organizationId: scopedOrgId,
              fleetId: fleet ?? undefined,
              search: search ?? undefined,
              fuelType: fuel_type ?? undefined,
              semFrota: semFrotaParam,
            })}
          />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Cadastrar Veículo
          </Button>
        </div>
      </section>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        sorting={sorting}
        onSortingChange={handleSortingChange}
      />

      <VehicleFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultOrganizationId={scopedOrgId}
      />
      <VehicleFormDialog
        open={!!editVehicle}
        onClose={() => setEditVehicle(null)}
        vehicle={editVehicle ?? undefined}
      />

      <DeleteConfirmDialog
        open={vehicleToDelete != null}
        onClose={() => setVehicleToDelete(null)}
        title="Excluir veículo"
        entityName={vehicleToDelete?.license_plate}
        isPending={isDeletingVehicle}
        onConfirm={() => {
          if (!vehicleToDelete) return;
          deleteVehicle(vehicleToDelete.id, {
            onSuccess: () => setVehicleToDelete(null),
          });
        }}
      />
    </PageLayout>
  );
};
