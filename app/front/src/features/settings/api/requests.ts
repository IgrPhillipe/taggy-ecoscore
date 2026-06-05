import { api } from "@/lib/http-client";
import { encrypt, decrypt } from "@/lib/encrypted-storage";

export type TechnicalSpecs = {
  id: number;
  emission_factor_diesel_s10: number;
  emission_factor_gasolina_c: number;
  emission_factor_etanol: number;
  idle_rate_leve: number;
  idle_rate_pesado: number;
  paper_co2_per_ticket: number;
  paper_water_per_ticket: number;
  ludic_tree_year_absorption: number;
  ludic_phone_charge_factor: number;
  ludic_coffee_factor: number;
  baseline_pedagio_avg_wait_sec: number;
  baseline_estacionamento_avg_wait_sec: number;
  maint_cost_leve: number;
  maint_cost_pesado: number;
  accel_surge_leve: number;
  accel_surge_pesado: number;
  benchmark_kg_co2_per_km_car: number;
  benchmark_kg_co2_per_burger: number;
};

export type FuelPriceByUF = {
  uf: string;
  price_diesel_s10: number | null;
  price_gasolina_c: number | null;
  price_etanol: number | null;
  updated_at?: string;
};

export type TechnicalSpecsBundle = {
  specs: TechnicalSpecs;
  fuel_prices_by_uf: Record<string, FuelPriceByUF>;
  fuel_prices_as_of?: string;
};

export async function getTechnicalSpecsBundle(): Promise<TechnicalSpecsBundle> {
  const response = await api
    .get("/api/technical-specs/")
    .json<{ data: TechnicalSpecsBundle }>();
  return response.data;
}

export async function updateTechnicalSpecs(
  payload: Partial<TechnicalSpecs>,
): Promise<TechnicalSpecs> {
  return api
    .post("/api/technical-specs/update", { json: payload })
    .json<TechnicalSpecs>();
}

export async function getFuelPrices(): Promise<Record<string, FuelPriceByUF>> {
  const response = await api
    .get("/api/fuel-prices/")
    .json<{ data: Record<string, FuelPriceByUF> }>();
  return response.data;
}

export async function syncFuelPrices(): Promise<Record<string, FuelPriceByUF>> {
  const response = await api
    .post("/api/fuel-prices/sync")
    .json<{ data: Record<string, FuelPriceByUF> }>();
  return response.data;
}

export async function syncEmissionFactors(): Promise<{
  status: string;
  updated: Pick<
    TechnicalSpecs,
    | "emission_factor_diesel_s10"
    | "emission_factor_gasolina_c"
    | "emission_factor_etanol"
  >;
  source_url: string;
}> {
  return api
    .post("/api/technical-specs/sync-mcti")
    .json();
}

export type TaggyPlacesSummary = {
  toll_count: number;
  parking_count: number;
  last_synced_at: string | null;
};

export async function getTaggyPlacesSummary(): Promise<TaggyPlacesSummary> {
  const response = await api
    .get("/api/taggy-places/")
    .json<{ data: TaggyPlacesSummary }>();
  return response.data;
}

export async function syncTaggyPlaces(): Promise<{
  tolls_synced: number;
  parking_synced: number;
  synced_at: string;
}> {
  const response = await api
    .post("/api/taggy-places/sync")
    .json<{ data: { tolls_synced: number; parking_synced: number; synced_at: string } }>();
  return response.data;
}

export async function updateFuelPrice(
  uf: string,
  payload: Partial<FuelPriceByUF>,
): Promise<FuelPriceByUF> {
  const response = await api
    .put(`/api/fuel-prices/${uf}`, { json: payload })
    .json<{ data: FuelPriceByUF }>();
  return response.data;
}

export type AdminAccountSettings = {
  email: string;
};

const ADMIN_SETTINGS_KEY = "taggy-admin-settings";

export async function loadAdminAccountSettings(
  fallbackEmail: string,
): Promise<AdminAccountSettings> {
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY);
    if (!raw) return { email: fallbackEmail };
    const plaintext = await decrypt(raw);
    return JSON.parse(plaintext) as AdminAccountSettings;
  } catch {
    return { email: fallbackEmail };
  }
}

export async function saveAdminAccountSettings(
  settings: AdminAccountSettings,
): Promise<void> {
  const encoded = await encrypt(JSON.stringify(settings));
  localStorage.setItem(ADMIN_SETTINGS_KEY, encoded);
}

export type { NotificationSettings } from "@/features/users/api/types";
