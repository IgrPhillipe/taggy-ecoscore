import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { calculatePublic } from "../api/requests";
import type { PublicCalculatorRequest, PublicCalculatorResponse } from "../api/types";
import { CalculatorForm } from "../components/CalculatorForm";
import { CalculatorResults } from "../components/CalculatorResults";

export function PublicCalculatorPage() {
  const [result, setResult] = useState<PublicCalculatorResponse | null>(null);

  const mutation = useMutation({
    mutationFn: calculatePublic,
    onSuccess: setResult,
  });

  const handleSubmit = (values: PublicCalculatorRequest) => {
    mutation.mutate(values);
  };

  const handleReset = () => {
    setResult(null);
    mutation.reset();
  };

  return (
    <div className="flex flex-col items-center justify-start px-4 py-10 pb-16">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Vale a pena ter tag?</h1>
          <p className="text-sm text-neutral-500">
            Veja quanto você economizaria em combustível e CO₂ com a Taggy.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
          {result && !mutation.isPending ? (
            <CalculatorResults result={result} onReset={handleReset} />
          ) : (
            <>
              <CalculatorForm onSubmit={handleSubmit} isLoading={mutation.isPending} />
              {mutation.isError && (
                <p className="mt-3 text-center text-sm text-red-500">
                  Não foi possível calcular. Tente novamente.
                </p>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-neutral-400">
          Cálculo baseado no Protocolo GHG · BEN 2023 · preços ANP por estado
        </p>
      </div>
    </div>
  );
}
