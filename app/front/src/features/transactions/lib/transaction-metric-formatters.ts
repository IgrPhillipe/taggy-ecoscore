import { formatDurationSeconds } from "@/lib/format-duration";
import {
  formatKpiCo2,
  formatKpiCurrency,
  formatKpiFuel,
  formatKpiWater,
} from "@/features/sustainability/lib/kpi";

function formatOrDash(
  value: number | null | undefined,
  formatter: (n: number) => string,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return formatter(value);
}

export function formatTxCo2(value: number | null | undefined): string {
  return formatKpiCo2(value);
}

export function formatTxFuel(value: number | null | undefined): string {
  return formatKpiFuel(value);
}

export function formatTxWater(value: number | null | undefined): string {
  return formatKpiWater(value);
}

export function formatTxCurrency(value: number | null | undefined): string {
  return formatKpiCurrency(value);
}

export function formatTxTimeSaved(value: number | null | undefined): string {
  return formatOrDash(value, formatDurationSeconds);
}

export function formatTxElapsedTime(value: number | null | undefined): string {
  return formatOrDash(value, formatDurationSeconds);
}
