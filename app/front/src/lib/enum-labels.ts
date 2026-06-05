import { FUEL_TYPE_OPTIONS } from "@/features/dashboard/constants";
import { USER_ROLE_LABELS } from "@/constants/current-user";

export const TRANSACTION_CONTEXT_LABELS: Record<string, string> = {
  pedagio: "Pedágio",
  estacionamento: "Estacionamento",
};

export const FUEL_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  FUEL_TYPE_OPTIONS.map((option) => [option.value, option.label]),
);

export { VEHICLE_CATEGORY_LABELS, STATUS_LABELS } from "@/features/fleet/constants";
export { USER_ROLE_LABELS };

export const BOOLEAN_LABELS = {
  true: "Sim",
  false: "Não",
} as const;
