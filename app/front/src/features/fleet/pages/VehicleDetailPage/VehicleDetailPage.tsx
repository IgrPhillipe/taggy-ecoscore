import { useQuery } from "@tanstack/react-query";
import type { ColumnDef, OnChangeFn, PaginationState } from "@tanstack/react-table";
import { Clock, Coins, Fuel, Leaf, Scroll, Ticket } from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { DataTable, entityIdColumn, EnumBadge, RelatedEntityCell } from "@/components/DataTable";
import { DetailInfoRow } from "@/components/DetailInfoRow";
import { PageBackLink, PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/constants";
import { useFleetNameMap } from "@/hooks/useFleetNameMap";
import { useOrganizationNameMap } from "@/hooks/useOrganizationNameMap";
import { KpiCard, SectionCard } from "@/features/sustainability/components/MetricCard";
import {
  formatEnvironmentalFinancial,
  formatKpiCo2,
  formatKpiCount,
  formatKpiFuel,
  formatKpiPaper,
  formatKpiTimeSaved,
  KPI_ICON_SIZE,
  KPI_TITLES,
} from "@/features/sustainability/lib/kpi";
import { TransactionFiltersForm } from "@/components/TransactionFilters/TransactionFilters";
import type { TransactionFilterState } from "@/components/TransactionFilters/TransactionFilters";
import { TRANSACTION_MODAL_FILTER_DEFAULTS } from "@/components/TransactionFilters/TransactionFilters";
import { FilterModal } from "@/components/FilterModal";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import { getVehicle, getVehicleTransactionsFiltered, getVehicleSummary } from "../../api/requests";
import { vehicleKeys } from "../../api/query-keys";
import type { VehicleTransaction } from "../../api/types";
import { VehicleFormDialog } from "../../components/VehicleFormDialog/VehicleFormDialog";
import {
  transactionContextColumn,
  transactionPlateColumn,
  transactionUfColumn,
} from "@/features/transactions/lib/transaction-table-columns";
import { FUEL_TYPE_LABELS, VEHICLE_CATEGORY_LABELS } from "@/lib/enum-labels";
import { ExportButton } from "@/features/reports/components/ExportButton";
import { buildVehicleDetailExportUrl } from "@/features/reports/lib/export-urls";
import { transactionActionsColumn } from "@/features/reports/components/transaction-audit-action-column";
import { TransactionDetailsDialog } from "@/features/transactions/components/TransactionDetails";
import type { Transaction } from "@/features/transactions/api/types";
import { vehicleTransactionToTransaction } from "@/features/transactions/lib/vehicle-transaction-to-transaction";
import {
  formatTxCo2,
  formatTxCurrency,
  formatTxFuel,
} from "@/features/transactions/lib/transaction-metric-formatters";

type VehicleDetailPageProps = {
  vehicleId: number;
};

const baseTransactionColumns: ColumnDef<VehicleTransaction>[] = [
  entityIdColumn<VehicleTransaction>(),
  transactionPlateColumn<VehicleTransaction>(),
  transactionContextColumn<VehicleTransaction>(),
  transactionUfColumn<VehicleTransaction>(),
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
    accessorKey: "financial_savings_brl",
    header: "Economia",
    cell: ({ row }) => formatTxCurrency(row.original.financial_savings_brl),
  },
  {
    accessorKey: "created_at",
    header: "DATA",
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString("pt-BR"),
  },
];

const InfoRow = DetailInfoRow;

export const VehicleDetailPage = ({ vehicleId }: VehicleDetailPageProps) => {
  const orgNameMap = useOrganizationNameMap();
  const fleetNameMap = useFleetNameMap();
  const [txPage, setTxPage] = useState(1);
  const [txFilters, setTxFilters] = useState<TransactionFilterState>({});
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

  const { data: vehicle, isLoading: vehicleLoading } = useQuery({
    queryKey: vehicleKeys.detail(vehicleId),
    queryFn: () => getVehicle(vehicleId),
  });

  const { data: summary } = useQuery({
    queryKey: vehicleKeys.summary(vehicleId),
    queryFn: () => getVehicleSummary(vehicleId),
  });

  const filters = {
    context: txFilters.context,
    uf: txFilters.uf,
    fromDate: txFilters.dateRange?.from ? format(txFilters.dateRange.from, "yyyy-MM-dd") : undefined,
    toDate: txFilters.dateRange?.to ? format(txFilters.dateRange.to, "yyyy-MM-dd") : undefined,
  };

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: vehicleKeys.transactions(vehicleId, txPage, filters),
    queryFn: () => getVehicleTransactionsFiltered(vehicleId, txPage, PAGE_SIZE, filters),
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
      title={vehicleLoading ? "Carregando…" : (vehicle?.model ?? "Veículo")}
      description={
        vehicle
          ? `${vehicle.license_plate} · ${FUEL_TYPE_LABELS[vehicle.fuel_type] ?? vehicle.fuel_type}`
          : "Detalhes do veículo."
      }
      back={<PageBackLink to="/frota" label="Veículos" />}
      actions={
        <ExportButton
          url={buildVehicleDetailExportUrl({
            vehicleId,
            context: filters.context,
            uf: filters.uf,
            fromDate: filters.fromDate,
            toDate: filters.toDate,
          })}
        />
      }
    >
      <SectionCard title="Informações">
        <InfoRow label="TAG ID" value={vehicle?.id_tag} />
        <InfoRow label="Placa" value={vehicle?.license_plate} />
        <InfoRow label="Modelo" value={vehicle?.model} />
        <InfoRow
          label="Combustível"
          value={
            vehicle?.fuel_type ? (
              <EnumBadge value={vehicle.fuel_type} labels={FUEL_TYPE_LABELS} />
            ) : undefined
          }
        />
        <InfoRow
          label="Categoria"
          value={
            vehicle?.category ? (
              <EnumBadge
                value={vehicle.category}
                labels={VEHICLE_CATEGORY_LABELS}
              />
            ) : undefined
          }
        />
        {vehicle?.organization_id != null ? (
          <InfoRow
            label="Organização"
            value={
              <RelatedEntityCell
                id={vehicle.organization_id}
                labelMap={orgNameMap}
              />
            }
          />
        ) : null}
        {vehicle?.fleet_id != null ? (
          <InfoRow
            label="Frota"
            value={
              <RelatedEntityCell id={vehicle.fleet_id} labelMap={fleetNameMap} />
            }
          />
        ) : null}
        <InfoRow
          label="Autonomia média (km/L)"
          value={
            vehicle?.average_autonomy_km != null
              ? String(vehicle.average_autonomy_km)
              : undefined
          }
        />
        <div className="mt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            Editar veículo
          </Button>
        </div>
      </SectionCard>

      {vehicle && (
        <VehicleFormDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          vehicle={vehicle}
        />
      )}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title={KPI_TITLES.passages}
          value={formatKpiCount(summary?.transaction_count)}
          icon={<Ticket className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.co2Avoided}
          value={formatKpiCo2(summary?.co2_total_kg)}
          icon={<Leaf className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.fuelSaved}
          value={formatKpiFuel(summary?.fuel_total_liters)}
          icon={<Fuel className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.hoursSaved}
          value={formatKpiTimeSaved(summary?.time_total_sec)}
          icon={<Clock className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.paperSaved}
          value={formatKpiPaper(summary?.paper_saved_meters)}
          icon={<Scroll className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.financialSavings}
          value={formatEnvironmentalFinancial(summary ?? {})}
          icon={<Coins className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
      </div>

      <SectionCard title="Passagens">
        <div className="mb-3">
          <FilterModal
            open={filterOpen}
            onOpenChange={setFilterOpen}
            activeCount={txActiveCount}
            onApply={applyTxFilters}
            onClear={clearTxFilters}
          >
            <TransactionFiltersForm
              filters={txDraft}
              onChange={setTxDraft}
            />
          </FilterModal>
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
