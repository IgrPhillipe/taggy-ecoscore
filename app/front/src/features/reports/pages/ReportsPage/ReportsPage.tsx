import { useMemo, useState } from "react";
import { format } from "date-fns";
import type {
  ColumnDef,
  OnChangeFn,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";
import {
  parseAsInteger,
  parseAsString,
  parseAsStringEnum,
  useQueryStates,
} from "nuqs";
import type { DateRange } from "react-day-picker";
import { Download } from "lucide-react";

import { FilterModal } from "@/components/FilterModal";
import { FormField } from "@/components/form/FormField";
import { DataTable, entityIdColumn } from "@/components/DataTable";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/constants";
import { countActiveFilters } from "@/lib/filter-utils";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import { DashboardDateRangePicker } from "@/features/dashboard/pages/DashboardPage/components/DashboardDateRangePicker";
import { DashboardFuelSelect } from "@/features/dashboard/pages/DashboardPage/components/DashboardFuelSelect";
import { useGetVehicles } from "@/features/fleet/hooks/useGetVehicles";
import { OrganizationsCombobox } from "@/features/fleet/components/OrganizationsCombobox/OrganizationsCombobox";
import type { Vehicle } from "@/features/fleet/schemas/vehicle-schema";
import { DEFAULT_REGION } from "@/features/reports/constants";
import { buildExportUrl } from "../../api/requests";
import { ReportsRegionSelect } from "./components/ReportsRegionSelect";

type ReportFilters = {
  dateRange: DateRange | undefined;
  fuelType: string | undefined;
  region: string;
  organizationId: number | undefined;
};

const defaultFilters: ReportFilters = {
  dateRange: undefined,
  fuelType: undefined,
  region: DEFAULT_REGION,
  organizationId: undefined,
};

const columns: ColumnDef<Vehicle>[] = [
  entityIdColumn<Vehicle>(),
  { accessorKey: "id_tag", header: "SÉRIE DA TAG", enableSorting: true },
  { accessorKey: "license_plate", header: "PLACA VINCULADA", enableSorting: true },
  { accessorKey: "model", header: "MODELO DO VEÍCULO", enableSorting: true },
  { accessorKey: "fuel_type", header: "TIPO DE COMBUSTÍVEL", enableSorting: true },
];

const reportsSearchParams = {
  page: parseAsInteger.withDefault(1),
  sort: parseAsString,
  order: parseAsStringEnum(["asc", "desc"] as const).withDefault("asc"),
};

function filterVehicles(items: Vehicle[], fuelType: string | undefined): Vehicle[] {
  if (!fuelType) return items;
  return items.filter((item) => item.fuel_type?.toLowerCase() === fuelType.toLowerCase());
}

export const ReportsPage = () => {
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(defaultFilters);

  const [{ page, sort, order }, setParams] = useQueryStates(reportsSearchParams, {
    history: "replace",
  });

  const pagination: PaginationState = { pageIndex: page - 1, pageSize: PAGE_SIZE };
  const sorting: SortingState = sort ? [{ id: sort, desc: order === "desc" }] : [];

  const { data, isLoading } = useGetVehicles({
    page,
    pageSize: PAGE_SIZE,
    organizationId: appliedFilters.organizationId,
  });

  const filteredItems = useMemo(
    () => filterVehicles(data?.items ?? [], appliedFilters.fuelType),
    [data?.items, appliedFilters.fuelType],
  );

  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : undefined;

  const appliedActiveCount = useMemo(
    () => countActiveFilters(appliedFilters, defaultFilters),
    [appliedFilters],
  );

  const {
    open: filterOpen,
    setOpen: setFilterOpen,
    draft,
    setDraft,
    apply: applyModalFilters,
    clear: clearModalFilters,
  } = useFilterDraft({
    applied: draftFilters,
    defaults: defaultFilters,
    onApply: setDraftFilters,
  });

  const handleGenerate = () => {
    setAppliedFilters(draftFilters);
    setParams({ page: 1 });
  };

  const handleExport = () => {
    const url = buildExportUrl({
      fromDate: appliedFilters.dateRange?.from
        ? format(appliedFilters.dateRange.from, "yyyy-MM-dd")
        : undefined,
      toDate: appliedFilters.dateRange?.to
        ? format(appliedFilters.dateRange.to, "yyyy-MM-dd")
        : undefined,
    });
    window.open(url, "_blank");
  };

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
      title="Relatórios"
      description="Gere relatórios de veículos com filtros por período, combustível, frota e região."
    >
      <section className="space-y-4 rounded border border-neutral-300 bg-white p-4">
        <h2 className="font-semibold">Gerar relatórios</h2>

        <div className="flex items-center justify-between gap-4">
          <FilterModal
            open={filterOpen}
            onOpenChange={setFilterOpen}
            activeCount={appliedActiveCount}
            onApply={applyModalFilters}
            onClear={clearModalFilters}
          >
            <FormField id="report-date-range" label="Período">
              <DashboardDateRangePicker
                date={draft.dateRange}
                onDateChange={(dateRange) =>
                  setDraft((prev) => ({ ...prev, dateRange }))
                }
              />
            </FormField>
            <FormField id="report-fuel" label="Combustível">
              <DashboardFuelSelect
                value={draft.fuelType}
                onValueChange={(fuelType) =>
                  setDraft((prev) => ({ ...prev, fuelType }))
                }
              />
            </FormField>
            <FormField id="report-region" label="Região">
              <ReportsRegionSelect
                value={draft.region}
                onValueChange={(region) =>
                  setDraft((prev) => ({ ...prev, region }))
                }
              />
            </FormField>
            <FormField id="report-org" label="Organização">
              <OrganizationsCombobox
                value={draft.organizationId}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, organizationId: value }))
                }
              />
            </FormField>
          </FilterModal>

          <div className="flex items-center gap-2">
            <Button type="button" onClick={handleGenerate}>
              Gerar
            </Button>
            <Button type="button" variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar XLSX
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={filteredItems}
          isLoading={isLoading}
          pageCount={pageCount}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          sorting={sorting}
          onSortingChange={handleSortingChange}
        />
      </section>
    </PageLayout>
  );
};
