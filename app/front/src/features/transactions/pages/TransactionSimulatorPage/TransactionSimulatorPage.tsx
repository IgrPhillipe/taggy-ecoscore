import { useState } from "react";
import { useAuthStore } from "@/features/auth/auth-store";
import { AlertCircle } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { ButtonLoadingContent } from "@/components/ui/ButtonLoadingContent";
import { Label } from "@/components/ui/label";
import { PlateInput } from "@/components/ui/PlateInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SectionCard } from "@/features/sustainability/components/MetricCard";
import { getToastErrorMessage } from "@/lib/api-error";
import { formFieldErrorId } from "@/components/form/FormField";
import { fieldControlErrorClassName } from "@/lib/field-control";
import { isValidPlate } from "@/lib/plate-utils";
import { cn } from "@/lib/utils";
import { useProcessTransaction } from "../../hooks/useProcessTransaction";
import type { ProcessTransactionBody } from "../../api/types";
import { SimulatorResultPanel, SimulatorResultSkeleton } from "./SimulatorResultPanel";

const UF_OPTIONS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

type FormState = {
  plate: string;
  context: "pedagio" | "estacionamento";
  uf: string;
};

export function TransactionSimulatorPage() {
  const [form, setForm] = useState<FormState>({
    plate: "",
    context: "pedagio",
    uf: "SP",
  });
  const [plateError, setPlateError] = useState<string | undefined>();

  const currentUser = useAuthStore((s) => s.user);

  const mutation = useProcessTransaction();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidPlate(form.plate)) {
      setPlateError("Placa inválida");
      return;
    }
    const body: ProcessTransactionBody = {
      plate: form.plate.trim().toUpperCase(),
      context: form.context,
      uf: form.uf,
      is_digital: true,
      ...(currentUser && {
        user_id: currentUser.id,
        organization_id: currentUser.organization_id ?? undefined,
      }),
    };
    mutation.mutate(body);
  }

  const errorMessage = mutation.isError
    ? getToastErrorMessage(mutation.error, {
        fallback: "Não foi possível processar a simulação.",
      })
    : undefined;

  const showResults = !mutation.isIdle;

  return (
    <PageLayout
      title="Simulador de Transação"
      description="Simule uma passagem de pedágio ou estacionamento e visualize o impacto ambiental e financeiro estimado."
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <SectionCard
          title="Parâmetros"
          className="sticky top-4 z-10 h-fit w-fit max-w-sm shrink-0 self-start"
        >
          <form onSubmit={handleSubmit} className="w-72 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plate">Placa</Label>
              <PlateInput
                id="plate"
                placeholder="ABC1D23"
                value={form.plate}
                onChange={(value) => {
                  setPlateError(undefined);
                  set("plate", value);
                }}
                aria-invalid={!!plateError}
                aria-describedby={plateError ? formFieldErrorId("plate") : undefined}
                className={cn(plateError && fieldControlErrorClassName)}
                required
              />
              {plateError ? (
                <p id={formFieldErrorId("plate")} className="text-xs text-destructive">
                  {plateError}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Contexto</Label>
                <Select
                  value={form.context}
                  onValueChange={(v) => set("context", v as FormState["context"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pedagio">Pedágio</SelectItem>
                    <SelectItem value="estacionamento">Estacionamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>UF</Label>
                <Select value={form.uf} onValueChange={(v) => set("uf", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_OPTIONS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending || !isValidPlate(form.plate)}
            >
              <ButtonLoadingContent loading={mutation.isPending}>
                Simular
              </ButtonLoadingContent>
            </Button>
          </form>
        </SectionCard>

        {showResults && (
          <SectionCard title="Resultado" className="min-w-0 flex-1">
            {mutation.isPending && <SimulatorResultSkeleton />}
            {mutation.isError && errorMessage && (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-6 py-12 text-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm font-medium text-destructive">Erro na simulação</p>
                <p className="max-w-md text-sm text-muted-foreground">{errorMessage}</p>
              </div>
            )}
            {mutation.isSuccess && mutation.data?.data && (
              <SimulatorResultPanel
                result={mutation.data.data.result}
                transaction={mutation.data.data.transaction}
              />
            )}
          </SectionCard>
        )}
      </div>
    </PageLayout>
  );
}
