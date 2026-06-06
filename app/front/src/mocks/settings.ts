import type {
  FuelPriceByUF,
  TechnicalSpecs,
} from "@/features/settings/api/requests";

export const MOCK_TECHNICAL_SPECS: TechnicalSpecs = {
  id: 1,
  emission_factor_diesel_s10: 2.68,
  emission_factor_gasolina_c: 2.31,
  emission_factor_etanol: 1.52,
  emission_factor_gnv: 1.96,
  emission_factor_eletrico_kwh: 0.08,
  ch4_factor_gasolina_c: 0.0001,
  ch4_factor_diesel_s10: 0.0001,
  ch4_factor_etanol: 0.0001,
  ch4_factor_gnv: 0.0001,
  n2o_factor_gasolina_c: 0.00001,
  n2o_factor_diesel_s10: 0.00001,
  n2o_factor_etanol: 0.00001,
  n2o_factor_gnv: 0.00001,
  gwp100_ch4: 27.9,
  gwp100_n2o: 273.0,
  blend_etanol_pct: 0.27,
  blend_biodiesel_pct: 0.14,
  idle_rate_leve: 0.000417,
  idle_rate_pesado: 0.001111,
  idle_rate_gnv: 0.0003,
  idle_rate_eletrico: 0.00005,
  paper_co2_per_ticket: 0.005,
  paper_water_per_ticket: 10,
  ludic_tree_year_absorption: 22,
  baseline_pedagio_avg_wait_sec: 45,
  baseline_estacionamento_avg_wait_sec: 120,
  elapsed_pedagio_avg_sec: 15,
  elapsed_estacionamento_avg_sec: 30,
  accel_surge_leve: 0.0125,
  accel_surge_pesado: 0.05,
};

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const BASE_DIESEL = 6.12;
const BASE_GASOLINA = 5.89;
const BASE_ETANOL = 3.95;

function priceOffset(index: number): number {
  return (index % 5) * 0.08 - 0.16;
}

export const MOCK_FUEL_PRICES: Record<string, FuelPriceByUF> = Object.fromEntries(
  UFS.map((uf, index) => [
    uf,
    {
      uf,
      price_diesel_s10: Number((BASE_DIESEL + priceOffset(index)).toFixed(2)),
      price_gasolina_c: Number((BASE_GASOLINA + priceOffset(index)).toFixed(2)),
      price_etanol: Number((BASE_ETANOL + priceOffset(index) * 0.5).toFixed(2)),
      updated_at: "2024-08-01T12:00:00Z",
    },
  ]),
);
