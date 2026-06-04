import { useState, type ReactNode } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Droplet,
  Fuel,
  Leaf,
  Scroll,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TagComparisonCards } from "@/features/transactions/components/TagComparisonCards";
import { KpiCard, SectionCard } from "@/features/sustainability/components/MetricCard";
import {
  formatKpiCo2,
  formatKpiCurrency,
  formatKpiFuel,
  formatKpiPaper,
  KPI_ICON_SIZE,
  KPI_TITLES,
} from "@/features/sustainability/lib/kpi";
import type { CalcComparisonSide, CalcResult, Transaction } from "../../api/types";

const CONTEXT_LABELS: Record<string, string> = {
  pedagio: "Pedágio",
  estacionamento: "Estacionamento",
};

type PricingSnapshot = {
  fuel_price_brl_per_unit?: number;
  fuel_unit?: string;
  uf_applied?: string;
};

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex justify-between border-b border-neutral-100 py-2 text-sm last:border-0">
    <span className="text-neutral-500">{label}</span>
    <span className="font-medium text-neutral-900">{value ?? "—"}</span>
  </div>
);

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(sec)) return "—";
  if (sec < 60) return `${Math.round(sec)}s`;
  const min = Math.floor(sec / 60);
  const rest = Math.round(sec % 60);
  return rest > 0 ? `${min}min ${rest}s` : `${min}min`;
}

function formatNumber(value: number | null | undefined, digits = 3): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

function formatFuelPrice(value: number, unit: string): string {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}/${unit}`;
}

function getComparisonNumber(
  side: CalcComparisonSide | undefined,
  key: keyof CalcComparisonSide,
): number | undefined {
  const value = side?.[key];
  return typeof value === "number" ? value : undefined;
}

function formatComparisonValue(
  key: keyof CalcComparisonSide,
  value: number | null | undefined,
  unit?: string,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  if (key === "time_sec") return formatDuration(value);
  if (key === "estimated_brl") return formatKpiCurrency(value);
  if (key === "water_liters") return `${formatNumber(value, 2)} L`;
  if (key === "fuel_amount" || key === "fuel_liters") {
    return `${formatNumber(value, 3)} ${unit ?? "L"}`;
  }
  return `${formatNumber(value, 3)} kg`;
}

const COMPARISON_ROWS: { key: keyof CalcComparisonSide; label: string }[] = [
  { key: "time_sec", label: "Tempo parado" },
  { key: "fuel_liters", label: "Combustível desperdiçado (motor ligado)" },
  { key: "co2e_scope1_kg", label: "CO₂ emitido" },
  { key: "water_liters", label: "Água (ticket de papel)" },
  { key: "estimated_brl", label: "Custo estimado" },
];

type SimulatorResultPanelProps = {
  result: CalcResult;
  transaction: Transaction;
};

export function SimulatorResultPanel({ result, transaction }: SimulatorResultPanelProps) {
  const [showTechnical, setShowTechnical] = useState(false);
  const env = result.environmental ?? {};
  const fin = result.financial ?? {};
  const meta = result.metadata ?? {};
  const comparison = result.comparison;
  const fuelUnit = env.fuel_unit ?? "L";
  const pricing = meta.pricing_snapshot as PricingSnapshot | undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-[#72C215]" />
        <span className="text-sm font-medium text-neutral-900">
          Simulação concluída
        </span>
        <Badge variant="secondary" className="text-xs">
          Passagem #{transaction.id}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          title={KPI_TITLES.co2Avoided}
          value={formatKpiCo2(env.co2_kg)}
          icon={<Leaf className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.fuelSaved}
          value={formatKpiFuel(env.fuel_liters)}
          icon={<Fuel className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.paperSaved}
          value={formatKpiPaper(env.paper_tickets)}
          icon={<Scroll className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.financialSavings}
          value={formatKpiCurrency(fin.total_savings_brl)}
          icon={<Coins className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
        <KpiCard
          title={KPI_TITLES.hoursSaved}
          value={formatDuration(meta.time_saved_sec)}
          icon={<Clock className="text-[#72C215]" size={KPI_ICON_SIZE} />}
        />
      </div>

      <SectionCard title="Resumo da passagem">
        <InfoRow label="Placa" value={transaction.plate} />
        <InfoRow
          label="Contexto"
          value={
            meta.context
              ? (CONTEXT_LABELS[meta.context] ?? meta.context)
              : (CONTEXT_LABELS[transaction.context] ?? transaction.context)
          }
        />
        <InfoRow label="UF" value={meta.uf_passagem ?? transaction.uf} />
        <InfoRow label="Digital" value={transaction.is_digital ? "Sim" : "Não"} />
        <InfoRow
          label="Tempo economizado"
          value={formatDuration(meta.time_saved_sec)}
        />
      </SectionCard>

      {comparison && (
        <SectionCard title="Comparação com / sem tag">
          <TagComparisonCards
            withoutTag={comparison.without_tag}
            withTag={comparison.with_tag}
            delta={comparison.delta}
            fuelUnit={fuelUnit}
          />
          <details className="mt-4 group">
            <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground">
              Ver tabela detalhada
            </summary>
            <Table className="mt-3">
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead className="text-destructive">Sem tag</TableHead>
                  <TableHead className="text-success">Com tag</TableHead>
                  <TableHead>Economia</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {COMPARISON_ROWS.map(({ key, label }) => (
                  <TableRow key={key}>
                    <TableCell className="font-medium">{label}</TableCell>
                    <TableCell>
                      {formatComparisonValue(
                        key,
                        getComparisonNumber(comparison.without_tag, key),
                        comparison.without_tag?.fuel_unit ?? fuelUnit,
                      )}
                    </TableCell>
                    <TableCell>
                      {formatComparisonValue(
                        key,
                        getComparisonNumber(comparison.with_tag, key),
                        comparison.with_tag?.fuel_unit ?? fuelUnit,
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-success">
                      {formatComparisonValue(
                        key,
                        getComparisonNumber(comparison.delta, key),
                        comparison.delta?.fuel_unit ?? fuelUnit,
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </details>
        </SectionCard>
      )}

      <SectionCard title="Detalhamento ambiental">
        <InfoRow
          label="CO₂ evitado no total"
          value={`${formatNumber(env.co2_kg)} kg`}
        />
        {fuelUnit === "kWh" ? (
          <InfoRow
            label="CO₂ da rede elétrica evitado"
            value={`${formatNumber(env.co2e_scope2_kg)} kg`}
          />
        ) : (
          <InfoRow
            label="CO₂ da queima do combustível"
            value={`${formatNumber(env.co2_fossil_kg)} kg`}
          />
        )}
        {(env.co2_biogenic_kg ?? 0) > 0 && (
          <InfoRow
            label="CO₂ biogênico (etanol)"
            value={`${formatNumber(env.co2_biogenic_kg)} kg`}
          />
        )}
        {(env.paper_co2_avoided_kg ?? 0) > 0 && (
          <InfoRow
            label="CO₂ do ticket de papel evitado"
            value={`${formatNumber(env.paper_co2_avoided_kg)} kg`}
          />
        )}
        {(env.water_liters ?? 0) > 0 && (
          <InfoRow
            label="Água poupada (ticket de papel)"
            value={
              <span className="inline-flex items-center gap-1">
                <Droplet className="h-3.5 w-3.5 text-primary" />
                {formatNumber(env.water_liters, 2)} L
              </span>
            }
          />
        )}
      </SectionCard>

      <SectionCard title="Detalhamento financeiro">
        {pricing?.fuel_price_brl_per_unit != null && (
          <InfoRow
            label="Preço do combustível"
            value={
              <>
                {formatFuelPrice(
                  pricing.fuel_price_brl_per_unit,
                  pricing.fuel_unit ?? fuelUnit,
                )}
                {pricing.uf_applied ? ` (${pricing.uf_applied})` : null}
              </>
            }
          />
        )}
        <InfoRow
          label="Economia de combustível"
          value={formatKpiCurrency(fin.fuel_savings_brl)}
        />
        <InfoRow
          label="Total"
          value={formatKpiCurrency(fin.total_savings_brl)}
        />
      </SectionCard>

      <SectionCard>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="flex w-full items-center justify-between px-0 hover:bg-transparent"
          onClick={() => setShowTechnical((prev) => !prev)}
        >
          <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Detalhes técnicos (JSON)
          </span>
          <ChevronDown
            className={`h-4 w-4 text-neutral-500 transition-transform ${showTechnical ? "rotate-180" : ""}`}
          />
        </Button>
        {showTechnical && (
          <pre className="mt-3 overflow-x-auto rounded-md bg-neutral-100 p-4 text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </SectionCard>
    </div>
  );
}

export function SimulatorResultSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-48" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded" />
      <Skeleton className="h-56 w-full rounded" />
    </div>
  );
}

export function SimulatorEmptyState() {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
      <Leaf className="h-10 w-10 text-neutral-300" />
      <p className="text-sm font-medium text-neutral-600">Nenhuma simulação ainda</p>
      <p className="max-w-xs text-center text-xs text-muted-foreground">
        Preencha os dados ao lado e clique em Simular para ver o impacto ambiental e
        financeiro estimado.
      </p>
    </div>
  );
}
