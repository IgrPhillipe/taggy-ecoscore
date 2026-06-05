export type Transaction = {
  id: number;
  user_id: number | null;
  vehicle_id: number | null;
  organization_id: number | null;
  plate: string | null;
  context: string;
  uf: string | null;
  elapsed_time_sec: number | null;
  is_digital: boolean;
  co2_avoided_kg: number | null;
  fuel_saved_liters: number | null;
  time_saved_sec: number | null;
  financial_savings_brl: number | null;
  water_saved_liters: number | null;
  parameters_snapshot: Record<string, unknown>;
  created_at: string;
};

export type GetTransactionsParams = {
  page?: number;
  pageSize?: number;
  organizationId?: number;
  fleetId?: number;
  plate?: string;
  context?: string;
  uf?: string;
  fromDate?: string;
  toDate?: string;
};

export type GetTransactionsResponse = {
  items: Transaction[];
  total: number;
};

export type TransactionVehicleIn = {
  category: "leve" | "pesado";
  fuel_type: "diesel_s10" | "diesel_s500" | "gasolina_c" | "etanol" | "gnv" | "eletrico";
  model?: string;
};

export type ProcessTransactionBody = {
  plate: string;
  context: "pedagio" | "estacionamento";
  uf: string;
  is_digital?: boolean;
  vehicle?: TransactionVehicleIn;
  user_id?: number;
  vehicle_id?: number;
  organization_id?: number;
};

export type CalcEnvironmental = {
  co2_kg?: number;
  co2_fossil_kg?: number;
  co2_biogenic_kg?: number;
  ch4_kg_co2e?: number;
  n2o_kg_co2e?: number;
  co2e_scope1_kg?: number;
  co2e_scope2_kg?: number;
  paper_co2_avoided_kg?: number;
  fuel_amount?: number;
  fuel_unit?: string;
  fuel_liters?: number;
  water_liters?: number;
  paper_tickets?: number;
};

export type CalcFinancial = {
  fuel_savings_brl?: number;
  maintenance_savings_brl?: number;
  total_savings_brl?: number;
};

export type CalcComparisonSide = {
  time_sec?: number;
  fuel_amount?: number;
  fuel_unit?: string;
  fuel_liters?: number;
  co2e_scope1_kg?: number;
  co2_biogenic_kg?: number;
  co2e_scope2_kg?: number;
  water_liters?: number;
  estimated_brl?: number;
};

export type CalcMetadata = {
  time_saved_sec?: number;
  baseline_wait_sec?: number;
  context?: string;
  is_digital?: boolean;
  uf_passagem?: string;
  pricing_snapshot?: Record<string, unknown>;
};

export type CalcResult = {
  environmental?: CalcEnvironmental;
  financial?: CalcFinancial;
  comparison?: {
    without_tag?: CalcComparisonSide;
    with_tag?: CalcComparisonSide;
    delta?: CalcComparisonSide;
  };
  metadata?: CalcMetadata;
  storytelling?: {
    legacy?: { trees_saved: number };
    by_axis?: {
      carbon: Array<{ id: string; label: string; value: number }>;
      water: Array<{ id: string; label: string; value: number }>;
      paper: Array<{ id: string; label: string; value: number }>;
    };
  };
  sensitivity?: Record<string, unknown>;
};

export type ProcessTransactionResult = {
  data: {
    result: CalcResult;
    transaction: Transaction;
  };
};
