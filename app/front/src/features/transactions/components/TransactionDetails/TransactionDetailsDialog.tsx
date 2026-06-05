import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EXPORT_LABELS } from "@/features/reports/constants";
import { ExportButton } from "@/features/reports/components/ExportButton";
import { buildAuditReportUrl } from "@/features/reports/lib/export-urls";
import { useGetTransaction } from "../../hooks/useGetTransaction";
import type { Transaction } from "../../api/types";
import { TransactionDetailsPanel } from "./TransactionDetailsPanel";

type TransactionDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  transactionId?: number | null;
};

function TransactionDetailsSkeleton() {
  return (
    <div className="space-y-6">
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

export function TransactionDetailsDialog({
  open,
  onOpenChange,
  transaction: transactionProp,
  transactionId,
}: TransactionDetailsDialogProps) {
  const shouldFetch = open && !transactionProp && transactionId != null;
  const { data: fetchedTransaction, isLoading } = useGetTransaction(
    transactionId ?? 0,
    { enabled: shouldFetch },
  );

  const transaction = transactionProp ?? fetchedTransaction ?? null;
  const displayId = transaction?.id ?? transactionId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="flex-row items-center justify-between gap-4 space-y-0 pr-8">
          <DialogTitle>Passagem #{displayId ?? ""}</DialogTitle>
          {displayId != null && (
            <ExportButton
              url={buildAuditReportUrl(displayId)}
              label={EXPORT_LABELS.exportCalculations}
              variant="download"
              className="shrink-0"
            />
          )}
        </DialogHeader>

        {isLoading ? (
          <TransactionDetailsSkeleton />
        ) : transaction ? (
          <TransactionDetailsPanel transaction={transaction} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os detalhes desta passagem.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
