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
  { key: "time_sec", label: "Tempo de espera" },
  { key: "fuel_liters", label: "Combustível idle" },
  { key: "co2e_scope1_kg", label: "CO₂e Escopo 1" },
  { key: "water_liters", label: "Água (papel)" },
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
          label="Tempo baseline"
          value={formatDuration(meta.baseline_wait_sec)}
        />
        <InfoRow
          label="Tempo economizado"
          value={formatDuration(meta.time_saved_sec)}
        />
      </SectionCard>

      {comparison && (
        <SectionCard title="Comparação com / sem tag">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead>Sem tag</TableHead>
                <TableHead>Com tag</TableHead>
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
                  <TableCell className="font-medium text-[#419812]">
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
        </SectionCard>
      )}

      <SectionCard title="Detalhamento ambiental">
        <InfoRow label="CO₂ fóssil evitado" value={`${formatNumber(env.co2_fossil_kg)} kg`} />
        <InfoRow label="CO₂ biogênico" value={`${formatNumber(env.co2_biogenic_kg)} kg`} />
        <InfoRow label="CH₄ (CO₂e)" value={`${formatNumber(env.ch4_kg_co2e)} kg`} />
        <InfoRow label="N₂O (CO₂e)" value={`${formatNumber(env.n2o_kg_co2e)} kg`} />
        <InfoRow label="CO₂e Escopo 1" value={`${formatNumber(env.co2e_scope1_kg)} kg`} />
        <InfoRow label="CO₂e Escopo 2" value={`${formatNumber(env.co2e_scope2_kg)} kg`} />
        <InfoRow
          label="Água poupada"
          value={
            env.water_liters != null ? (
              <span className="inline-flex items-center gap-1">
                <Droplet className="h-3.5 w-3.5 text-primary" />
                {formatNumber(env.water_liters, 2)} L
              </span>
            ) : (
              "—"
            )
          }
        />
      </SectionCard>

      <SectionCard title="Detalhamento financeiro">
        <InfoRow
          label="Economia de combustível"
          value={formatKpiCurrency(fin.fuel_savings_brl)}
        />
        <InfoRow
          label="Economia de manutenção"
          value={formatKpiCurrency(fin.maintenance_savings_brl)}
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
