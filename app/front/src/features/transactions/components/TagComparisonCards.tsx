import type { ReactNode } from "react";
import {
  ArrowDown,
  Banknote,
  Clock,
  Droplet,
  Fuel,
  Leaf,
  Tag,
  Ticket,
  XCircle,
} from "lucide-react";
import { formatDurationSeconds } from "@/lib/format-duration";
import { cn } from "@/lib/utils";
import type { CalcComparisonSide } from "../api/types";

type ComparisonRow = {
  key: keyof CalcComparisonSide;
  label: string;
  icon: ReactNode;
};

const ROWS: ComparisonRow[] = [
  { key: "time_sec", label: "Tempo de espera", icon: <Clock className="h-4 w-4" /> },
  { key: "fuel_liters", label: "Combustível idle", icon: <Fuel className="h-4 w-4" /> },
  { key: "co2e_scope1_kg", label: "CO₂e Escopo 1", icon: <Leaf className="h-4 w-4" /> },
  { key: "water_liters", label: "Água (papel)", icon: <Droplet className="h-4 w-4" /> },
  { key: "estimated_brl", label: "Custo estimado", icon: <Banknote className="h-4 w-4" /> },
];

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(sec)) return "—";
  return formatDurationSeconds(sec);
}

function formatNumber(value: number | null | undefined, digits = 3): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function formatValue(
  key: keyof CalcComparisonSide,
  value: number | null | undefined,
  unit?: string,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (key === "time_sec") return formatDuration(value);
  if (key === "estimated_brl") return `R$ ${formatNumber(value, 2)}`;
  if (key === "water_liters") return `${formatNumber(value, 2)} L`;
  if (key === "fuel_amount" || key === "fuel_liters") {
    return `${formatNumber(value, 3)} ${unit ?? "L"}`;
  }
  return `${formatNumber(value, 3)} kg`;
}

function getNum(side: CalcComparisonSide | undefined, key: keyof CalcComparisonSide): number | undefined {
  const v = side?.[key];
  return typeof v === "number" ? v : undefined;
}

type ScenarioCardProps = {
  variant: "without" | "with";
  rows: ComparisonRow[];
  side: CalcComparisonSide | undefined;
  fuelUnit?: string;
};

function ScenarioCard({ variant, rows, side, fuelUnit }: ScenarioCardProps) {
  const isWith = variant === "with";

  return (
    <div
      className={cn(
        "flex flex-1 flex-col rounded-xl border-2 p-4",
        isWith
          ? "border-success/40 bg-success/10"
          : "border-destructive/40 bg-destructive/5",
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full",
            isWith ? "bg-success/20 text-success" : "bg-destructive/15 text-destructive",
          )}
        >
          {isWith ? <Tag className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
        </span>
        <div>
          <p
            className={cn(
              "text-sm font-bold",
              isWith ? "text-success" : "text-destructive",
            )}
          >
            {isWith ? "Com tag" : "Sem tag"}
          </p>
          <p className="text-xs text-muted-foreground">
            {isWith ? "Passagem automática" : "Pagamento manual / fila"}
          </p>
        </div>
      </div>
      <ul className="space-y-3">
        {rows.map(({ key, label, icon }) => (
          <li key={key} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span
                className={cn(
                  isWith ? "text-success/80" : "text-destructive/70",
                )}
              >
                {icon}
              </span>
              {label}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatValue(key, getNum(side, key), side?.fuel_unit ?? fuelUnit)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type TagComparisonCardsProps = {
  withoutTag?: CalcComparisonSide;
  withTag?: CalcComparisonSide;
  delta?: CalcComparisonSide;
  fuelUnit?: string;
};

export function TagComparisonCards({
  withoutTag,
  withTag,
  delta,
  fuelUnit,
}: TagComparisonCardsProps) {
  const timeSaved = getNum(delta, "time_sec");
  const co2Saved = getNum(delta, "co2e_scope1_kg");

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-1 text-center sm:flex-row sm:justify-center sm:gap-3">
        <div className="flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1 text-xs font-medium text-destructive">
          <Ticket className="h-3.5 w-3.5" />
          Sem tag = mais tempo e emissão
        </div>
        <ArrowDown className="hidden h-4 w-4 -rotate-90 text-muted-foreground sm:block" />
        <ArrowDown className="h-4 w-4 text-muted-foreground sm:hidden" />
        <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
          <Tag className="h-3.5 w-3.5" />
          Com tag = ganho ambiental e financeiro
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ScenarioCard variant="without" rows={ROWS} side={withoutTag} fuelUnit={fuelUnit} />
        <ScenarioCard variant="with" rows={ROWS} side={withTag} fuelUnit={fuelUnit} />
      </div>

      {(timeSaved != null || co2Saved != null) && (
        <div className="rounded-xl border-2 border-dashed border-success/50 bg-success/5 px-4 py-3 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-success">
            Economia com a tag
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-sm font-semibold text-foreground">
            {timeSaved != null ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-success" />
                {formatDuration(timeSaved)} a menos
              </span>
            ) : null}
            {co2Saved != null ? (
              <span className="inline-flex items-center gap-1.5">
                <Leaf className="h-4 w-4 text-success" />
                {formatValue("co2e_scope1_kg", co2Saved)} CO₂e evitados
              </span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
