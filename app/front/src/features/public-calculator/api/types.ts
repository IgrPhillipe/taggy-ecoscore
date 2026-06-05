export interface PublicCalculatorRequest {
  plate: string;
  monthly_pedagio: number;
  uf?: string;
  monthly_estacionamento?: number;
}

export interface ProjectionMetrics {
  financial_brl: number;
  co2_kg: number;
  time_min: number;
  fuel_liters: number;
}

export interface PublicCalculatorResponse {
  monthly: ProjectionMetrics;
  annual: ProjectionMetrics;
  vehicle_model: string | null;
  fuel_type: string;
  category: string;
  ludic: {
    trees_saved?: number;
    [key: string]: number | undefined;
  };
  vehicle_fallback: boolean;
  fallback_reason: string | null;
}
