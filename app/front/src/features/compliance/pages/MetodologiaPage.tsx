import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, Download, ExternalLink } from "lucide-react"
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser"
import { PageLayout } from "@/components/layout/PageLayout"
import { PageSectionHeader } from "@/components/layout/PageSectionHeader"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/http-client"
import { cn } from "@/lib/utils"

type TechSpecsRaw = {
  data: {
    specs: {
      emission_factor_gasolina_c: number
      emission_factor_diesel_s10: number
      emission_factor_etanol: number
      emission_factor_gnv: number
      emission_factor_eletrico_kwh: number
      blend_etanol_pct: number
      blend_biodiesel_pct: number
      gwp100_ch4: number
      gwp100_n2o: number
      idle_rate_leve: number
      idle_rate_pesado: number
      baseline_pedagio_avg_wait_sec: number
      baseline_estacionamento_avg_wait_sec: number
      elapsed_pedagio_avg_sec: number
      elapsed_estacionamento_avg_sec: number
      elapsed_times_source: string
      paper_co2_per_ticket: number
      emission_factors_source: string
      emission_factors_year: number
      idle_rates_source: string
      gwp100_source: string
      blend_factors_source: string
      blend_factors_year: number
      paper_impact_source: string
    }
  }
}

const FALLBACK = {
  gasolina_c_base: 2.239, blend_eth: 0.30, gasolina_c_eff: 1.567,
  diesel_s10_base: 2.631, blend_bio: 0.15, diesel_s10_eff: 2.236,
  etanol: 1.510, gnv: 1.999, ev_kwh: 0.046,
  gwp_ch4: 27.9, gwp_n2o: 273.0,
  idle_leve: 0.00028, idle_pesado: 0.00069,
  baseline_pedagio: 180, baseline_estacionamento: 120,
  paper_co2: 0.012,
  ef_source: "FGV GHG Protocol Tool / BEN 2023 / MCTIC 2016",
  ef_year: 2023,
  idle_source: "U.S. DOE Fact #861 (2015) — proxy; sem dado CETESB/INMETRO público",
  elapsed_pedagio: 15,
  elapsed_estacionamento: 30,
  elapsed_source: "Premissa declarada — Sem Parar/ConectCar não publicam tempo médio por passagem",
  gwp_source: "IPCC AR6 2021, Tabela 7.SM.7",
  blend_source: "ANP/CNPE: E30 por Lei 14.993/2024 (em vigor ago/2025); B15 por Resolução CNPE (em vigor ago/2025)",
  blend_year: 2025,
  paper_source: "Ecoinvent 3.9 — papel térmico 80g/m²",
}

type ParamRowProps = {
  label: string
  value: string | number
  unit: string
  source: string
  year?: number | string
  warn?: boolean
}

const ParamRow = ({ label, value, unit, source, year, warn }: ParamRowProps) => (
  <TableRow className={warn ? "bg-warning/5" : undefined}>
    <TableCell className="font-medium">
      <span className="flex flex-wrap items-center gap-2">
        {label}
        {warn ? (
          <Badge variant="warning" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            estimativa
          </Badge>
        ) : null}
      </span>
    </TableCell>
    <TableCell className="font-mono">
      {value}{" "}
      <span className="text-xs text-muted-foreground">{unit}</span>
    </TableCell>
    <TableCell className="text-xs text-muted-foreground">{source}</TableCell>
    <TableCell className="text-xs text-muted-foreground">{year ?? "—"}</TableCell>
  </TableRow>
)

const _API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "")

export const MetodologiaPage = () => {
  const { user } = useCurrentUser()
  const isAdmin = user?.role === "admin"

  const { data: specs } = useQuery({
    queryKey: ["tech-specs-public"],
    queryFn: async () => {
      try {
        return await api.get("/api/technical-specs/").json<TechSpecsRaw>()
      } catch {
        return null
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  const s = specs?.data?.specs
  const ef_blend_bio = s ? s.blend_biodiesel_pct : FALLBACK.blend_bio
  const ef_blend_eth = s ? s.blend_etanol_pct : FALLBACK.blend_eth
  const gasolina_eff = s ? s.emission_factor_gasolina_c * (1 - ef_blend_eth) : FALLBACK.gasolina_c_eff
  const diesel_eff = s ? s.emission_factor_diesel_s10 * (1 - ef_blend_bio) : FALLBACK.diesel_s10_eff

  const params: ParamRowProps[] = [
    {
      label: "Fator CO₂ gasolina C (comercial)",
      value: gasolina_eff.toFixed(4),
      unit: "kg CO₂/L",
      source: s?.emission_factors_source ?? FALLBACK.ef_source,
      year: s?.emission_factors_year ?? FALLBACK.ef_year,
    },
    {
      label: "Blend etanol na gasolina C",
      value: `${Math.round(ef_blend_eth * 100)}%`,
      unit: "(E30)",
      source: s ? "" : FALLBACK.blend_source,
      year: s ? "" : FALLBACK.blend_year,
    },
    {
      label: "Fator CO₂ diesel S10 (comercial)",
      value: diesel_eff.toFixed(4),
      unit: "kg CO₂/L",
      source: s?.emission_factors_source ?? FALLBACK.ef_source,
      year: s?.emission_factors_year ?? FALLBACK.ef_year,
    },
    {
      label: "Blend biodiesel no diesel S10",
      value: `${Math.round(ef_blend_bio * 100)}%`,
      unit: "(B15)",
      source: s ? "" : FALLBACK.blend_source,
      year: s ? "" : FALLBACK.blend_year,
    },
    {
      label: "Fator CO₂ GNV",
      value: s?.emission_factor_gnv ?? FALLBACK.gnv,
      unit: "kg CO₂/m³",
      source: s?.emission_factors_source ?? FALLBACK.ef_source,
      year: s?.emission_factors_year ?? FALLBACK.ef_year,
    },
    {
      label: "Fator CO₂ elétrico (rede SIN)",
      value: s?.emission_factor_eletrico_kwh ?? FALLBACK.ev_kwh,
      unit: "kg CO₂/kWh",
      source: "FGV GHG Protocol, Aba Fatores Variáveis / ONS 2023–2025",
      year: 2025,
    },
    {
      label: "GWP100 CH4",
      value: s?.gwp100_ch4 ?? FALLBACK.gwp_ch4,
      unit: "kg CO₂e / kg CH4",
      source: s?.gwp100_source ?? FALLBACK.gwp_source,
      year: 2021,
    },
    {
      label: "GWP100 N2O",
      value: s?.gwp100_n2o ?? FALLBACK.gwp_n2o,
      unit: "kg CO₂e / kg N2O",
      source: s?.gwp100_source ?? FALLBACK.gwp_source,
      year: 2021,
    },
    {
      label: "Taxa consumo idle — veículo leve",
      value: `${s?.idle_rate_leve ?? FALLBACK.idle_leve} (${((s?.idle_rate_leve ?? FALLBACK.idle_leve) * 3600).toFixed(1)} L/h)`,
      unit: "L/s",
      source: s?.idle_rates_source ?? FALLBACK.idle_source,
      year: 2015,
      warn: true,
    },
    {
      label: "Taxa consumo idle — veículo pesado",
      value: `${s?.idle_rate_pesado ?? FALLBACK.idle_pesado} (${((s?.idle_rate_pesado ?? FALLBACK.idle_pesado) * 3600).toFixed(1)} L/h)`,
      unit: "L/s",
      source: s?.idle_rates_source ?? FALLBACK.idle_source,
      year: 2015,
      warn: true,
    },
    {
      label: "Tempo médio sem tag — pedágio",
      value: s?.baseline_pedagio_avg_wait_sec ?? FALLBACK.baseline_pedagio,
      unit: "s",
      source: "Premissa declarada — sem dado público ANP/ABCR/ANTT disponível",
      warn: true,
    },
    {
      label: "Tempo médio sem tag — estacionamento",
      value: s?.baseline_estacionamento_avg_wait_sec ?? FALLBACK.baseline_estacionamento,
      unit: "s",
      source: "Premissa declarada",
      warn: true,
    },
    {
      label: "Tempo estimado com tag — pedágio",
      value: s?.elapsed_pedagio_avg_sec ?? FALLBACK.elapsed_pedagio,
      unit: "s",
      source: s?.elapsed_times_source ?? FALLBACK.elapsed_source,
      warn: true,
    },
    {
      label: "Tempo estimado com tag — estacionamento",
      value: s?.elapsed_estacionamento_avg_sec ?? FALLBACK.elapsed_estacionamento,
      unit: "s",
      source: s?.elapsed_times_source ?? FALLBACK.elapsed_source,
      warn: true,
    },
    {
      label: "CO₂ por ticket de papel",
      value: s?.paper_co2_per_ticket ?? FALLBACK.paper_co2,
      unit: "kg CO₂",
      source: s?.paper_impact_source ?? FALLBACK.paper_source,
    },
  ]

  const limitations = [
    {
      title: "Taxa de consumo em idle (idle_rate)",
      text: `Nota de Conservadorismo Metodológico: Na ausência de fatores de marcha lenta específicos para a frota brasileira homologados pela CETESB ou INMETRO, adotou-se o U.S. DOE Fact #861 (2015) como proxy técnica. Valores atuais: leve ${(s?.idle_rate_leve ?? FALLBACK.idle_leve) * 3600} L/h; pesado ${(s?.idle_rate_pesado ?? FALLBACK.idle_pesado) * 3600} L/h. Pelo princípio do conservadorismo do GHG Protocol, os valores foram aplicados linearmente, desconsiderando variações de eficiência por envelhecimento da frota nacional — o que torna a estimativa de emissões evitadas conservadora.`,
      warn: true,
    },
    {
      title: "Tempos de passagem (baseline e elapsed)",
      text: `Ambos os tempos são premissas declaradas: sem tag = ${s?.baseline_pedagio_avg_wait_sec ?? FALLBACK.baseline_pedagio}s (pedágio) / ${s?.baseline_estacionamento_avg_wait_sec ?? FALLBACK.baseline_estacionamento}s (estacionamento); com tag = ${s?.elapsed_pedagio_avg_sec ?? FALLBACK.elapsed_pedagio}s (pedágio) / ${s?.elapsed_estacionamento_avg_sec ?? FALLBACK.elapsed_estacionamento}s (estacionamento). ANTT, ABCR, CCR, Ecorodovias e Arteris não publicam tempo médio por tipo de pista; Sem Parar e ConectCar não publicam tempo de passagem. Este par de parâmetros é a maior fonte de incerteza do modelo: uma variação de ±50% no delta (tempo_salvo) altera o CO₂e evitado proporcionalmente.`,
      warn: true,
    },
    {
      title: "Consumo em idle — veículo elétrico",
      text: "O consumo em marcha lenta de veículos elétricos (ar-condicionado, painel) é ínfimo comparado a motores de combustão. Para fins deste modelo, foi considerado desprezível e não contabilizado no Escopo 2. O fator da rede SIN (0.046 kg CO₂/kWh, média 2023-2025) se aplica normalmente ao consumo em movimento.",
      warn: false,
    },
    {
      title: "Fator da rede elétrica (SIN)",
      text: "O fator SIN varia mensalmente conforme o nível dos reservatórios: 2023=0.039, 2024=0.055 (ano seco), 2025=0.046 kg CO₂/kWh. Usamos a média 2023-2025 = 0.046 kg CO₂/kWh, calculada diretamente da Aba Fatores Variáveis da FGV GHG Protocol Tool. Em anos de seca extrema (2021), o fator atingiu 4× a média histórica.",
      warn: false,
    },
    {
      title: "Blend de biocombustíveis",
      text: "E30 (etanol na gasolina) e B15 (biodiesel no diesel) estão em vigor desde agosto de 2025 e já estão aplicados neste modelo. Os percentuais são configuráveis via API e devem ser atualizados nas próximas resoluções ANP/CNPE.",
      warn: false,
    },
  ]

  const references = [
    {
      name: "FGV GHG Protocol Tool",
      desc: "Fatores CO₂, CH4, N2O por combustível — BEN 2023 / MCTIC 2016",
      url: "https://bibliotecadigital.fgv.br/dspace/handle/10438/30248",
    },
    {
      name: "IPCC AR6 (2021) — Tabela 7.SM.7",
      desc: "GWP100: CH4 = 27.9, N2O = 273.0",
      url: "https://www.ipcc.ch/report/ar6/wg1/",
    },
    {
      name: "Lei 14.993/2024 — Combustível do Futuro",
      desc: "Blend gasolina: E27 → E30 (em vigor desde ago/2025)",
      url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14993.htm",
    },
    {
      name: "CNPE Resolução 2024 — Biodiesel",
      desc: "Blend diesel: B14 → B15 (em vigor desde ago/2025)",
      url: "https://www.gov.br/mdic/pt-br/assuntos/bioeconomia/bioenergia",
    },
    {
      name: "U.S. DOE Fact #861 (2015)",
      desc: "Idle fuel consumption — proxy para taxa de consumo em marcha lenta",
      url: "https://www.energy.gov/eere/vehicles/fact-861-february-23-2015-idle-fuel-consumption-selected-gasoline-and-diesel-vehicles",
    },
    {
      name: "apibrasil.io — Consulta Veicular",
      desc: "Lookup de placa → tipo de combustível, categoria, dados FIPE e DETRAN",
      url: "https://apibrasil.io",
    },
  ]

  return (
    <PageLayout
      title="Metodologia"
      description="Documentação do cálculo de CO₂e evitado em pedágios e estacionamentos. Parâmetros, fontes e limitações declarados explicitamente."
    >
      <div className="space-y-6">
        <div className="rounded border border-neutral-300 bg-muted/20 p-4 md:hidden">
          <PageSectionHeader
            variant="section"
            title="Navegação rápida"
            description="Seções desta página"
          />
          <nav className="mt-3 flex flex-wrap gap-2 text-xs">
            {[
              ["#problema", "Problema"],
              ["#formula", "Fórmula"],
              ["#fluxo", "Fluxo"],
              ["#parametros", "Parâmetros"],
              ["#limitacoes", "Limitações"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-full border border-border bg-background px-3 py-1 font-medium text-foreground hover:bg-muted"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <Card id="problema">
          <CardHeader>
            <CardTitle>1. O problema</CardTitle>
            <CardDescription>
              Comparação entre o fluxo com pagamento manual e o fluxo com tag automática.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded border border-destructive/30 bg-destructive/5 p-4">
                <p className="mb-2 text-sm font-semibold text-destructive">
                  Sem tag (pagamento manual)
                </p>
                <ol className="space-y-1 text-sm text-muted-foreground">
                  <li>1. Veículo desacelera até a cabine</li>
                  <li>2. Espera em fila (~3 minutos)</li>
                  <li>3. Realiza o pagamento (~30–45s)</li>
                  <li>4. Recebe ticket de papel</li>
                  <li>5. Acelera de volta à velocidade de cruzeiro</li>
                </ol>
                <p className="mt-3 text-xs font-medium text-destructive">
                  Combustível queimado na fila e na aceleração = emissão desnecessária
                </p>
              </div>
              <div className="rounded border border-success/30 bg-success/10 p-4">
                <p className="mb-2 text-sm font-semibold text-success">
                  Com tag (pagamento automático)
                </p>
                <ol className="space-y-1 text-sm text-muted-foreground">
                  <li>1. Veículo mantém velocidade reduzida (~40 km/h)</li>
                  <li>2. Passa pela cancela em ~5–15 segundos</li>
                  <li>3. Sem parada, sem fila, sem ticket</li>
                  <li>4. Retoma velocidade</li>
                </ol>
                <p className="mt-3 text-xs font-medium text-success">
                  Tempo salvo × taxa de consumo idle = combustível economizado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="formula">
          <CardHeader>
            <CardTitle>2. A fórmula</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded border border-neutral-300 bg-muted/40 p-5 font-mono text-sm leading-loose">
              <p className="font-semibold text-foreground">CO₂e_evitado =</p>
              <p className="ml-4 text-foreground">
                (<a href="#parametros" className="text-primary hover:underline">baseline_sem_tag</a>
                {" − "}
                <span className="text-primary">tempo_com_tag</span>)
              </p>
              <p className="ml-4">
                × <a href="#parametros" className="text-primary hover:underline">taxa_idle</a>[categoria_veículo]
              </p>
              <p className="ml-4">
                × (<a href="#parametros" className="text-primary hover:underline">fator_CO₂</a>[combustível] +{" "}
                <a href="#parametros" className="text-primary hover:underline">CH4</a>[comb] × GWP100_CH4 +{" "}
                <a href="#parametros" className="text-primary hover:underline">N2O</a>[comb] × GWP100_N2O)
              </p>
              <p className="ml-4">
                + <a href="#parametros" className="text-primary hover:underline">CO₂_papel_evitado</a> × is_digital
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <p className="font-semibold">Variáveis de entrada</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li><code className="rounded bg-muted px-1 text-xs">baseline_sem_tag</code> — tempo médio sem tag</li>
                  <li><code className="rounded bg-muted px-1 text-xs">tempo_com_tag</code> — tempo real da passagem</li>
                  <li><code className="rounded bg-muted px-1 text-xs">categoria_veículo</code> — leve ou pesado</li>
                  <li><code className="rounded bg-muted px-1 text-xs">combustível</code> — gasolina/diesel/etanol/GNV/elétrico</li>
                  <li><code className="rounded bg-muted px-1 text-xs">is_digital</code> — tag digital elimina ticket de papel</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold">O que é CO₂e?</p>
                <p className="mt-2 text-muted-foreground">
                  CO₂e (CO₂ equivalente) é a soma de todos os gases de efeito estufa convertidos
                  para uma unidade comum, usando o potencial de aquecimento global (GWP100) do IPCC AR6:
                  CH4 × 27.9 + N2O × 273.0.
                </p>
              </div>
            </div>
            <div className="rounded border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Aceleração (accel_surge):</strong> O modelo contabiliza apenas o consumo em marcha lenta (idle).
              A variável <code className="rounded bg-muted px-1 text-xs">accel_surge</code> já existe na arquitetura (valor atual: 0.0 — conservador)
              e poderá ser calibrada com medições de campo para capturar o pico de consumo no arranque.
            </div>
            <div className="rounded border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <strong className="text-foreground">Etanol:</strong> O CO₂ gerado pela queima de etanol é biogênico.
              Pelo GHG Protocol Brasil, CO₂ biogênico <strong className="text-foreground">não conta no Escopo 1</strong> e é reportado separadamente.
              A emissão de Escopo 1 do etanol vem apenas de CH4 e N2O.
            </div>
          </CardContent>
        </Card>

        <Card id="fluxo">
          <CardHeader>
            <CardTitle>3. Fluxo de dados</CardTitle>
            <CardDescription>
              Do momento em que os dados chegam ao engine até a geração do resultado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-1 text-sm">

              {/* ENTRADAS */}
              <div className="w-full max-w-2xl rounded border border-border bg-muted/40 p-4">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entradas</p>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                  <div className="rounded border border-border bg-background p-3">
                    <p className="text-xs font-semibold">Placa</p>
                    <p className="mt-1 text-xs text-muted-foreground">↓ apibrasil.io</p>
                    <p className="mt-1 font-mono text-xs text-foreground">combustível · categoria</p>
                  </div>
                  <div className="rounded border border-border bg-background p-3">
                    <p className="text-xs font-semibold">Dados da passagem</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">context · uf · is_digital</p>
                  </div>
                  <div className="rounded border border-warning/40 bg-warning/5 p-3">
                    <p className="text-xs font-semibold">Tempos (estimativas)</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">baseline_avg_wait_sec</p>
                    <p className="font-mono text-xs text-muted-foreground">elapsed_avg_sec</p>
                    <p className="mt-1 text-xs text-warning-foreground">⚠ premissas declaradas</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center py-1 text-muted-foreground">
                <div className="h-4 w-px bg-border" />
                <span className="text-xs">↓</span>
              </div>

              {/* PASSO 1 */}
              <div className="w-full max-w-2xl rounded border border-border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">Passo 1 — Tempo salvo</p>
                <p className="mt-2 font-mono text-sm">
                  tempo_salvo = <span className="text-warning">baseline_avg_wait_sec</span> − <span className="text-warning">elapsed_avg_sec</span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Pedágio: 180s (sem tag) − 15s (com tag) = 165s salvo<br />
                  Estacionamento: 120s (sem tag) − 30s (com tag) = 90s salvo
                </p>
              </div>

              <div className="flex flex-col items-center py-1 text-muted-foreground">
                <div className="h-4 w-px bg-border" />
                <span className="text-xs">↓</span>
              </div>

              {/* PASSO 2 */}
              <div className="w-full max-w-2xl rounded border border-border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">Passo 2 — Combustível evitado</p>
                <p className="mt-2 font-mono text-sm">
                  combustível = tempo_salvo × <span className="text-primary">idle_rate</span>[categoria]
                </p>
              </div>

              <div className="flex flex-col items-center py-1 text-muted-foreground">
                <div className="h-4 w-px bg-border" />
                <span className="text-xs">↓</span>
              </div>

              {/* PASSO 3 */}
              <div className="w-full max-w-2xl rounded border border-border bg-background p-4">
                <p className="mb-3 text-xs font-semibold text-muted-foreground">Passo 3 — Emissões por gás</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded border border-border bg-muted/30 p-2 text-center">
                    <p className="text-xs font-semibold">CO₂ fóssil</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">comb × fator_CO₂</p>
                  </div>
                  <div className="rounded border border-border bg-muted/30 p-2 text-center">
                    <p className="text-xs font-semibold">CH4 → CO₂e</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">comb × CH4 × 27.9</p>
                  </div>
                  <div className="rounded border border-border bg-muted/30 p-2 text-center">
                    <p className="text-xs font-semibold">N2O → CO₂e</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">comb × N2O × 273.0</p>
                  </div>
                </div>
                <div className="mt-3 rounded border border-border bg-muted/50 p-2 text-center">
                  <p className="font-mono text-xs">co2e_scope1 = CO₂ + CH4_co2e + N2O_co2e</p>
                </div>
              </div>

              <div className="flex flex-col items-center py-1 text-muted-foreground">
                <div className="h-4 w-px bg-border" />
                <span className="text-xs">↓ + ticket de papel (se is_digital)</span>
              </div>

              {/* TOTAL */}
              <div className="w-full max-w-2xl rounded border border-success/40 bg-success/10 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-success">Total CO₂e evitado</p>
                <p className="mt-1 font-mono text-sm">co2e_scope1 + paper_co2_avoided</p>
              </div>

              <div className="flex flex-col items-center py-1 text-muted-foreground">
                <div className="h-4 w-px bg-border" />
                <span className="text-xs">↓</span>
              </div>

              {/* SAÍDA */}
              <div className="w-full max-w-2xl rounded border border-border bg-muted/40 p-4">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resultado</p>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  {[
                    { label: "environmental", desc: "co2_kg · scopes · gases" },
                    { label: "financial", desc: "fuel_savings_brl" },
                    { label: "comparison", desc: "sem tag vs com tag" },
                    { label: "sensitivity", desc: "±20% ±50%" },
                  ].map(({ label, desc }) => (
                    <div key={label} className="rounded border border-border bg-background p-2 text-center">
                      <p className="font-mono text-xs font-semibold">{label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        <Card id="parametros">
          <CardHeader>
            <CardTitle>4. Parâmetros e fontes</CardTitle>
            <CardDescription>
              Valores atuais do sistema. Linhas marcadas como estimativa são premissas declaradas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded border border-warning/30 bg-warning/10 p-4 text-sm text-warning-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Linhas marcadas como <strong>estimativa</strong> não possuem fonte pública brasileira oficial.
                Ver seção <a href="#limitacoes" className="font-medium underline">Limitações</a>.
              </p>
            </div>
            {specs === undefined ? (
              <p className="text-xs text-muted-foreground">Carregando valores atuais do banco…</p>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parâmetro</TableHead>
                  <TableHead>Valor atual</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Ano</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {params.map((p, i) => (
                  <ParamRow key={i} {...p} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card id="combustiveis">
          <CardHeader>
            <CardTitle>5. Combustíveis cobertos</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Combustível</TableHead>
                  <TableHead>Fator CO₂e efetivo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Escopo GHG Protocol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Gasolina C</TableCell>
                  <TableCell className="font-mono">{gasolina_eff.toFixed(4)}</TableCell>
                  <TableCell className="text-muted-foreground">kg CO₂e/L</TableCell>
                  <TableCell className="text-muted-foreground">Escopo 1 (combustão)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Diesel S10</TableCell>
                  <TableCell className="font-mono">{diesel_eff.toFixed(4)}</TableCell>
                  <TableCell className="text-muted-foreground">kg CO₂e/L</TableCell>
                  <TableCell className="text-muted-foreground">Escopo 1 (combustão)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Etanol hidratado</TableCell>
                  <TableCell className="font-mono">~0.002 (fóssil)</TableCell>
                  <TableCell className="text-muted-foreground">kg CO₂e/L</TableCell>
                  <TableCell className="text-muted-foreground">Escopo 1 ≈ 0 (CO₂ biogênico reportado separado)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">GNV</TableCell>
                  <TableCell className="font-mono">{s?.emission_factor_gnv ?? FALLBACK.gnv}</TableCell>
                  <TableCell className="text-muted-foreground">kg CO₂e/m³</TableCell>
                  <TableCell className="text-muted-foreground">Escopo 1 (combustão)</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Elétrico</TableCell>
                  <TableCell className="font-mono">{s?.emission_factor_eletrico_kwh ?? FALLBACK.ev_kwh}</TableCell>
                  <TableCell className="text-muted-foreground">kg CO₂e/kWh</TableCell>
                  <TableCell className="text-muted-foreground">Escopo 2 (rede SIN)</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card id="limitacoes">
          <CardHeader>
            <CardTitle>6. Limitações declaradas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {limitations.map((item, i) => (
              <div
                key={i}
                className={cn(
                  "rounded border p-4",
                  item.warn ? "border-warning/30 bg-warning/5" : "border-border bg-muted/30",
                )}
              >
                <div className="flex items-start gap-2">
                  {item.warn ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                  ) : null}
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card id="fontes">
          <CardHeader>
            <CardTitle>7. Fontes e referências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {references.map((ref, i) => (
              <a
                key={i}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 rounded border border-neutral-300 bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{ref.name}</p>
                  <p className="text-xs text-muted-foreground">{ref.desc}</p>
                </div>
              </a>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <div>
              <p className="text-base font-semibold">
                Quer verificar o cálculo completo com fórmulas?
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Baixe a planilha auditável com glossário, premissas, passo a passo, análise de sensibilidade e projeção de escala.
              </p>
            </div>
            {isAdmin ? (
              <Button
                onClick={() => {
                  const url = `${_API_BASE}/api/reports/calculadora.xlsx?plate=DEMO0001&elapsed_time=30&context=pedagio&uf=SP`
                  window.open(url, "_blank")
                }}
              >
                <Download />
                Download da Planilha de Cálculo (XLSX)
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Download disponível apenas para administradores.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
