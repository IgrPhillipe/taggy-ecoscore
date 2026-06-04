import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type RouteSidePanelProps = {
  children: ReactNode;
  className?: string;
};

export function RouteSidePanel({ children, className }: RouteSidePanelProps) {
  return (
    <div
      className={cn(
        "pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-border/80 bg-background/95 shadow-lg backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
