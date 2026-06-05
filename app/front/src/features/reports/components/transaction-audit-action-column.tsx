import type { ColumnDef } from "@tanstack/react-table";
import { ActionHintPopover } from "@/components/ActionHintPopover";
import { EXPORT_LABELS } from "../constants";
import { AuditExportButton } from "./ExportButton";

type RowWithId = { id: number };

export function transactionAuditActionColumn<T extends RowWithId>(): ColumnDef<T> {
  return {
    id: "audit-export",
    header: "Ações",
    enableSorting: false,
    cell: ({ row }) => (
      <ActionHintPopover label={EXPORT_LABELS.auditSpreadsheet}>
        <AuditExportButton transactionId={row.original.id} />
      </ActionHintPopover>
    ),
  };
}
