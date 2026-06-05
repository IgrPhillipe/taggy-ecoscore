import type { ColumnDef } from "@tanstack/react-table";
import { TransactionViewButton } from "@/features/transactions/components/TransactionDetails";
import { TransactionAuditExportButton } from "./TransactionAuditExportButton";

type RowWithId = { id: number };

type TransactionActionsColumnOptions<T extends RowWithId> = {
  onViewDetails: (row: T) => void;
};

export function transactionActionsColumn<T extends RowWithId>({
  onViewDetails,
}: TransactionActionsColumnOptions<T>): ColumnDef<T> {
  return {
    id: "actions",
    header: "Ações",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <TransactionViewButton
          onClick={(event) => {
            event.stopPropagation();
            onViewDetails(row.original);
          }}
        />
        <TransactionAuditExportButton transactionId={row.original.id} />
      </div>
    ),
  };
}

/** @deprecated Use transactionActionsColumn instead */
export function transactionAuditActionColumn<T extends RowWithId>(): ColumnDef<T> {
  return {
    id: "audit-export",
    header: "Ações",
    enableSorting: false,
    cell: ({ row }) => (
      <TransactionAuditExportButton transactionId={row.original.id} />
    ),
  };
}
