import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Leaf } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-start px-4 pt-10 pb-16">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mx-auto">
            <Leaf className="h-6 w-6 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Vale a pena ter tag?</h1>
          <p className="text-neutral-500 text-sm">
            Veja quanto você economizaria em combustível e CO₂ com a Taggy.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-100 bg-white shadow-sm p-6">
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
