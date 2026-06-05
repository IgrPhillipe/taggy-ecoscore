import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, OnChangeFn, PaginationState } from "@tanstack/react-table";
import { Coins, Fuel, Leaf, Scroll, Ticket } from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { DriverFormDialog } from "../../components/DriverFormDialog/DriverFormDialog";
import { DataTable, entityIdColumn } from "@/components/DataTable";
import { PageBackLink, PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/constants";
import { getUserById } from "@/features/users/api/requests";
import { userQueryKeys } from "@/features/users/api/query-keys";
import { userStatsKeys } from "@/features/dashboard/api/query-keys";
import { transactionKeys } from "@/features/transactions/api/query-keys";
import { getUserTransactions } from "@/features/fleet/api/requests";
import type { VehicleTransaction } from "@/features/fleet/api/types";
import { KpiCard, SectionCard } from "@/features/sustainability/components/MetricCard";
import {
  formatEnvironmentalFinancial,
  formatKpiCo2,
  formatKpiCount,
  formatKpiFuel,
  formatKpiPaper,
  KPI_ICON_SIZE,
  KPI_TITLES,
} from "@/features/sustainability/lib/kpi";
import { TransactionFiltersForm } from "@/components/TransactionFilters/TransactionFilters";
import type { TransactionFilterState } from "@/components/TransactionFilters/TransactionFilters";
import { TRANSACTION_MODAL_FILTER_DEFAULTS } from "@/components/TransactionFilters/TransactionFilters";
import { FilterModal, FilterSearchRow } from "@/components/FilterModal";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import { api } from "@/lib/http-client";
import { ExportButton } from "@/features/reports/components/ExportButton";
import { buildDriverDetailExportUrl } from "@/features/reports/lib/export-urls";
import { transactionActionsColumn } from "@/features/reports/components/transaction-audit-action-column";
import { TransactionDetailsDialog } from "@/features/transactions/components/TransactionDetails";
import type { Transaction } from "@/features/transactions/api/types";
import { vehicleTransactionToTransaction } from "@/features/transactions/lib/vehicle-transaction-to-transaction";

type DriverDetailPageProps = {
  driverId: number;
};

type UserStats = {
  co2_total_kg: number;
  fuel_total_liters: number;
  financial_total_brl: number;
  transactions_count: number;
  total_time_saved_sec: number;
  paper_saved_meters: number;
};

const baseTransactionColumns: ColumnDef<VehicleTransaction>[] = [
  entityIdColumn<VehicleTransaction>(),
  {
    accessorKey: "plate",
    header: "PLACA",
    cell: ({ row }) => row.original.plate ?? "—",
  },
  { accessorKey: "context", header: "CONTEXTO" },
  { accessorKey: "uf", header: "UF", cell: ({ row }) => row.original.uf ?? "—" },
  {
    accessorKey: "co2_avoided_kg",
    header: "CO₂ Evitado (kg)",
    cell: ({ row }) =>
      row.original.co2_avoided_kg != null
        ? row.original.co2_avoided_kg.toFixed(3)
        : "—",
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
    accessorKey: "created_at",
    header: "DATA",
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString("pt-BR"),
  },
];

const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
  <div className="flex justify-between border-b border-neutral-100 py-2 text-sm last:border-0">
    <span className="text-neutral-500">{label}</span>
    <span className="font-medium text-neutral-900">{value ?? "—"}</span>
  </div>
);

const roleLabels: Record<string, string> = {
  motorista: "Motorista",
  gestor_frota: "Gestor de Frota",
  admin: "Administrador",
};

export const DriverDetailPage = ({ driverId }: DriverDetailPageProps) => {
  const [txPage, setTxPage] = useState(1);
  const [txFilters, setTxFilters] = useState<
    Pick<TransactionFilterState, "context" | "uf" | "dateRange">
  >({});
  const [plateSearch, setPlateSearch] = useState("");
  const debouncedPlate = useDebouncedValue(plateSearch, 300);
  const [editOpen, setEditOpen] = useState(false);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const transactionColumns = useMemo(
    () => [
      ...baseTransactionColumns,
      transactionActionsColumn<VehicleTransaction>({
        onViewDetails: (tx) => {
          setDetailTx(vehicleTransactionToTransaction(tx));
          setDetailsOpen(true);
        },
      }),
    ],
    [],
  );

  const { data: driver, isLoading: driverLoading } = useQuery({
    queryKey: userQueryKeys.detail(driverId),
    queryFn: () => getUserById(driverId),
  });

  const { data: stats } = useQuery({
    queryKey: userStatsKeys.detail(driverId),
    queryFn: () => api.get(`/api/user-stats/${driverId}`).json<UserStats>(),
  });

  const filters = {
    plate: debouncedPlate || undefined,
    context: txFilters.context,
    uf: txFilters.uf,
    fromDate: txFilters.dateRange?.from ? format(txFilters.dateRange.from, "yyyy-MM-dd") : undefined,
    toDate: txFilters.dateRange?.to ? format(txFilters.dateRange.to, "yyyy-MM-dd") : undefined,
  };

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: transactionKeys.user(driverId, txPage, filters),
    queryFn: () => getUserTransactions(driverId, txPage, PAGE_SIZE, filters),
  });

  const txPagination: PaginationState = {
    pageIndex: txPage - 1,
    pageSize: PAGE_SIZE,
  };

  const handleTxPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(txPagination) : updater;
    setTxPage(next.pageIndex + 1);
  };

  const {
    open: filterOpen,
    setOpen: setFilterOpen,
    draft: txDraft,
    setDraft: setTxDraft,
    apply: applyTxFilters,
    clear: clearTxFilters,
    activeCount: txActiveCount,
  } = useFilterDraft({
    applied: txFilters,
    defaults: TRANSACTION_MODAL_FILTER_DEFAULTS,
    onApply: (values) => {
      setTxFilters(values);
      setTxPage(1);
    },
  });

  return (
    <PageLayout
      title={driverLoading ? "Carregando…" : (driver?.name ?? "Motorista")}
      description="Detalhes e histórico do motorista."
      back={<PageBackLink to="/motoristas" label="Motoristas" />}
      actions={
        <ExportButton
          url={buildDriverDetailExportUrl({
            driverId,
            plate: filters.plate,
            context: filters.context,
            uf: filters.uf,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
          })}
        />
      }
    >
      <SectionCard title="Informações">
        <InfoRow label="Nome" value={driver?.name} />
        <InfoRow label="E-mail" value={driver?.email} />
        <InfoRow
          label="Função"
          value={driver?.role ? roleLabels[driver.role] ?? driver.role : undefined}
        />
        <div className="mt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Editar motorista
          </Button>
        </div>
      </SectionCard>

      {driver && driver.role === "motorista" && (
        <DriverFormDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          driver={driver}
        />
      )}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          title={KPI_TITLES.passages}
          value={formatKpiCount(stats?.transactions_count)}
          icon={<Ticket className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.co2Avoided}
          value={formatKpiCo2(stats?.co2_total_kg)}
          icon={<Leaf className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.fuelSaved}
          value={formatKpiFuel(stats?.fuel_total_liters)}
          icon={<Fuel className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.paperSaved}
          value={formatKpiPaper(stats?.paper_saved_meters)}
          icon={<Scroll className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.financialSavings}
          value={formatEnvironmentalFinancial(stats ?? {})}
          icon={<Coins className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
      </div>

      <SectionCard title="Passagens">
        <div className="mb-3">
          <FilterSearchRow
            searchValue={plateSearch}
            onDebouncedSearchChange={setPlateSearch}
            placeholder="Buscar por placa"
            searchId="driver-tx-plate-search"
            plate
            className="max-w-md"
          >
            <FilterModal
              open={filterOpen}
              onOpenChange={setFilterOpen}
              activeCount={txActiveCount}
              onApply={applyTxFilters}
              onClear={clearTxFilters}
              className="shrink-0"
            >
              <TransactionFiltersForm
                filters={txDraft}
                onChange={setTxDraft}
              />
            </FilterModal>
          </FilterSearchRow>
        </div>
        <DataTable
          columns={transactionColumns}
          data={txData?.items ?? []}
          isLoading={txLoading}
          pageCount={txData ? Math.ceil(txData.total / PAGE_SIZE) : undefined}
          pagination={txPagination}
          onPaginationChange={handleTxPaginationChange}
        />
      </SectionCard>

      <TransactionDetailsDialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setDetailTx(null);
        }}
        transaction={detailTx}
      />
    </PageLayout>
  );
};
