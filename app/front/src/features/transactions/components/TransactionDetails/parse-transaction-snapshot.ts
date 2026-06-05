import type { CalcResult, Transaction } from "../../api/types";

export function getCalcResultFromSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
): CalcResult | null {
  if (!snapshot) return null;
  const result = snapshot.result;
  if (!result || typeof result !== "object") return null;
  return result as CalcResult;
}

export function getSnapshotForDisplay(
  transaction: Transaction | null | undefined,
): Record<string, unknown> | null {
  if (!transaction?.parameters_snapshot) return null;
  const keys = Object.keys(transaction.parameters_snapshot);
  return keys.length > 0 ? transaction.parameters_snapshot : null;
}

export function hasStructuredResult(transaction: Transaction | null | undefined): boolean {
  return getCalcResultFromSnapshot(transaction?.parameters_snapshot) != null;
}
