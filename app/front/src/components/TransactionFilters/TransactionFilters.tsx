import type { DateRange } from "react-day-picker";

import { FormField } from "@/components/form/FormField";
import { ContextSelect } from "@/components/ui/ContextSelect";
import { FilterInput } from "@/components/ui/FilterInput";
import { UfSelect } from "@/components/ui/UfSelect";
import { DashboardDateRangePicker } from "@/features/dashboard/pages/DashboardPage/components/DashboardDateRangePicker";

export type TransactionFilterState = {
  plate?: string;
  context?: string;
  uf?: string;
  dateRange?: DateRange;
};

export const TRANSACTION_FILTER_DEFAULTS: TransactionFilterState = {
  plate: undefined,
  context: undefined,
  uf: undefined,
  dateRange: undefined,
};

export const TRANSACTION_MODAL_FILTER_DEFAULTS = {
  context: undefined as string | undefined,
  uf: undefined as string | undefined,
  dateRange: undefined as DateRange | undefined,
};

type TransactionFiltersFormProps = {
  filters: TransactionFilterState;
  onChange: (filters: TransactionFilterState) => void;
  showPlate?: boolean;
};

export const TransactionFiltersForm = ({
  filters,
  onChange,
  showPlate = false,
}: TransactionFiltersFormProps) => {
  return (
    <>
      {showPlate ? (
        <FormField id="tx-plate" label="Placa">
          <FilterInput
            id="tx-plate"
            placeholder="Buscar por placa"
            value={filters.plate ?? ""}
            plate
            onChange={(e) =>
              onChange({ ...filters, plate: e.target.value || undefined })
            }
          />
        </FormField>
      ) : null}
      <FormField id="tx-context" label="Contexto">
        <ContextSelect
          value={filters.context}
          onValueChange={(context) => onChange({ ...filters, context })}
          className="w-full"
        />
      </FormField>
      <FormField id="tx-uf" label="UF">
        <UfSelect
          value={filters.uf}
          onValueChange={(uf) => onChange({ ...filters, uf })}
          className="w-full"
        />
      </FormField>
      <FormField id="tx-date-range" label="Período">
        <DashboardDateRangePicker
          date={filters.dateRange}
          onDateChange={(dateRange) => onChange({ ...filters, dateRange })}
        />
      </FormField>
    </>
  );
};

/** @deprecated Use TransactionFiltersForm inside FilterModal */
export const TransactionFilters = TransactionFiltersForm;
