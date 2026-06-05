import type { VehicleTransaction } from "@/features/fleet/api/types";
import type { Transaction } from "../api/types";

export function vehicleTransactionToTransaction(tx: VehicleTransaction): Transaction {
  return {
    id: tx.id,
    user_id: tx.user_id ?? null,
    vehicle_id: tx.vehicle_id ?? null,
    organization_id: tx.organization_id ?? null,
    plate: tx.plate,
    context: tx.context,
    uf: tx.uf,
    elapsed_time_sec: tx.elapsed_time_sec,
    is_digital: tx.is_digital,
    co2_avoided_kg: tx.co2_avoided_kg,
    fuel_saved_liters: tx.fuel_saved_liters,
    time_saved_sec: tx.time_saved_sec,
    financial_savings_brl: tx.financial_savings_brl,
    water_saved_liters: tx.water_saved_liters,
    parameters_snapshot: tx.parameters_snapshot ?? {},
    created_at: tx.created_at,
  };
}
