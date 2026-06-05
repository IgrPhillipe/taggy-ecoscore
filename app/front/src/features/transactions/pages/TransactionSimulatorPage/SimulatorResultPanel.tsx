import { CheckCircle2, Leaf } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TransactionAuditExportButton } from "@/features/reports/components/TransactionAuditExportButton";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionDetailsPanel } from "@/features/transactions/components/TransactionDetails";
import type { CalcResult, Transaction } from "../../api/types";

type SimulatorResultPanelProps = {
  result: CalcResult;
  transaction: Transaction;
};

export function SimulatorResultPanel({ result, transaction }: SimulatorResultPanelProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-[#72C215]" />
        <span className="text-sm font-medium text-neutral-900">
          Simulação concluída
        </span>
        <Badge variant="secondary" className="text-xs">
          Passagem #{transaction.id}
        </Badge>
        <div className="ml-auto">
          <TransactionAuditExportButton transactionId={transaction.id} />
        </div>
      </div>

      <TransactionDetailsPanel
        transaction={transaction}
        result={result}
        snapshotJsonLabel="Detalhes técnicos (JSON)"
        technicalJson={result}
      />
    </div>
  );
}

export function SimulatorResultSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-48" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded" />
      <Skeleton className="h-56 w-full rounded" />
    </div>
  );
}

export function SimulatorEmptyState() {
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
      <Leaf className="h-10 w-10 text-neutral-300" />
      <p className="text-sm font-medium text-neutral-600">Nenhuma simulação ainda</p>
      <p className="max-w-xs text-center text-xs text-muted-foreground">
        Preencha os dados ao lado e clique em Simular para ver o impacto ambiental e
        financeiro estimado.
      </p>
    </div>
  );
}
