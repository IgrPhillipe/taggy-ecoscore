import type {
  ColumnDef,
  OnChangeFn,
  PaginationState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { parseAsInteger, useQueryStates } from "nuqs";
import {
  OrganizationsRelationSelect,
  FleetsRelationSelect,
} from "@/components/form/relation-selects";
import { DataTable, entityIdColumn } from "@/components/DataTable";
import { PageLayout } from "@/components/layout/PageLayout";
import { TransactionFiltersForm } from "@/components/TransactionFilters/TransactionFilters";
import type { TransactionFilterState } from "@/components/TransactionFilters/TransactionFilters";
import { TRANSACTION_MODAL_FILTER_DEFAULTS } from "@/components/TransactionFilters/TransactionFilters";
import { FilterModal, FilterSearchRow } from "@/components/FilterModal";
import { FormField } from "@/components/form/FormField";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useEntityLabelMap } from "@/hooks/useEntityLabelMap";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import { useOrganizationNameMap } from "@/hooks/useOrganizationNameMap";
import { PAGE_SIZE } from "@/constants";
import { useCurrentUser } from "@/features/auth";
import { getVehicle } from "@/features/fleet/api/requests";
import { vehicleKeys } from "@/features/fleet/api/query-keys";
import { getUserById } from "@/features/users/api/requests";
import { userQueryKeys } from "@/features/users/api/query-keys";
import {
  transactionContextColumn,
  transactionDigitalColumn,
  transactionOrganizationColumn,
  transactionPlateColumn,
  transactionUfColumn,
  transactionUserColumn,
  transactionVehicleColumn,
} from "@/features/transactions/lib/transaction-table-columns";
import { ExportButton } from "@/features/reports/components/ExportButton";
import { transactionActionsColumn } from "@/features/reports/components/transaction-audit-action-column";
import { buildTransactionListExportUrl } from "@/features/reports/lib/export-urls";
import { TransactionDetailsDialog } from "../../components/TransactionDetails";
import type { Transaction } from "../../api/types";
import { useGetTransactions } from "../../hooks/useGetTransactions";
import { getTransactionElapsedSec } from "@/features/transactions/lib/transaction-display-fields";
import {
  formatTxCo2,
  formatTxCurrency,
  formatTxElapsedTime,
  formatTxFuel,
  formatTxTimeSaved,
  formatTxWater,
} from "@/features/transactions/lib/transaction-metric-formatters";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR");

function buildAuditColumns(
  orgNameMap: Map<number, string>,
  userNameMap: Map<number, string>,
  vehicleLabelMap: Map<number, string>,
): ColumnDef<Transaction>[] {
  return [
    entityIdColumn<Transaction>(),
    {
      accessorKey: "created_at",
      header: "Data",
      cell: ({ row }) => formatDateTime(row.original.created_at),
    },
    transactionPlateColumn<Transaction>("Placa"),
    transactionContextColumn<Transaction>("Contexto"),
    transactionUfColumn<Transaction>(),
    transactionDigitalColumn<Transaction>(),
    {
      accessorKey: "elapsed_time_sec",
      header: "Tempo",
      cell: ({ row }) =>
        formatTxElapsedTime(getTransactionElapsedSec(row.original)),
    },
    {
      accessorKey: "co2_avoided_kg",
      header: "CO₂ evitado",
      cell: ({ row }) => formatTxCo2(row.original.co2_avoided_kg),
    },
    {
      accessorKey: "fuel_saved_liters",
      header: "Combustível",
      cell: ({ row }) => formatTxFuel(row.original.fuel_saved_liters),
    },
    {
      accessorKey: "time_saved_sec",
      header: "Tempo econ.",
      cell: ({ row }) => formatTxTimeSaved(row.original.time_saved_sec),
    },
    {
      accessorKey: "financial_savings_brl",
      header: "Economia",
      cell: ({ row }) => formatTxCurrency(row.original.financial_savings_brl),
    },
    {
      accessorKey: "water_saved_liters",
      header: "Água",
      cell: ({ row }) => formatTxWater(row.original.water_saved_liters),
    },
    transactionUserColumn<Transaction>(userNameMap),
    transactionVehicleColumn<Transaction>(vehicleLabelMap),
    transactionOrganizationColumn<Transaction>(orgNameMap),
  ];
}

const auditSearchParams = {
  page: parseAsInteger.withDefault(1),
  org: parseAsInteger,
  fleet: parseAsInteger,
};

const AUDIT_FILTER_DEFAULTS = {
  ...TRANSACTION_MODAL_FILTER_DEFAULTS,
  org: undefined as number | undefined,
  fleet: undefined as number | undefined,
};

type AuditModalFilterState = typeof AUDIT_FILTER_DEFAULTS;

export const TransactionsAuditPage = () => {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const [{ page, org, fleet }, setParams] = useQueryStates(auditSearchParams, {
    history: "replace",
  });
  const [filters, setFilters] = useState<
    Pick<TransactionFilterState, "context" | "uf" | "dateRange">
  >({});
  const [plateSearch, setPlateSearch] = useState("");
  const debouncedPlate = useDebouncedValue(plateSearch, 300);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [detailTransaction, setDetailTransaction] =
    useState<Transaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const appliedAuditFilters: AuditModalFilterState = {
    context: filters.context,
    uf: filters.uf,
    dateRange: filters.dateRange,
    org: org ?? undefined,
    fleet: fleet ?? undefined,
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
    applied: appliedAuditFilters,
    defaults: AUDIT_FILTER_DEFAULTS,
    onApply: (values) => {
      setFilters({
        context: values.context,
        uf: values.uf,
        dateRange: values.dateRange,
      });
      setParams({
        org: values.org ?? null,
        fleet: values.fleet ?? null,
        page: 1,
      });
    },
  });

  const scopedOrgId =
    user?.role === "gestor_frota"
      ? (user.organization_id ?? undefined)
      : isAdmin
        ? (org ?? undefined)
        : undefined;

  const draftFleetOrgId =
    user?.role === "gestor_frota"
      ? (user.organization_id ?? undefined)
      : isAdmin
        ? (draft.org ?? undefined)
        : undefined;

  const { data, isLoading } = useGetTransactions({
    page,
    pageSize: PAGE_SIZE,
    organizationId: scopedOrgId,
    fleetId: fleet ?? undefined,
    plate: debouncedPlate || undefined,
    context: filters.context,
    uf: filters.uf,
    fromDate: filters.dateRange?.from
      ? format(filters.dateRange.from, "yyyy-MM-dd")
      : undefined,
    toDate: filters.dateRange?.to
      ? format(filters.dateRange.to, "yyyy-MM-dd")
      : undefined,
  });

  const orgNameMap = useOrganizationNameMap();
  const items = data?.items ?? [];
  const userNameMap = useEntityLabelMap(
    items.map((item) => item.user_id),
    userQueryKeys.detail,
    getUserById,
    (user) => user.name,
  );
  const vehicleLabelMap = useEntityLabelMap(
    items.map((item) => item.vehicle_id),
    vehicleKeys.detail,
    getVehicle,
    (vehicle) =>
      vehicle.model?.trim() ||
      vehicle.license_plate ||
      `#${vehicle.id}`,
  );

  const columns = useMemo(() => {
    const base = buildAuditColumns(orgNameMap, userNameMap, vehicleLabelMap);
    return [
      ...base,
      transactionActionsColumn<Transaction>({
        onViewDetails: (transaction) => {
          setSelectedTransaction(transaction);
          setDetailTransaction(transaction);
          setDetailsOpen(true);
        },
      }),
    ];
  }, [orgNameMap, userNameMap, vehicleLabelMap]);

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize: PAGE_SIZE,
  };

  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : undefined;

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    setParams({ page: next.pageIndex + 1 });
  };

  const handleSelectTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const listExportUrl = buildTransactionListExportUrl({
    organizationId: scopedOrgId,
    fleetId: fleet ?? undefined,
    plate: debouncedPlate || undefined,
    context: filters.context,
    uf: filters.uf,
    fromDate: filters.dateRange?.from
      ? format(filters.dateRange.from, "yyyy-MM-dd")
      : undefined,
    toDate: filters.dateRange?.to
      ? format(filters.dateRange.to, "yyyy-MM-dd")
      : undefined,
  });

  return (
    <PageLayout
      title="Passagens"
      description="Auditoria completa de todas as transações registradas no sistema."
    >
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSearchRow
            searchValue={plateSearch}
            onDebouncedSearchChange={setPlateSearch}
            placeholder="Buscar por placa"
            searchId="audit-plate-search"
            plate
          >
            <FilterModal
              open={filterOpen}
              onOpenChange={setFilterOpen}
              activeCount={activeCount}
              onApply={applyFilters}
              onClear={clearFilters}
              className="shrink-0"
            >
              <TransactionFiltersForm
                filters={draft}
                onChange={(txValues) =>
                  setDraft((prev) => ({ ...prev, ...txValues }))
                }
              />
              {isAdmin ? (
                <FormField id="audit-org" label="Organização">
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
              <FormField id="audit-fleet" label="Frota">
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
          <div className="ml-auto flex items-center gap-2">
            <ExportButton url={listExportUrl} />
          </div>
        </div>
      </section>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onRowClick={handleSelectTransaction}
        isRowSelected={(row) => row.id === selectedTransaction?.id}
      />

      <TransactionDetailsDialog
        open={detailsOpen}
        onOpenChange={(open: boolean) => {
          setDetailsOpen(open);
          if (!open) setDetailTransaction(null);
        }}
        transaction={detailTransaction}
      />
    </PageLayout>
  );
};
