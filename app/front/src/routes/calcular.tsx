import { createFileRoute } from "@tanstack/react-router";
import { PublicCalculatorPage } from "@/features/public-calculator/pages/PublicCalculatorPage";

export const Route = createFileRoute("/calcular")({
  component: PublicCalculatorPage,
});
