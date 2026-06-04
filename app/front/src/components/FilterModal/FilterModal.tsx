import { ListFilter } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type FilterModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCount: number;
  onApply: () => void;
  onClear: () => void;
  children: ReactNode;
  title?: string;
  description?: string;
  triggerLabel?: string;
  className?: string;
};

export const FilterModal = ({
  open,
  onOpenChange,
  activeCount,
  onApply,
  onClear,
  children,
  title = "Filtros",
  description = "Ajuste os filtros e clique em Aplicar para atualizar os resultados.",
  triggerLabel = "Filtros",
  className,
}: FilterModalProps) => {
  const ariaLabel =
    activeCount > 0
      ? `${triggerLabel} (${activeCount} ativo${activeCount > 1 ? "s" : ""})`
      : triggerLabel;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("relative", className)}
          aria-label={ariaLabel}
        >
          <ListFilter className="mr-2 h-4 w-4" />
          {triggerLabel}
          {activeCount > 0 ? (
            <Badge
              variant="default"
              className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]"
            >
              {activeCount}
            </Badge>
          ) : null}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">{children}</div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={onClear}>
            Limpar
          </Button>
          <Button type="button" onClick={onApply}>
            Aplicar filtros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
