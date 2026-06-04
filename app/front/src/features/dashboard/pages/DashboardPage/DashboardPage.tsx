import { Leaf, Fuel, Download, Coins, Tag, Scroll } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";

import { FilterModal } from "@/components/FilterModal";
import { FormField } from "@/components/form/FormField";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/features/sustainability/components/MetricCard";
import {
  formatKpiCo2,
  formatKpiCount,
  formatKpiCurrency,
  formatKpiFuel,
  formatKpiPaper,
  KPI_ICON_SIZE,
  KPI_TITLES,
} from "@/features/sustainability/lib/kpi";
import { useCurrentUser } from "@/features/auth";
import { OrganizationsCombobox } from "@/features/fleet/components/OrganizationsCombobox/OrganizationsCombobox";
import { useDashboardFilters } from "@/features/dashboard/hooks/useDashboardFilters";
import { useDailyStats } from "@/features/dashboard/hooks/useDailyStats";
import { useDashboardSummary } from "@/features/dashboard/hooks/useDashboardSummary";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import { ComparativeBarChart } from "./components/ComparativeBarChart";
import { DashboardDateRangePicker } from "./components/DashboardDateRangePicker";
import { DashboardFuelSelect } from "./components/DashboardFuelSelect";
import { DailyPassagensChart } from "./components/DailyPassagensChart";
import { DailyCo2Chart } from "./components/DailyCo2Chart";
import { RegionalEmissionsMap } from "./components/RegionalEmissionsMap";

type DashboardFilterState = {
  organizationId: number | undefined;
  fuelType: string | undefined;
  dateRange: DateRange | undefined;
};

const DASHBOARD_FILTER_DEFAULTS: DashboardFilterState = {
  organizationId: undefined,
  fuelType: undefined,
  dateRange: undefined,
};

export const DashboardPage = () => {
  const { user } = useCurrentUser();
  const isAdmin = user?.role === "admin";
  const [organizationId, setOrganizationId] = useState<number | undefined>(
    user?.role === "gestor_frota" ? user.organization_id ?? undefined : undefined,
  );

  const {
    fuelType,
    dateRange,
    setFuelType,
    setDateRange,
  } = useDashboardFilters();

  const appliedFilters: DashboardFilterState = {
    organizationId,
    fuelType,
    dateRange,
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
    defaults: DASHBOARD_FILTER_DEFAULTS,
    onApply: (values) => {
      if (isAdmin) {
        setOrganizationId(values.organizationId);
      }
      setFuelType(values.fuelType);
      setDateRange(values.dateRange);
    },
    onClear: (values) => {
      if (isAdmin) {
        setOrganizationId(values.organizationId);
      }
      setFuelType(values.fuelType);
      setDateRange(values.dateRange);
    },
  });

  const scopedOrgId =
    user?.role === "gestor_frota"
      ? user.organization_id ?? undefined
      : isAdmin
        ? organizationId
        : undefined;

  const { data: dailyStats = [] } = useDailyStats({
    days: 30,
    organizationId: scopedOrgId,
  });

  const { data: summary } = useDashboardSummary({
    organizationId: scopedOrgId,
  });

  const METRICS = [
    {
      title: KPI_TITLES.co2Avoided,
      value: formatKpiCo2(summary?.total_co2_avoided_kg),
      icon: <Leaf className="text-[#72C215]" size={KPI_ICON_SIZE} />,
    },
    {
      title: KPI_TITLES.fuelSaved,
      value: formatKpiFuel(summary?.total_fuel_saved_liters),
      icon: <Fuel className="text-[#72C215]" size={KPI_ICON_SIZE} />,
    },
    {
      title: KPI_TITLES.paperSaved,
      value: formatKpiPaper(summary?.paper_saved_meters),
      icon: <Scroll className="text-[#72C215]" size={KPI_ICON_SIZE} />,
    },
    {
      title: KPI_TITLES.financialSavings,
      value: formatKpiCurrency(summary?.accumulated_economy),
      icon: <Coins className="text-[#72C215]" size={KPI_ICON_SIZE} />,
    },
    {
      title: KPI_TITLES.tagsActive,
      value: formatKpiCount(summary?.active_tags),
      icon: <Tag className="text-[#72C215]" size={KPI_ICON_SIZE} />,
    },
  ];

  return (
    <PageLayout
      title="Dashboard"
      description="Visualize indicadores de emissões, economia e tags ativos com filtros por período e tipo de combustível."
    >
      <section className="flex items-center justify-between gap-4">
        <FilterModal
          open={filterOpen}
          onOpenChange={setFilterOpen}
          activeCount={activeCount}
          onApply={applyFilters}
          onClear={clearFilters}
        >
          {isAdmin ? (
            <FormField id="dashboard-org" label="Organização">
              <OrganizationsCombobox
                value={draft.organizationId}
                onValueChange={(value) =>
                  setDraft((prev) => ({ ...prev, organizationId: value }))
                }
                placeholder="Todas as organizações"
              />
            </FormField>
          ) : null}
          <FormField id="dashboard-fuel" label="Combustível">
            <DashboardFuelSelect
              value={draft.fuelType}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, fuelType: value }))
              }
            />
          </FormField>
          <FormField id="dashboard-date-range" label="Período">
            <DashboardDateRangePicker
              date={draft.dateRange}
              onDateChange={(value) =>
                setDraft((prev) => ({ ...prev, dateRange: value }))
              }
            />
          </FormField>
        </FilterModal>

        <Button type="button" variant="outline">
          <Download className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {METRICS.map((metric) => (
          <KpiCard
            key={metric.title}
            title={metric.title}
            value={metric.value}
            icon={metric.icon}
          />
        ))}
      </section>

      <section className="grid grid-cols-2 gap-6">
        <DailyPassagensChart data={dailyStats} />
        <DailyCo2Chart data={dailyStats} />
      </section>

      <section className="grid grid-cols-2 gap-6">
        <RegionalEmissionsMap organizationId={scopedOrgId} />
        {/* TODO: Integração pendente — dados comparativos mockados */}
        <ComparativeBarChart />
      </section>
    </PageLayout>
  );
};
