import { useMemo, useState } from "react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { EmptyState } from "@/components/EmptyState";
import { FilterModal } from "@/components/FilterModal";
import { FormField } from "@/components/form/FormField";
import { PageLayout } from "@/components/layout/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardDateRangePicker } from "@/features/dashboard/pages/DashboardPage/components/DashboardDateRangePicker";
import { MetricCard } from "@/features/sustainability/components/MetricCard";
import { PassageListItem } from "@/features/sustainability/components/PassageListItem";
import { TransactionDetailsDialog } from "@/features/transactions/components/TransactionDetails";
import { StatCard } from "@/features/sustainability/components/StatCard";
import { useFilterDraft } from "@/hooks/useFilterDraft";
import { useGetPassages } from "../../hooks/useGetPassages";
import { useGetPassagesSummary } from "../../hooks/useGetPassagesSummary";

const FILTER_DEFAULTS = { dateRange: undefined as DateRange | undefined };

export const PassagesHistoryPage = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedPassageId, setSelectedPassageId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const {
    open: filterOpen,
    setOpen: setFilterOpen,
    draft,
    setDraft,
    apply: applyFilters,
    clear: clearFilters,
    activeCount,
  } = useFilterDraft({
    applied: { dateRange },
    defaults: FILTER_DEFAULTS,
    onApply: (values) => setDateRange(values.dateRange),
  });

  const dateParams = useMemo(
    () => ({
      fromDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
      toDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
    }),
    [dateRange],
  );

  const { data: summary, isLoading: summaryLoading } = useGetPassagesSummary(dateParams);
  const { data: passagesData, isLoading: passagesLoading } = useGetPassages({
    page: 1,
    pageSize: 20,
    ...dateParams,
  });

  const passages = passagesData?.lastPassages ?? [];

  return (
    <PageLayout
      title="Minhas Passagens"
      description="Consulte o resumo das suas passagens e o histórico recente com impacto ambiental."
    >
      <section className="flex items-center gap-2">
        <FilterModal
          open={filterOpen}
          onOpenChange={setFilterOpen}
          activeCount={activeCount}
          onApply={applyFilters}
          onClear={clearFilters}
        >
          <FormField id="passages-date-range" label="Período">
            <DashboardDateRangePicker
              date={draft.dateRange}
              onDateChange={(value) =>
                setDraft((prev) => ({ ...prev, dateRange: value }))
              }
            />
          </FormField>
        </FilterModal>
      </section>

      <section>
        {summaryLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded" />
            ))}
          </div>
        ) : (
          <StatCard
            label="Resumo total"
            passages={summary?.totalPassages ?? 0}
            co2={summary?.totalCarbon ?? 0}
            timeSavedSec={(summary?.hoursSaved ?? 0) * 3600}
          />
        )}
      </section>

      <section>
        {passagesLoading ? (
          <Skeleton className="h-64 w-full rounded" />
        ) : (
          <MetricCard className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              Últimas Passagens
            </p>
            {passages.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="flex flex-col">
                {passages.map((passage, index) => (
                  <PassageListItem
                    key={passage.id}
                    passage={passage}
                    showBorder={index !== passages.length - 1}
                    onViewDetails={(id) => {
                      setSelectedPassageId(id);
                      setDetailsOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </MetricCard>
        )}
      </section>

      <TransactionDetailsDialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedPassageId(null);
        }}
        transactionId={selectedPassageId}
      />
    </PageLayout>
  );
};
