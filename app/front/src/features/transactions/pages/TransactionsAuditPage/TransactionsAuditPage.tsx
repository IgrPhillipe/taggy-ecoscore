import type { ColumnDef, OnChangeFn, PaginationState } from "@tanstack/react-table";
import { format } from "date-fns";
import { Eye } from "lucide-react";
import { useState } from "react";
import {
  parseAsInteger,
  useQueryStates,
} from "nuqs";
import { ActionHintPopover } from "@/components/ActionHintPopover";
import { OrganizationsRelationSelect, FleetsRelationSelect } from "@/components/form/relation-selects";
import { DataTable, entityIdColumn } from "@/components/DataTable";
import { PageLayout } from "@/components/layout/PageLayout";
import { TransactionFiltersForm } from "@/components/TransactionFilters/TransactionFilters";
import type { TransactionFilterState } from "@/components/TransactionFilters/TransactionFilters";
import { TRANSACTION_MODAL_FILTER_DEFAULTS } from "@/components/TransactionFilters/TransactionFilters";
import { FilterModal, FilterSearchRow } from "@/components/FilterModal";
import { FormField } from "@/components/form/FormField";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PAGE_SIZE } from "@/constants";
import { useCurrentUser } from "@/features/auth";
import { EXPORT_LABELS } from "@/features/reports/constants";
import { ExportButton, AuditExportButton } from "@/features/reports/components/ExportButton";
import { buildTransactionDetailExportUrl, buildTransactionListExportUrl } from "@/features/reports/lib/export-urls";
import type { Transaction } from "../../api/types";
import { useGetTransactions } from "../../hooks/useGetTransactions";

const formatNumber = (value: number | null, digits = 2) =>
  value != null ? value.toFixed(digits) : "—";

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("pt-BR");

const columns = (
  onViewDetails: (transaction: Transaction) => void,
  onSelect: (transaction: Transaction) => void,
): ColumnDef<Transaction>[] => [
  entityIdColumn<Transaction>(),
  {
    accessorKey: "created_at",
    header: "Data",
    cell: ({ row }) => formatDateTime(row.original.created_at),
  },
  {
    accessorKey: "plate",
    header: "Placa",
    cell: ({ row }) => row.original.plate ?? "—",
  },
  { accessorKey: "context", header: "Contexto" },
  {
    accessorKey: "uf",
    header: "UF",
    cell: ({ row }) => row.original.uf ?? "—",
  },
  {
    accessorKey: "is_digital",
    header: "Digital",
    cell: ({ row }) => (row.original.is_digital ? "Sim" : "Não"),
  },
  {
    accessorKey: "elapsed_time_sec",
    header: "Tempo (s)",
    cell: ({ row }) => formatNumber(row.original.elapsed_time_sec, 0),
  },
  {
    accessorKey: "co2_avoided_kg",
    header: "CO₂ (kg)",
    cell: ({ row }) => formatNumber(row.original.co2_avoided_kg, 3),
  },
  {
    accessorKey: "fuel_saved_liters",
    header: "Comb. (L)",
    cell: ({ row }) => formatNumber(row.original.fuel_saved_liters, 3),
  },
  {
    accessorKey: "time_saved_sec",
    header: "Tempo econ. (s)",
    cell: ({ row }) => formatNumber(row.original.time_saved_sec, 0),
  },
  {
    accessorKey: "financial_savings_brl",
    header: "Economia (R$)",
    cell: ({ row }) =>
      row.original.financial_savings_brl != null
        ? `R$ ${row.original.financial_savings_brl.toFixed(2)}`
        : "—",
  },
  {
    accessorKey: "water_saved_liters",
    header: "Água (L)",
    cell: ({ row }) => formatNumber(row.original.water_saved_liters, 2),
  },
  {
    accessorKey: "user_id",
    header: "User ID",
    cell: ({ row }) => row.original.user_id ?? "—",
  },
  {
    accessorKey: "vehicle_id",
    header: "Veículo ID",
    cell: ({ row }) => row.original.vehicle_id ?? "—",
  },
  {
    accessorKey: "organization_id",
    header: "Org ID",
    cell: ({ row }) => row.original.organization_id ?? "—",
  },
  {
    id: "actions",
    header: "Ações",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <ActionHintPopover label="Ver detalhes técnicos">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              onSelect(row.original);
              onViewDetails(row.original);
            }}
            aria-label="Ver detalhes técnicos"
          >
            <Eye className="h-4 w-4" />
          </Button>
        </ActionHintPopover>
        <ActionHintPopover label={EXPORT_LABELS.auditSpreadsheet}>
          <AuditExportButton transactionId={row.original.id} />
        </ActionHintPopover>
      </div>
    ),
  },
];

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
      setParams({ org: values.org ?? null, fleet: values.fleet ?? null, page: 1 });
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

  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize: PAGE_SIZE,
  };

  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : undefined;

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(pagination) : updater;
    setParams({ page: next.pageIndex + 1 });
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailTransaction(transaction);
    setDetailsOpen(true);
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
            className="max-w-md"
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
        columns={columns(handleViewDetails, handleSelectTransaction)}
        data={data?.items ?? []}
        isLoading={isLoading}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onRowClick={handleSelectTransaction}
        isRowSelected={(row) => row.id === selectedTransaction?.id}
      />

      <Sheet
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setDetailTransaction(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              Passagem #{detailTransaction?.id ?? ""}
            </SheetTitle>
          </SheetHeader>
          {detailTransaction && (
            <>
              <div className="mt-4">
                <ExportButton
                  url={buildTransactionDetailExportUrl(detailTransaction.id)}
                  label={EXPORT_LABELS.auditSpreadsheet}
                  variant="audit"
                />
              </div>
              <pre className="mt-4 overflow-x-auto rounded-md bg-neutral-100 p-4 text-xs">
                {JSON.stringify(detailTransaction.parameters_snapshot, null, 2)}
              </pre>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PageLayout>
  );
};
