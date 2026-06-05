import { ActionHintPopover } from "@/components/ActionHintPopover";
import { EXPORT_LABELS } from "../constants";
import { AuditExportButton } from "./ExportButton";

type TransactionAuditExportButtonProps = {
  transactionId: number;
  label?: string;
};

export function TransactionAuditExportButton({
  transactionId,
  label = EXPORT_LABELS.auditSpreadsheet,
}: TransactionAuditExportButtonProps) {
  return (
    <ActionHintPopover label={label}>
      <AuditExportButton transactionId={transactionId} />
    </ActionHintPopover>
  );
}
