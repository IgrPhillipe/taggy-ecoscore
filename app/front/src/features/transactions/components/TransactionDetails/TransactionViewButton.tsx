import type { MouseEvent } from "react";
import { Eye } from "lucide-react";
import { ActionHintPopover } from "@/components/ActionHintPopover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TransactionViewButtonProps = {
  onClick: (event: MouseEvent) => void;
  label?: string;
  compact?: boolean;
};

export function TransactionViewButton({
  onClick,
  label = "Ver detalhes",
  compact = false,
}: TransactionViewButtonProps) {
  return (
    <ActionHintPopover label={label}>
      {compact ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          className={cn(
            "flex items-center gap-0.5 rounded border border-border bg-muted px-2 py-1",
            "text-[10px] font-medium text-muted-foreground transition-colors hover:bg-accent",
          )}
        >
          <Eye className="h-3 w-3" />
          <span>Detalhes</span>
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onClick}
          aria-label={label}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
    </ActionHintPopover>
  );
}
