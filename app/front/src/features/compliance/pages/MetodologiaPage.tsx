import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, BookOpen, Download, ExternalLink, Leaf } from "lucide-react"
import { api } from "@/lib/http-client"

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Static fallback values (same as seed defaults) ────────────────────────────

const FALLBACK = {
  gasolina_c_base: 2.239, blend_eth: 0.27, gasolina_c_eff: 1.634,
  diesel_s10_base: 2.631, blend_bio: 0.14, diesel_s10_eff: 2.263,
  etanol: 1.510, gnv: 1.999, ev_kwh: 0.040,
  gwp_ch4: 27.9, gwp_n2o: 273.0,
  idle_leve: 0.00028, idle_pesado: 0.00069,
  baseline_pedagio: 180, baseline_estacionamento: 120,
  paper_co2: 0.012,
  ef_source: "FGV GHG Protocol Tool / BEN 2023 / MCTIC 2016",
  ef_year: 2023,
  idle_source: "U.S. DOE Fact #861 (2015) — proxy; sem dado CETESB/INMETRO público",
  gwp_source: "IPCC AR6 2021, Tabela 7.SM.7",
  blend_source: "ANP/CNPE: E27 por Lei 14.993/2024; B14 por Resolução CNPE 2024",
  blend_year: 2024,
  paper_source: "Ecoinvent 3.9 — papel térmico 80g/m²",
}

// ── Component helpers ─────────────────────────────────────────────────────────

const Section = ({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) => (
  <section id={id} className="border-b border-border pb-10 pt-8">
    <h2 className="mb-4 text-2xl font-black tracking-tight text-foreground">{title}</h2>
    {children}
  </section>
)

const Tag = ({ warn, children }: { warn?: boolean; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold ${
    warn ? "bg-yellow-100 text-yellow-800" : "bg-muted text-muted-foreground"
  }`}>
    {warn && <AlertTriangle className="h-3 w-3" />}
    {children}
  </span>
)

type ParamRowProps = {
  label: string
  value: string | number
  unit: string
  source: string
  year?: number | string
  warn?: boolean
}

const ParamRow = ({ label, value, unit, source, year, warn }: ParamRowProps) => (
  <tr className={warn ? "bg-yellow-50" : undefined}>
    <td className="py-2 pr-4 text-sm font-medium text-foreground align-top">
      {label}
      {warn && <Tag warn>estimativa</Tag>}
    </td>
    <td className="py-2 pr-4 text-sm font-mono text-foreground align-top">
      {value} <span className="text-xs text-muted-foreground">{unit}</span>
    </td>
    <td className="py-2 pr-2 text-xs text-muted-foreground align-top">{source}</td>
    <td className="py-2 text-xs text-muted-foreground align-top">{year ?? "—"}</td>
  </tr>
)

// ── Page ──────────────────────────────────────────────────────────────────────

export const MetodologiaPage = () => {
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
  const ef_blend_bio  = s ? s.blend_biodiesel_pct : FALLBACK.blend_bio
  const ef_blend_eth  = s ? s.blend_etanol_pct    : FALLBACK.blend_eth
  const gasolina_eff  = s ? s.emission_factor_gasolina_c * (1 - ef_blend_eth) : FALLBACK.gasolina_c_eff
  const diesel_eff    = s ? s.emission_factor_diesel_s10 * (1 - ef_blend_bio) : FALLBACK.diesel_s10_eff

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
      unit: "(E27)",
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
      unit: "(B14)",
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
      label: "CO₂ por ticket de papel",
      value: s?.paper_co2_per_ticket ?? FALLBACK.paper_co2,
      unit: "kg CO₂",
      source: s?.paper_impact_source ?? FALLBACK.paper_source,
    },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-primary" />
            <span className="font-black tracking-tight text-foreground">EcoScore</span>
          </div>
          <a href="/login" className="text-sm font-medium text-primary hover:underline">
            Acessar plataforma →
          </a>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 pb-20">
        {/* Hero */}
        <div className="py-12">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            <BookOpen className="h-3.5 w-3.5" />
            Metodologia pública
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">
            Como calculamos as emissões evitadas pelo uso de tag
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Documentação completa da metodologia de cálculo de CO₂e evitado em pedágios e estacionamentos.
            Todos os parâmetros, fontes e limitações declarados explicitamente.
          </p>
        </div>

        {/* Section 1 — O problema */}
        <Section id="problema" title="1. O problema">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded border border-red-200 bg-red-50 p-4">
              <p className="mb-2 text-sm font-bold text-red-800">❌ Sem tag (pagamento manual)</p>
              <ol className="space-y-1 text-sm text-red-700">
                <li>1. Veículo desacelera até a cabine</li>
                <li>2. Espera em fila (~3 minutos)</li>
                <li>3. Realiza o pagamento (~30–45s)</li>
                <li>4. Recebe ticket de papel</li>
                <li>5. Acelera de volta à velocidade de cruzeiro</li>
              </ol>
              <p className="mt-3 text-xs font-semibold text-red-700">
                → Combustível queimado na fila e na aceleração = emissão desnecessária
              </p>
            </div>
            <div className="rounded border border-green-200 bg-green-50 p-4">
              <p className="mb-2 text-sm font-bold text-green-800">✅ Com tag (pagamento automático)</p>
              <ol className="space-y-1 text-sm text-green-700">
                <li>1. Veículo mantém velocidade reduzida (~40 km/h)</li>
                <li>2. Passa pela cancela em ~5–15 segundos</li>
                <li>3. Sem parada, sem fila, sem ticket</li>
                <li>4. Retoma velocidade</li>
              </ol>
              <p className="mt-3 text-xs font-semibold text-green-700">
                → Tempo salvo × taxa de consumo idle = combustível economizado
              </p>
            </div>
          </div>
        </Section>

        {/* Section 2 — A fórmula */}
        <Section id="formula" title="2. A fórmula">
          <div className="rounded border border-border bg-muted/40 p-5 font-mono text-sm leading-loose">
            <p className="font-bold text-foreground">CO₂e_evitado =</p>
            <p className="ml-4 text-foreground">
              (<a href="#parametros" className="text-primary hover:underline">baseline_sem_tag</a>
              {" − "}
              <span className="text-blue-700">tempo_com_tag</span>)
            </p>
            <p className="ml-4">× <a href="#parametros" className="text-primary hover:underline">taxa_idle</a>[categoria_veículo]</p>
            <p className="ml-4">× (<a href="#parametros" className="text-primary hover:underline">fator_CO₂</a>[combustível] + <a href="#parametros" className="text-primary hover:underline">CH4</a>[comb] × GWP100_CH4 + <a href="#parametros" className="text-primary hover:underline">N2O</a>[comb] × GWP100_N2O)</p>
            <p className="ml-4">+ <a href="#parametros" className="text-primary hover:underline">CO₂_papel_evitado</a> × is_digital</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
            <div>
              <p className="font-semibold">Variáveis de entrada</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                <li><code className="rounded bg-muted px-1 text-xs">baseline_sem_tag</code> — tempo médio sem tag (parâmetro configurável)</li>
                <li><code className="rounded bg-muted px-1 text-xs">tempo_com_tag</code> — tempo real da passagem (input do sistema)</li>
                <li><code className="rounded bg-muted px-1 text-xs">categoria_veículo</code> — leve ou pesado (define taxa idle)</li>
                <li><code className="rounded bg-muted px-1 text-xs">combustível</code> — gasolina/diesel/etanol/GNV/elétrico</li>
                <li><code className="rounded bg-muted px-1 text-xs">is_digital</code> — tag digital elimina ticket de papel</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">O que é CO₂e?</p>
              <p className="mt-1 text-muted-foreground">
                CO₂e (CO₂ equivalente) é a soma de todos os gases de efeito estufa convertidos
                para uma unidade comum, usando o potencial de aquecimento global (GWP100) do IPCC AR6:
                CH4 × 27.9 + N2O × 273.0. Garante comparabilidade entre gases.
              </p>
            </div>
          </div>
          <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
            <strong>Etanol:</strong> O CO₂ gerado pela queima de etanol é biogênico (originado da fotossíntese da cana-de-açúcar).
            Pelo GHG Protocol Brasil, CO₂ biogênico <strong>não conta no Escopo 1</strong> e é reportado separadamente.
            A emissão de Escopo 1 do etanol vem apenas de CH4 e N2O (muito pequena).
          </div>
        </Section>

        {/* Section 3 — Parâmetros */}
        <Section id="parametros" title="3. Parâmetros e fontes">
          <div className="mb-3 flex items-start gap-2 rounded border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Linhas marcadas como <strong>estimativa</strong> não possuem fonte pública brasileira oficial.
              São declaradas explicitamente como premissas. Ver seção <a href="#limitacoes" className="underline">Limitações</a>.
            </p>
          </div>
          {specs === undefined && (
            <p className="mb-3 text-xs text-muted-foreground">Carregando valores atuais do banco…</p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 pr-4 text-left font-semibold">Parâmetro</th>
                  <th className="pb-2 pr-4 text-left font-semibold">Valor atual</th>
                  <th className="pb-2 pr-2 text-left font-semibold">Fonte</th>
                  <th className="pb-2 text-left font-semibold">Ano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {params.map((p, i) => (
                  <ParamRow key={i} {...p} />
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Section 4 — Combustíveis cobertos */}
        <Section id="combustiveis" title="4. Combustíveis cobertos">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-2 pr-4 text-left font-semibold">Combustível</th>
                  <th className="pb-2 pr-4 text-left font-semibold">Fator CO₂e efetivo</th>
                  <th className="pb-2 pr-4 text-left font-semibold">Unidade</th>
                  <th className="pb-2 text-left font-semibold">Escopo GHG Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-2 pr-4 font-medium">Gasolina C</td>
                  <td className="py-2 pr-4 font-mono">{gasolina_eff.toFixed(4)}</td>
                  <td className="py-2 pr-4 text-muted-foreground">kg CO₂e/L</td>
                  <td className="py-2 text-muted-foreground">Escopo 1 (combustão)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Diesel S10</td>
                  <td className="py-2 pr-4 font-mono">{diesel_eff.toFixed(4)}</td>
                  <td className="py-2 pr-4 text-muted-foreground">kg CO₂e/L</td>
                  <td className="py-2 text-muted-foreground">Escopo 1 (combustão)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Etanol hidratado</td>
                  <td className="py-2 pr-4 font-mono">~0.002 (fóssil)</td>
                  <td className="py-2 pr-4 text-muted-foreground">kg CO₂e/L</td>
                  <td className="py-2 text-muted-foreground">Escopo 1 ≈ 0 (CO₂ biogênico reportado separado)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">GNV</td>
                  <td className="py-2 pr-4 font-mono">{s?.emission_factor_gnv ?? FALLBACK.gnv}</td>
                  <td className="py-2 pr-4 text-muted-foreground">kg CO₂e/m³</td>
                  <td className="py-2 text-muted-foreground">Escopo 1 (combustão)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium">Elétrico</td>
                  <td className="py-2 pr-4 font-mono">{s?.emission_factor_eletrico_kwh ?? FALLBACK.ev_kwh}</td>
                  <td className="py-2 pr-4 text-muted-foreground">kg CO₂e/kWh</td>
                  <td className="py-2 text-muted-foreground">Escopo 2 (rede SIN)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Section 5 — Limitações */}
        <Section id="limitacoes" title="5. Limitações declaradas">
          <div className="space-y-3">
            {[
              {
                title: "Taxa de consumo em idle (idle_rate)",
                text: `Os valores atuais (leve: ${(s?.idle_rate_leve ?? FALLBACK.idle_leve) * 3600} L/h; pesado: ${(s?.idle_rate_pesado ?? FALLBACK.idle_pesado) * 3600} L/h) são baseados em U.S. DOE Fact #861 (2015) — um proxy americano. Não existe dado público equivalente publicado pelo CETESB, INMETRO ou fabricantes brasileiros.`,
                warn: true,
              },
              {
                title: "Tempo médio sem tag (baseline_wait_sec)",
                text: `O valor de ${s?.baseline_pedagio_avg_wait_sec ?? FALLBACK.baseline_pedagio}s (pedágio) é uma premissa. ANTT, ABCR, CCR, Ecorodovias e Arteris não publicam dados de tempo médio por tipo de pista. Este é o parâmetro de maior sensibilidade do modelo: uma variação de ±50% no baseline altera o CO₂e evitado proporcionalmente.`,
                warn: true,
              },
              {
                title: "Fator da rede elétrica (SIN)",
                text: "O fator SIN (~0.040 kg CO₂/kWh) varia mensalmente conforme o nível dos reservatórios. Usamos a média anual mais recente. Em anos secos (2021), o fator pode ser 4× maior.",
                warn: false,
              },
              {
                title: "Blend de biocombustíveis",
                text: "Os percentuais E27 (etanol na gasolina) e B14 (biodiesel no diesel) são configuráveis e devem ser atualizados quando a ANP/CNPE mudar a legislação. E30 e B15 entram em vigor a partir de agosto de 2025.",
                warn: false,
              },
            ].map((item, i) => (
              <div
                key={i}
                className={`rounded border p-4 ${item.warn ? "border-yellow-200 bg-yellow-50" : "border-border bg-muted/30"}`}
              >
                <div className="flex items-start gap-2">
                  {item.warn && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />}
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Section 6 — Fontes */}
        <Section id="fontes" title="6. Fontes e referências">
          <div className="space-y-2">
            {[
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
                desc: "Blend E27 gasolina → E30 a partir ago/2025",
                url: "https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/l14993.htm",
              },
              {
                name: "CNPE Resolução 2024 — Biodiesel",
                desc: "Blend B14 diesel → B15 a partir ago/2025",
                url: "https://www.gov.br/mdic/pt-br/assuntos/bioeconomia/bioenergia",
              },
              {
                name: "U.S. DOE Fact #861 (2015)",
                desc: "Idle fuel consumption — proxy para taxa de consumo em marcha lenta",
                url: "https://www.energy.gov/eere/vehicles/fact-861-february-23-2015-idle-fuel-consumption-selected-gasoline-and-diesel-vehicles",
              },
              {
                name: "brasil.io — RENAVAM/DENATRAN",
                desc: "Lookup de placa → tipo de combustível e categoria do veículo",
                url: "https://brasil.io/dataset/veiculos/",
              },
            ].map((ref, i) => (
              <a
                key={i}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 rounded border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{ref.name}</p>
                  <p className="text-xs text-muted-foreground">{ref.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <div className="mt-10 rounded border border-primary/20 bg-primary/5 p-6 text-center">
          <p className="mb-2 text-base font-bold text-foreground">
            Quer verificar o cálculo completo com fórmulas?
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            Baixe a planilha auditável com todas as premissas, passo a passo, análise de sensibilidade e projeção de escala.
          </p>
          <a
            href="/api/reports/calculadora.xlsx?plate=DEMO0001&elapsed_time=30&context=pedagio&uf=SP"
            className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            Download da Planilha de Cálculo (XLSX)
          </a>
        </div>
      </div>
    </div>
  )
}
