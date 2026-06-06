import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ColumnDef, OnChangeFn, PaginationState } from "@tanstack/react-table";
import { Car, Coins, Fuel, Leaf, Link2, Scroll, Ticket, Unlink, Users } from "lucide-react";
import { format } from "date-fns";
import { useMemo, useState } from "react";
import { ActionHintPopover } from "@/components/ActionHintPopover";
import { DataTable, entityIdColumn, EnumBadge } from "@/components/DataTable";
import { PageBackLink, PageLayout } from "@/components/layout/PageLayout";
import { FilterModal } from "@/components/FilterModal";
import { FilterInput } from "@/components/ui/FilterInput";
import { Button } from "@/components/ui/button";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PAGE_SIZE } from "@/constants";
import { KpiCard } from "@/features/sustainability/components/MetricCard";
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
import {
  UsersRelationSelect,
  VehiclesRelationSelect,
} from "@/components/form/relation-selects";
import type { User } from "@/features/users/api/types";
import {
  getFleetSummary,
  getFleetTransactions,
  getFleetUsers,
  getFleetVehicles,
} from "../../api/requests";
import { fleetKeys } from "../../api/fleet-query-keys";
import {
  useLinkFleetUser,
  useLinkFleetVehicle,
  useUnlinkFleetUser,
  useUnlinkFleetVehicle,
} from "../../hooks/useFleetMutations";
import type { VehicleTransaction } from "../../api/types";
import type { Vehicle } from "../../schemas/vehicle-schema";
import { ExportButton } from "@/features/reports/components/ExportButton";
import { buildFleetDetailExportUrl } from "@/features/reports/lib/export-urls";
import { transactionActionsColumn } from "@/features/reports/components/transaction-audit-action-column";
import { TransactionDetailsDialog } from "@/features/transactions/components/TransactionDetails";
import type { Transaction } from "@/features/transactions/api/types";
import { vehicleTransactionToTransaction } from "@/features/transactions/lib/vehicle-transaction-to-transaction";
import { formatTxCurrency } from "@/features/transactions/lib/transaction-metric-formatters";
import {
  FUEL_TYPE_LABELS,
  USER_ROLE_LABELS,
} from "@/lib/enum-labels";
import {
  transactionContextColumn,
  transactionPlateColumn,
  transactionUfColumn,
} from "@/features/transactions/lib/transaction-table-columns";

type FleetDetailPageProps = {
  fleetId: number;
  fleetName: string;
};

const makeVehicleColumns = (
  onUnlink: (vehicle: Vehicle) => void,
): ColumnDef<Vehicle>[] => [
  entityIdColumn<Vehicle>(),
  { accessorKey: "id_tag", header: "TAG ID", enableSorting: true },
  { accessorKey: "license_plate", header: "PLACA", enableSorting: true },
  { accessorKey: "model", header: "MODELO", enableSorting: true },
  {
    accessorKey: "fuel_type",
    header: "COMBUSTÍVEL",
    enableSorting: true,
    cell: ({ row }) => (
      <EnumBadge value={row.original.fuel_type} labels={FUEL_TYPE_LABELS} />
    ),
  },
  {
    id: "actions",
    header: "AÇÕES",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <ActionHintPopover label="Ver detalhes do veículo">
          <Button asChild variant="outline" size="sm">
            <Link
              to="/frota/$id"
              params={{ id: String(row.original.id) }}
              aria-label="Ver detalhes do veículo"
            >
              Ver
            </Link>
          </Button>
        </ActionHintPopover>
        <ActionHintPopover label="Desvincular veículo da frota">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUnlink(row.original)}
            aria-label="Desvincular veículo da frota"
          >
            <Unlink className="h-3 w-3" />
          </Button>
        </ActionHintPopover>
      </div>
    ),
  },
];

const makeDriverColumns = (
  onUnlink: (user: User) => void,
): ColumnDef<User>[] => [
  entityIdColumn<User>(),
  { accessorKey: "name", header: "NOME", enableSorting: true },
  { accessorKey: "email", header: "E-MAIL", enableSorting: true },
  {
    accessorKey: "role",
    header: "FUNÇÃO",
    enableSorting: true,
    cell: ({ row }) => (
      <EnumBadge value={row.original.role} labels={USER_ROLE_LABELS} />
    ),
  },
  {
    id: "actions",
    header: "AÇÕES",
    enableSorting: false,
    cell: ({ row }) => (
      <ActionHintPopover label="Desvincular motorista da frota">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUnlink(row.original)}
          aria-label="Desvincular motorista da frota"
        >
          <Unlink className="h-3 w-3" />
        </Button>
      </ActionHintPopover>
    ),
  },
];

const baseTransactionColumns: ColumnDef<VehicleTransaction>[] = [
  entityIdColumn<VehicleTransaction>(),
  transactionPlateColumn<VehicleTransaction>(),
  transactionContextColumn<VehicleTransaction>(),
  transactionUfColumn<VehicleTransaction>(),
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

export const FleetDetailPage = ({ fleetId, fleetName }: FleetDetailPageProps) => {
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [txFilters, setTxFilters] = useState<TransactionFilterState>({});
  const [linkVehicleOpen, setLinkVehicleOpen] = useState(false);
  const [linkUserOpen, setLinkUserOpen] = useState(false);
  const [detailTx, setDetailTx] = useState<Transaction | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLinkVehicleId, setSelectedLinkVehicleId] = useState<number | undefined>();
  const [selectedLinkUserId, setSelectedLinkUserId] = useState<number | undefined>();

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

  const { data: summary } = useQuery({
    queryKey: fleetKeys.summary(fleetId),
    queryFn: () => getFleetSummary(fleetId),
  });

  const { data: fleetVehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: fleetKeys.vehicles(fleetId),
    queryFn: () => getFleetVehicles(fleetId),
  });

  const { data: fleetUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: fleetKeys.users(fleetId),
    queryFn: () => getFleetUsers(fleetId),
  });

  const txApiFilters = {
    context: txFilters.context,
    uf: txFilters.uf,
    fromDate: txFilters.dateRange?.from ? format(txFilters.dateRange.from, "yyyy-MM-dd") : undefined,
    toDate: txFilters.dateRange?.to ? format(txFilters.dateRange.to, "yyyy-MM-dd") : undefined,
  };

  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: fleetKeys.transactions(fleetId, txPage, txApiFilters),
    queryFn: () => getFleetTransactions(fleetId, txPage, PAGE_SIZE, txApiFilters),
  });

  const txPagination: PaginationState = { pageIndex: txPage - 1, pageSize: PAGE_SIZE };

  const handleTxPaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const next = typeof updater === "function" ? updater(txPagination) : updater;
    setTxPage(next.pageIndex + 1);
  };

  const unlinkVehicleMutation = useUnlinkFleetVehicle(fleetId);
  const linkVehicleMutation = useLinkFleetVehicle(fleetId);
  const unlinkUserMutation = useUnlinkFleetUser(fleetId);
  const linkUserMutation = useLinkFleetUser(fleetId);

  const filteredVehicles = useMemo(() => {
    if (!vehicleSearch.trim()) return fleetVehicles;
    const q = vehicleSearch.toLowerCase();
    return fleetVehicles.filter(
      (v) =>
        v.license_plate.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.id_tag.toLowerCase().includes(q),
    );
  }, [fleetVehicles, vehicleSearch]);

  const filteredDrivers = useMemo(() => {
    if (!driverSearch.trim()) return fleetUsers;
    const q = driverSearch.toLowerCase();
    return fleetUsers.filter((u) => u.name.toLowerCase().includes(q));
  }, [fleetUsers, driverSearch]);

  const {
    open: txFilterOpen,
    setOpen: setTxFilterOpen,
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

  const fleetUserIds = fleetUsers.map((u) => u.id);
  const fleetVehicleIds = fleetVehicles.map((v) => v.id);

  return (
    <PageLayout
      title={`#${fleetId} · ${fleetName}`}
      description="Detalhes e métricas da frota."
      back={<PageBackLink to="/frotas" label="Frotas" />}
      actions={<ExportButton url={buildFleetDetailExportUrl(fleetId)} />}
    >
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-7">
        <KpiCard title={KPI_TITLES.vehicles} value={formatKpiCount(summary?.vehicle_count)} icon={<Car className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.drivers} value={formatKpiCount(summary?.driver_count)} icon={<Users className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.passages} value={formatKpiCount(summary?.transaction_count)} icon={<Ticket className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.co2Avoided} value={formatKpiCo2(summary?.co2_total_kg)} icon={<Leaf className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.fuelSaved} value={formatKpiFuel(summary?.fuel_total_liters)} icon={<Fuel className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.paperSaved} value={formatKpiPaper(summary?.paper_saved_meters)} icon={<Scroll className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
        <KpiCard title={KPI_TITLES.financialSavings} value={formatEnvironmentalFinancial(summary ?? {})} icon={<Coins className="text-[#72C215]" size={KPI_ICON_SIZE} />} />
      </div>

      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">Veículos</TabsTrigger>
          <TabsTrigger value="drivers">Motoristas</TabsTrigger>
          <TabsTrigger value="passagens">Passagens</TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <div className="mb-3 flex items-center justify-between gap-2">
            <FilterInput
              placeholder="Buscar por placa ou modelo"
              value={vehicleSearch}
              debounceMs={300}
              onDebouncedChange={setVehicleSearch}
              className="max-w-xs flex-1"
            />
            <Button size="sm" onClick={() => setLinkVehicleOpen(true)}>
              <Link2 className="mr-1 h-3 w-3" />
              Vincular Veículo
            </Button>
          </div>
          <DataTable
            columns={makeVehicleColumns((v) => unlinkVehicleMutation.mutate(v.id))}
            data={filteredVehicles}
            isLoading={vehiclesLoading}
          />
        </TabsContent>

        <TabsContent value="drivers">
          <div className="mb-3 flex items-center justify-between gap-2">
            <FilterInput
              placeholder="Buscar por nome"
              value={driverSearch}
              debounceMs={300}
              onDebouncedChange={setDriverSearch}
              className="max-w-xs flex-1"
            />
            <Button size="sm" onClick={() => setLinkUserOpen(true)}>
              <Link2 className="mr-1 h-3 w-3" />
              Vincular Motorista
            </Button>
          </div>
          <DataTable
            columns={makeDriverColumns((u) => unlinkUserMutation.mutate(u.id))}
            data={filteredDrivers}
            isLoading={usersLoading}
          />
        </TabsContent>

        <TabsContent value="passagens">
          <div className="mb-3">
            <FilterModal
              open={txFilterOpen}
              onOpenChange={setTxFilterOpen}
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
        </TabsContent>
      </Tabs>

      <Dialog
        open={linkVehicleOpen}
        onOpenChange={(open) => {
          setLinkVehicleOpen(open);
          if (!open) setSelectedLinkVehicleId(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Veículo</DialogTitle>
          </DialogHeader>
          <VehiclesRelationSelect
            value={selectedLinkVehicleId}
            onValueChange={(value) =>
              setSelectedLinkVehicleId(typeof value === "number" ? value : undefined)
            }
            semFrota
            excludeIds={fleetVehicleIds}
            placeholder="Selecione um veículo sem frota"
            allowEmpty={false}
            className="mb-4"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLinkVehicleOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={selectedLinkVehicleId == null || linkVehicleMutation.isPending}
              onClick={() => {
                if (selectedLinkVehicleId != null) {
                  linkVehicleMutation.mutate(selectedLinkVehicleId, {
                    onSuccess: () => {
                      setLinkVehicleOpen(false);
                      setSelectedLinkVehicleId(undefined);
                    },
                  });
                }
              }}
            >
              <ButtonLoadingContent loading={linkVehicleMutation.isPending}>
                Vincular
              </ButtonLoadingContent>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={linkUserOpen}
        onOpenChange={(open) => {
          setLinkUserOpen(open);
          if (!open) setSelectedLinkUserId(undefined);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Motorista</DialogTitle>
          </DialogHeader>
          <UsersRelationSelect
            value={selectedLinkUserId}
            onValueChange={setSelectedLinkUserId}
            role="motorista"
            excludeIds={fleetUserIds}
            placeholder="Selecione um motorista"
            allowEmpty={false}
            className="mb-4"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setLinkUserOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={selectedLinkUserId == null || linkUserMutation.isPending}
              onClick={() => {
                if (selectedLinkUserId != null) {
                  linkUserMutation.mutate(selectedLinkUserId, {
                    onSuccess: () => {
                      setLinkUserOpen(false);
                      setSelectedLinkUserId(undefined);
                    },
                  });
                }
              }}
            >
              <ButtonLoadingContent loading={linkUserMutation.isPending}>
                Vincular
              </ButtonLoadingContent>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
