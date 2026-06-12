import { createFileRoute } from "@tanstack/react-router";
import { TransactionSimulatorPage } from "@/features/transactions/pages/TransactionSimulatorPage";
import { requireRoles } from "@/lib/route-guard";

export const Route = createFileRoute("/simulador")({
  beforeLoad: requireRoles(["admin", "motorista"]),
  component: TransactionSimulatorPage,
});
