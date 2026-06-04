import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type RouteBottomPanelProps = {
  children: ReactNode;
  className?: string;
};

export const RouteBottomPanel = ({
  children,
  className,
}: RouteBottomPanelProps) => {
  return (
    <div
      className={cn(
        "shrink-0 rounded-b-2xl border-b border-border bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.08)]",
        className,
      )}
    >
      {children}
    </div>
  );
};
