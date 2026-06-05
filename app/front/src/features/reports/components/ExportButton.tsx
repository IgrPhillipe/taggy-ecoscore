import { Download, Loader2 } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getToastErrorMessage } from "@/lib/api-error";
import { EXPORT_LABELS } from "../constants";
import { downloadExportUrl } from "../lib/export-urls";

type ExportButtonProps = {
  url: string;
  label?: string;
  variant?: "audit" | "download";
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
};

export const ExportButton = ({
  url,
  label = EXPORT_LABELS.spreadsheet,
  variant: _variant = "download",
  size = "sm",
  className,
  disabled,
  title,
  "aria-label": ariaLabel,
}: ExportButtonProps) => {
  const [loading, setLoading] = useState(false);
  const Icon = loading ? Loader2 : Download;

  const handleClick = async () => {
    setLoading(true);
    try {
      await downloadExportUrl(url);
    } catch (error) {
      toast.error(
        getToastErrorMessage(error, { fallback: EXPORT_LABELS.exportError }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={className}
      disabled={disabled || loading}
      title={title}
      aria-label={ariaLabel}
      onClick={() => void handleClick()}
    >
      <Icon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {label ? <span className="ml-1.5">{label}</span> : null}
    </Button>
  );
};

export const AuditExportButton = ({
  transactionId,
}: {
  transactionId: number;
}) => (
  <ExportButton
    url={`/api/reports/calculadora.xlsx?transaction_id=${transactionId}`}
    label=""
    variant="audit"
    aria-label={EXPORT_LABELS.auditSpreadsheet}
  />
);
