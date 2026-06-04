import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/features/auth/auth-store";
import { AlertCircle, Loader2 } from "lucide-react";
import { PageLayout } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/features/sustainability/components/MetricCard";
import { getToastErrorMessage } from "@/lib/api-error";
import { processTransaction } from "../../api/requests";
import type { ProcessTransactionBody, ProcessTransactionResult } from "../../api/types";
import {
  SimulatorEmptyState,
  SimulatorResultPanel,
  SimulatorResultSkeleton,
} from "./SimulatorResultPanel";

const UF_OPTIONS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO",
];

const FUEL_LABELS: Record<string, string> = {
  diesel_s10: "Diesel S10",
  diesel_s500: "Diesel S500",
  gasolina_c: "Gasolina C",
  etanol: "Etanol",
  gnv: "GNV",
  eletrico: "Elétrico",
};

type FormState = {
  plate: string;
  context: "pedagio" | "estacionamento";
  uf: string;
  is_digital: boolean;
  use_manual_vehicle: boolean;
  category: "leve" | "pesado";
  fuel_type: "diesel_s10" | "diesel_s500" | "gasolina_c" | "etanol" | "gnv" | "eletrico";
  model: string;
};

export function TransactionSimulatorPage() {
  const [form, setForm] = useState<FormState>({
    plate: "",
    context: "pedagio",
    uf: "SP",
    is_digital: true,
    use_manual_vehicle: false,
    category: "leve",
    fuel_type: "gasolina_c",
    model: "",
  });

  const currentUser = useAuthStore((s) => s.user);

  const mutation = useMutation<ProcessTransactionResult, Error, ProcessTransactionBody>({
    mutationFn: processTransaction,
  });

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body: ProcessTransactionBody = {
      plate: form.plate.trim().toUpperCase(),
      context: form.context,
      uf: form.uf,
      is_digital: form.is_digital,
      ...(currentUser && {
        user_id: currentUser.id,
        organization_id: currentUser.organization_id ?? undefined,
      }),
      ...(form.use_manual_vehicle && {
        vehicle: {
          category: form.category,
          fuel_type: form.fuel_type,
          model: form.model || undefined,
        },
      }),
    };
    mutation.mutate(body);
  }

  const errorMessage = mutation.isError
    ? getToastErrorMessage(mutation.error, {
        fallback: "Não foi possível processar a simulação.",
      })
    : undefined;

  return (
    <PageLayout
      title="Simulador de Transação"
      description="Simule uma passagem de pedágio ou estacionamento e visualize o impacto ambiental e financeiro estimado."
    >
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,24rem)_1fr]">
        <SectionCard title="Parâmetros">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="plate">Placa</Label>
              <Input
                id="plate"
                placeholder="ABC1D23"
                value={form.plate}
                onChange={(e) => set("plate", e.target.value)}
                className="uppercase"
                required
              />
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

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="is_digital" className="cursor-pointer">
                Transação digital (tag)
              </Label>
              <Switch
                id="is_digital"
                checked={form.is_digital}
                onCheckedChange={(checked) => set("is_digital", checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="use_manual_vehicle" className="cursor-pointer">
                Informar veículo manualmente
              </Label>
              <Switch
                id="use_manual_vehicle"
                checked={form.use_manual_vehicle}
                onCheckedChange={(checked) => set("use_manual_vehicle", checked)}
              />
            </div>

            {form.use_manual_vehicle && (
              <div className="space-y-4 rounded-md border border-neutral-200 bg-neutral-50/60 p-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Categoria</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => set("category", v as FormState["category"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leve">Leve</SelectItem>
                        <SelectItem value="pesado">Pesado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Combustível</Label>
                    <Select
                      value={form.fuel_type}
                      onValueChange={(v) => set("fuel_type", v as FormState["fuel_type"])}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(FUEL_LABELS).map(([k, label]) => (
                          <SelectItem key={k} value={k}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="model">Modelo (opcional)</Label>
                  <Input
                    id="model"
                    placeholder="ex: Fiat Uno"
                    value={form.model}
                    onChange={(e) => set("model", e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculando…
                </>
              ) : (
                "Simular"
              )}
            </Button>
          </form>
        </SectionCard>

        <SectionCard title="Resultado">
          {mutation.isIdle && <SimulatorEmptyState />}
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
      </div>
    </PageLayout>
  );
}
