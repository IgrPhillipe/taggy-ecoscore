import {
  AlertTriangle,
  Clock,
  Coffee,
  Fuel,
  Leaf,
  RotateCcw,
  Smartphone,
  TreePine,
} from "lucide-react";
import {
  formatKpiCo2,
  formatKpiCurrency,
} from "@/features/sustainability/lib/kpi";
import type { PublicCalculatorResponse } from "../api/types";

const FUEL_TYPE_LABELS: Record<string, string> = {
  gasolina_c: "Gasolina",
  diesel_s10: "Diesel",
  etanol: "Etanol",
  gnv: "GNV",
  eletrico: "Elétrico",
};

const CATEGORY_LABELS: Record<string, string> = {
  leve: "Leve",
  pesado: "Pesado",
};

interface Props {
  result: PublicCalculatorResponse;
  onReset: () => void;
}

function MetricCard({
  icon,
  label,
  monthly,
  annual,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  monthly: string;
  annual: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 space-y-1 ${
        highlight
          ? "border-emerald-200 bg-emerald-50"
          : "border-neutral-100 bg-white"
      }`}
    >
      <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
        {icon}
        {label}
      </div>
      <p
        className={`text-xl font-bold ${highlight ? "text-emerald-700" : "text-neutral-900"}`}
      >
        {monthly}
        <span className="text-xs font-normal text-neutral-400 ml-1">/mês</span>
      </p>
      <p className="text-xs text-neutral-400">{annual}/ano</p>
    </div>
  );
}

export function CalculatorResults({ result, onReset }: Props) {
  const {
    monthly,
    annual,
    vehicle_model,
    fuel_type,
    category,
    ludic,
    vehicle_fallback,
    fallback_reason,
  } = result;

  const vehicleLabel = vehicle_model
    ? `${vehicle_model} · ${FUEL_TYPE_LABELS[fuel_type] ?? fuel_type} · ${CATEGORY_LABELS[category] ?? category}`
    : `${FUEL_TYPE_LABELS[fuel_type] ?? fuel_type} · ${CATEGORY_LABELS[category] ?? category}`;

  return (
    <div className="space-y-5">
      {vehicle_fallback && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {fallback_reason ?? "Estimativa baseada em perfil padrão."}
          </span>
        </div>
      )}

      <div className="rounded-xl border border-emerald-200 bg-emerald-600 p-5 text-white space-y-1">
        <p className="text-sm font-medium text-emerald-100">
          {vehicle_fallback
            ? "Estimativa de economia mensal"
            : `Economia mensal · ${vehicleLabel}`}
        </p>
        <p className="text-4xl font-bold tracking-tight">
          {formatKpiCurrency(monthly.financial_brl)}
        </p>
        <p className="text-emerald-200 text-sm">
          {formatKpiCurrency(annual.financial_brl)} por ano
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard
          icon={<Leaf className="h-3.5 w-3.5 text-emerald-500" />}
          label="CO₂ evitado"
          monthly={formatKpiCo2(monthly.co2_kg)}
          annual={formatKpiCo2(annual.co2_kg)}
          highlight
        />
        <MetricCard
          icon={<Clock className="h-3.5 w-3.5 text-blue-500" />}
          label="Tempo poupado"
          monthly={`${monthly.time_min.toFixed(0)} min`}
          annual={`${annual.time_min.toFixed(0)} min`}
        />
        <MetricCard
          icon={<Fuel className="h-3.5 w-3.5 text-orange-500" />}
          label="Combustível"
          monthly={`${monthly.fuel_liters.toFixed(2)} L`}
          annual={`${annual.fuel_liters.toFixed(2)} L`}
        />
      </div>

      {ludic.trees_saved || ludic.smartphone_charges || ludic.coffee_filters ? (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
            O que isso significa por ano?
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {ludic.trees_saved != null && (
              <div className="space-y-1">
                <TreePine className="mx-auto h-6 w-6 text-emerald-600" />
                <p className="text-lg font-bold text-neutral-900">
                  {ludic.trees_saved.toFixed(1)}
                </p>
                <p className="text-xs text-neutral-500">árvores/ano</p>
              </div>
            )}
            {ludic.smartphone_charges != null && (
              <div className="space-y-1">
                <Smartphone className="mx-auto h-6 w-6 text-neutral-600" />
                <p className="text-lg font-bold text-neutral-900">
                  {ludic.smartphone_charges}
                </p>
                <p className="text-xs text-neutral-500">cargas de celular</p>
              </div>
            )}
            {ludic.coffee_filters != null && (
              <div className="space-y-1">
                <Coffee className="mx-auto h-6 w-6 text-amber-700" />
                <p className="text-lg font-bold text-neutral-900">
                  {ludic.coffee_filters}
                </p>
                <p className="text-xs text-neutral-500">filtros de café</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <a
        href="https://taggy.com.br"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 transition-colors"
      >
        Quero minha Taggy
      </a>

      <button
        onClick={onReset}
        className="flex items-center gap-2 mx-auto text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Recalcular
      </button>
    </div>
  );
}
