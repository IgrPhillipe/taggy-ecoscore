import { Link } from "@tanstack/react-router";
import type {
  ColumnDef,
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useState } from "react";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import { ActionHintPopover } from "@/components/ActionHintPopover";
import { FilterModal, FilterSearchRow } from "@/components/FilterModal";
import { FormField } from "@/components/form/FormField";
import { OrganizationsRelationSelect } from "@/components/form/relation-selects";
import { DataTable, entityIdColumn } from "@/components/DataTable";
import { PageLayout } from "@/components/layout/PageLayout";
import { FilterInput } from "@/components/ui/FilterInput";
import { Button } from "@/components/ui/button";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PAGE_SIZE } from "@/constants";
import { useCurrentUser } from "@/features/auth";
import { OrganizationsCombobox } from "../../components/OrganizationsCombobox/OrganizationsCombobox";
import type { Fleet } from "../../api/types";
import { useGetFleetsFiltered } from "../../hooks/useGetFleetsFiltered";
import { useCreateFleet } from "../../hooks/useFleetMutations";
import { ExportButton } from "@/features/reports/components/ExportButton";
import { buildFleetListExportUrl } from "@/features/reports/lib/export-urls";

const fleetsSearchParams = {
  page: parseAsInteger.withDefault(1),
  sort: parseAsString,
  order: parseAsStringEnum(["asc", "desc"] as const).withDefault("asc"),
  search: parseAsString,
  org: parseAsInteger,
};

const FILTER_DEFAULTS = {
  org: undefined as number | undefined,
};

const CreateFleetDialog = ({
  open,
  onClose,
  defaultOrganizationId,
  isAdmin,
}: {
  open: boolean;
  onClose: () => void;
  defaultOrganizationId?: number;
  isAdmin: boolean;
}) => {
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState<number | undefined>(
    defaultOrganizationId,
  );
  const { mutate: createFleetMutation, isPending } = useCreateFleet();

  const handleSave = () => {
    const orgId = isAdmin ? organizationId : defaultOrganizationId;
    if (orgId == null) return;

    createFleetMutation(
      { name, organization_id: orgId },
      {
        onSuccess: () => {
          setName("");
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Frota</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="fleet-name">Nome *</Label>
            <Input
              id="fleet-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da frota"
            />
          </div>
          {isAdmin && (
            <div className="space-y-1">
              <Label>Organização *</Label>
              <OrganizationsCombobox
                value={organizationId}
                onValueChange={setOrganizationId}
                placeholder="Selecione a organização"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                !name.trim() ||
                isPending ||
                (isAdmin && organizationId == null)
              }
            >
              {isPending ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const columns: ColumnDef<Fleet>[] = [
  entityIdColumn<Fleet>(),
  {
    accessorKey: "name",
    header: "Nome",
    enableSorting: true,
  },
  {
    accessorKey: "organization_id",
    header: "Organização",
    enableSorting: true,
    cell: ({ row }) => row.original.organization_id ?? "—",
  },
  {
    accessorKey: "vehicle_count",
    header: "Veículos",
    enableSorting: false,
    cell: ({ row }) => row.original.vehicle_count,
  },
  {
    id: "actions",
    header: "Ações",
    enableSorting: false,
    cell: ({ row }) => (
      <ActionHintPopover label="Ver detalhes da frota">
        <Button asChild variant="outline" size="sm">
          <Link
            to="/frotas/$fleetId"
            params={{ fleetId: String(row.original.id) }}
            aria-label="Ver detalhes da frota"
          >
            Ver
          </Link>
        </Button>
      </ActionHintPopover>
    ),
  },
];

export const FleetsPage = () => {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const [{ page, sort, order, search, org }, setParams] = useQueryStates(
    fleetsSearchParams,
    { history: "replace" },
  );
  const [createOpen, setCreateOpen] = useState(false);

  const scopedOrgId =
    user?.role === "gestor_frota"
      ? (user.organization_id ?? undefined)
      : isAdmin
        ? (org ?? undefined)
        : undefined;

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize: PAGE_SIZE,
  };
  const sorting: SortingState = sort
    ? [{ id: sort, desc: order === "desc" }]
    : [];

  const { data, isLoading } = useGetFleetsFiltered({
    page,
    pageSize: PAGE_SIZE,
    search: search ?? undefined,
    organizationId: scopedOrgId,
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
    },
    defaults: FILTER_DEFAULTS,
    onApply: (values) =>
      setParams({
        org: values.org ?? null,
        page: 1,
      }),
  });

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

  return (
    <PageLayout
      title="Frotas"
      description="Visualize e gerencie todas as frotas cadastradas."
    >
      <section className="flex items-center justify-between gap-2">
        {isAdmin ? (
          <FilterSearchRow
            searchValue={search ?? ""}
            onDebouncedSearchChange={(value) =>
              setParams({ search: value || null, page: 1 })
            }
            placeholder="Buscar frota por nome ou ID"
            searchId="fleet-search"
          >
            <FilterModal
              open={filterOpen}
              onOpenChange={setFilterOpen}
              activeCount={activeCount}
              onApply={applyFilters}
              onClear={clearFilters}
              className="shrink-0"
            >
              <FormField id="fleet-org" label="Organização">
                <OrganizationsRelationSelect
                  value={draft.org ?? undefined}
                  onValueChange={(value) =>
                    setDraft((prev) => ({ ...prev, org: value ?? undefined }))
                  }
                  placeholder="Todas as organizações"
                  emptyLabel="Todas as organizações"
                  className="w-full"
                />
              </FormField>
            </FilterModal>
          </FilterSearchRow>
        ) : (
          <FilterInput
            placeholder="Buscar frota por nome ou ID"
            value={search ?? ""}
            debounceMs={300}
            onDebouncedChange={(value) =>
              setParams({ search: value || null, page: 1 })
            }
            className="min-w-0 flex-1"
          />
        )}
        <div className="flex shrink-0 items-center gap-2">
          <ExportButton
            url={buildFleetListExportUrl({
              organizationId: scopedOrgId,
              search: search ?? undefined,
            })}
          />
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Nova Frota
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

      <CreateFleetDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        defaultOrganizationId={
          user?.role === "gestor_frota"
            ? (user.organization_id ?? undefined)
            : undefined
        }
        isAdmin={isAdmin}
      />
    </PageLayout>
  );
};
