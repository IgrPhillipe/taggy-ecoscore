import { useState, type ReactNode } from "react";
import {
  ChevronDown,
  Clock,
  Coins,
  Droplet,
  Fuel,
  Leaf,
  Scroll,
} from "lucide-react";
import { BooleanBadge, EnumBadge, RelatedEntityCell } from "@/components/DataTable";
import { DetailInfoRow } from "@/components/DetailInfoRow";
import { Button } from "@/components/ui/button";
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
  formatKpiWater,
  KPI_ICON_SIZE,
  KPI_TITLES,
} from "@/features/sustainability/lib/kpi";
import { getVehicle } from "@/features/fleet/api/requests";
import { vehicleKeys } from "@/features/fleet/api/query-keys";
import { getUserById } from "@/features/users/api/requests";
import { userQueryKeys } from "@/features/users/api/query-keys";
import { useEntityLabelMap } from "@/hooks/useEntityLabelMap";
import { useOrganizationNameMap } from "@/hooks/useOrganizationNameMap";
import { formatDurationSeconds } from "@/lib/format-duration";
import { TRANSACTION_CONTEXT_LABELS } from "@/lib/enum-labels";
import type { CalcComparisonSide, CalcResult, Transaction } from "../../api/types";
import {
  getCalcResultFromSnapshot,
  getSnapshotForDisplay,
} from "./parse-transaction-snapshot";

type PricingSnapshot = {
  fuel_price_brl_per_unit?: number;
  fuel_unit?: string;
  uf_applied?: string;
};

const InfoRow = ({ label, value }: { label: string; value: ReactNode }) => (
  <DetailInfoRow label={label} value={value} />
);

function formatDuration(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(sec)) return "—";
  return formatDurationSeconds(sec);
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
  if (key === "water_liters") return formatKpiWater(value);
  if (key === "fuel_amount" || key === "fuel_liters") {
    return unit && unit !== "L" ? `${value.toFixed(3)} ${unit}` : formatKpiFuel(value);
  }
  return formatKpiCo2(value);
}

const COMPARISON_ROWS: { key: keyof CalcComparisonSide; label: string }[] = [
  { key: "time_sec", label: "Tempo parado" },
  { key: "fuel_liters", label: "Combustível desperdiçado (motor ligado)" },
  { key: "co2e_scope1_kg", label: "CO₂ emitido" },
  { key: "water_liters", label: "Água (ticket de papel)" },
  { key: "estimated_brl", label: "Custo estimado" },
];

type TransactionDetailsPanelProps = {
  transaction: Transaction;
  result?: CalcResult | null;
  snapshotJsonLabel?: string;
  /** When set, the collapsible JSON section shows this value instead of the full snapshot. */
  technicalJson?: unknown;
};

export function TransactionDetailsPanel({
  transaction,
  result: resultProp,
  snapshotJsonLabel = "Snapshot completo (JSON)",
  technicalJson,
}: TransactionDetailsPanelProps) {
  const [showSnapshot, setShowSnapshot] = useState(false);
  const orgNameMap = useOrganizationNameMap();
  const userNameMap = useEntityLabelMap(
    [transaction.user_id],
    userQueryKeys.detail,
    getUserById,
    (user) => user.name,
  );
  const vehicleLabelMap = useEntityLabelMap(
    [transaction.vehicle_id],
    vehicleKeys.detail,
    getVehicle,
    (vehicle) => vehicle.license_plate || `#${vehicle.id}`,
  );
  const result =
    resultProp ?? getCalcResultFromSnapshot(transaction.parameters_snapshot);
  const snapshot = getSnapshotForDisplay(transaction);
  const jsonPayload = technicalJson ?? snapshot;

  if (!result) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Resultado estruturado indisponível para esta passagem.
        </p>
        {jsonPayload && (
          <SectionCard>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="flex w-full items-center justify-between px-0 hover:bg-transparent"
              onClick={() => setShowSnapshot((prev) => !prev)}
            >
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
                {snapshotJsonLabel}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-neutral-500 transition-transform ${showSnapshot ? "rotate-180" : ""}`}
              />
            </Button>
            {showSnapshot && (
              <pre className="mt-3 overflow-x-auto rounded-md bg-neutral-100 p-4 text-xs">
                {JSON.stringify(jsonPayload, null, 2)}
              </pre>
            )}
          </SectionCard>
        )}
      </div>
    );
  }

  const env = result.environmental ?? {};
  const fin = result.financial ?? {};
  const meta = result.metadata ?? {};
  const comparison = result.comparison;
  const fuelUnit = env.fuel_unit ?? "L";
  const pricing = meta.pricing_snapshot as PricingSnapshot | undefined;

  const contextValue = meta.context ?? transaction.context;
  const ufValue = meta.uf_passagem ?? transaction.uf;

  return (
    <div className="space-y-6">
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
            <EnumBadge
              value={contextValue}
              labels={TRANSACTION_CONTEXT_LABELS}
            />
          }
        />
        <InfoRow
          label="UF"
          value={
            ufValue ? (
              <EnumBadge value={ufValue} labels={{}} />
            ) : (
              "—"
            )
          }
        />
        <InfoRow
          label="Digital"
          value={<BooleanBadge value={transaction.is_digital} />}
        />
        {transaction.user_id != null ? (
          <InfoRow
            label="Usuário"
            value={
              <RelatedEntityCell
                id={transaction.user_id}
                labelMap={userNameMap}
              />
            }
          />
        ) : null}
        {transaction.vehicle_id != null ? (
          <InfoRow
            label="Veículo"
            value={
              <RelatedEntityCell
                id={transaction.vehicle_id}
                labelMap={vehicleLabelMap}
              />
            }
          />
        ) : null}
        {transaction.organization_id != null ? (
          <InfoRow
            label="Organização"
            value={
              <RelatedEntityCell
                id={transaction.organization_id}
                labelMap={orgNameMap}
              />
            }
          />
        ) : null}
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
          value={formatKpiCo2(env.co2_kg)}
        />
        {fuelUnit === "kWh" ? (
          <InfoRow
            label="CO₂ da rede elétrica evitado"
            value={formatKpiCo2(env.co2e_scope2_kg)}
          />
        ) : (
          <InfoRow
            label="CO₂ da queima do combustível"
            value={formatKpiCo2(env.co2_fossil_kg)}
          />
        )}
        {(env.co2_biogenic_kg ?? 0) > 0 && (
          <InfoRow
            label="CO₂ biogênico (etanol)"
            value={formatKpiCo2(env.co2_biogenic_kg)}
          />
        )}
        {(env.paper_co2_avoided_kg ?? 0) > 0 && (
          <InfoRow
            label="CO₂ do ticket de papel evitado"
            value={formatKpiCo2(env.paper_co2_avoided_kg)}
          />
        )}
        {(env.water_liters ?? 0) > 0 && (
          <InfoRow
            label="Água poupada (ticket de papel)"
            value={
              <span className="inline-flex items-center gap-1">
                <Droplet className="h-3.5 w-3.5 text-primary" />
                {formatKpiWater(env.water_liters)}
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

      {jsonPayload && (
        <SectionCard>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex w-full items-center justify-between px-0 hover:bg-transparent"
            onClick={() => setShowSnapshot((prev) => !prev)}
          >
            <span className="text-xs font-medium uppercase tracking-wider text-neutral-500">
              {snapshotJsonLabel}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-neutral-500 transition-transform ${showSnapshot ? "rotate-180" : ""}`}
            />
          </Button>
          {showSnapshot && (
            <pre className="mt-3 overflow-x-auto rounded-md bg-neutral-100 p-4 text-xs">
              {JSON.stringify(jsonPayload, null, 2)}
            </pre>
          )}
        </SectionCard>
      )}
    </div>
  );
}
