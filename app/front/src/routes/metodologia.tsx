import { createFileRoute } from "@tanstack/react-router";
import { MetodologiaPage } from "@/features/compliance/pages/MetodologiaPage";

export const Route = createFileRoute("/metodologia")({
  component: MetodologiaPage,
});
