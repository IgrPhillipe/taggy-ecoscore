import { createFileRoute } from "@tanstack/react-router";
import { RouteCalculationPage } from "@/features/routing";
import { requireRoles } from "@/lib/route-guard";

export const Route = createFileRoute("/rota")({
  beforeLoad: requireRoles(["admin", "gestor_frota", "motorista"]),
  component: RouteCalculationPage,
});
