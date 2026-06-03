import { ChevronDown, ChevronUp, Clock, Droplet, Leaf, Zap } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import type { Co2eBreakdown } from "../../schemas/sustainability-schema"

const FUEL_LABELS: Record<string, { label: string; color: string }> = {
  gasolina_c: { label: "Gasolina", color: "bg-orange-100 text-orange-700 border-orange-200" },
  diesel_s10: { label: "Diesel S10", color: "bg-slate-100 text-slate-700 border-slate-200" },
  diesel_s500: { label: "Diesel S500", color: "bg-slate-100 text-slate-600 border-slate-200" },
  etanol: { label: "Etanol", color: "bg-green-100 text-green-700 border-green-200" },
  gnv: { label: "GNV", color: "bg-blue-100 text-blue-700 border-blue-200" },
  eletrico: { label: "Elétrico", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
}

function fmt(v: number | null | undefined, decimals = 4) {
  if (v == null) return "—"
  return v.toFixed(decimals)
}

type BreakdownRowProps = { label: string; value: string; note?: string; dim?: boolean }
const BreakdownRow = ({ label, value, note, dim }: BreakdownRowProps) => (
  <div className={cn("flex items-start justify-between gap-2 py-0.5", dim && "opacity-60")}>
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className="text-[11px] font-medium text-foreground shrink-0">
      {value}
      {note && <span className="ml-1 text-[10px] font-normal text-muted-foreground">({note})</span>}
    </span>
  </div>
)

export type PassageListItemData = {
  id: number
  localName: string
  passageDatetime: string
  carbon: string
  waterSaved: string
  time: string
  fuelType?: string | null
  co2eBreakdown?: Co2eBreakdown | null
}

type PassageListItemProps = {
  passage: PassageListItemData
  showBorder?: boolean
}

export const PassageListItem = ({
  passage,
  showBorder = true,
}: PassageListItemProps) => {
  const [expanded, setExpanded] = useState(false)
  const bd = passage.co2eBreakdown
  const fuelInfo = passage.fuelType ? FUEL_LABELS[passage.fuelType] : null
  const isEtanol = passage.fuelType === "etanol"
  const isEV = passage.fuelType === "eletrico"
  const isGNV = passage.fuelType === "gnv"
  const hasBreakdown = !!bd

  return (
    <div
      className={cn(
        "flex flex-col gap-0 py-3",
        showBorder && "border-b border-border",
      )}
    >
      {/* Main row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground">{passage.localName}</h3>
            {fuelInfo && (
              <span className={cn("rounded border px-1.5 py-0.5 text-[10px] font-semibold", fuelInfo.color)}>
                {fuelInfo.label}
              </span>
            )}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {passage.passageDatetime}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-[11px] font-medium text-muted-foreground">
            <div className="flex items-center gap-1 rounded border border-border bg-muted px-2 py-1">
              <Leaf className="h-3.5 w-3.5 text-primary" />
              <span>{passage.carbon}</span>
              {isEV && <Zap className="h-3 w-3 text-emerald-500 ml-0.5" />}
            </div>
            <div className="flex items-center gap-1 rounded border border-border bg-muted px-2 py-1">
              <Droplet className="h-3.5 w-3.5 text-primary" />
              <span>{passage.waterSaved}</span>
            </div>
            <div className="flex items-center gap-1 rounded border border-border bg-muted px-2 py-1">
              <Clock className="h-3.5 w-3.5 text-success" />
              <span>{passage.time}</span>
            </div>
          </div>

          {hasBreakdown && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-0.5 rounded border border-border bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors"
              aria-label={expanded ? "Ocultar breakdown" : "Ver breakdown CO₂e"}
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              <span>CO₂e</span>
            </button>
          )}
        </div>
      </div>

      {/* Expanded breakdown */}
      {expanded && bd && (
        <div className="mt-2 rounded border border-border bg-muted/40 px-3 py-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Breakdown CO₂e (GHG Protocol)
          </p>

          {!isEtanol && !isEV && (
            <BreakdownRow
              label="CO₂ fóssil (Escopo 1)"
              value={`${fmt(bd.co2FossilKg)} kg`}
            />
          )}
          {isEtanol && (
            <BreakdownRow
              label="CO₂ biogênico"
              value={`${fmt(bd.co2BiogenicKg)} kg`}
              note="não conta no Escopo 1"
              dim
            />
          )}
          {!isEV && (
            <>
              <BreakdownRow label="CH4 (em CO₂e)" value={`${fmt(bd.ch4KgCo2e, 5)} kg`} />
              <BreakdownRow label="N2O (em CO₂e)" value={`${fmt(bd.n2oKgCo2e, 5)} kg`} />
              <BreakdownRow
                label="CO₂e Escopo 1 total"
                value={`${fmt(bd.co2eScope1Kg)} kg`}
              />
            </>
          )}
          {isEV && (
            <BreakdownRow
              label="CO₂e Escopo 2 (rede SIN)"
              value={`${fmt(bd.co2eScope2Kg)} kg`}
            />
          )}
          <BreakdownRow
            label="Papel (ticket evitado)"
            value={`${fmt(bd.paperCo2AvoidedKg)} kg`}
          />
          {bd.fuelUnit && isGNV && (
            <BreakdownRow
              label="Unidade combustível"
              value={bd.fuelUnit === "m3" ? "m³ (GNV)" : bd.fuelUnit}
            />
          )}
          <div className="mt-1.5 border-t border-border pt-1.5">
            <a
              href="/metodologia"
              className="text-[10px] font-medium text-primary hover:underline"
            >
              Como este cálculo é feito? →
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
