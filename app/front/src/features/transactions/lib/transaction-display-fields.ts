import type { Transaction } from "../api/types";
import { getCalcResultFromSnapshot } from "../components/TransactionDetails/parse-transaction-snapshot";

type TransactionLike = Pick<
  Transaction,
  "elapsed_time_sec" | "parameters_snapshot" | "vehicle_id" | "organization_id" | "plate"
>;

export function getTransactionElapsedSec(
  tx: TransactionLike,
): number | null | undefined {
  if (tx.elapsed_time_sec != null) return tx.elapsed_time_sec;

  const payload = tx.parameters_snapshot?.payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const elapsed = (payload as Record<string, unknown>).elapsed_time;
    if (typeof elapsed === "number") return elapsed;
  }

  const result = getCalcResultFromSnapshot(tx.parameters_snapshot);
  return result?.comparison?.with_tag?.time_sec ?? null;
}
