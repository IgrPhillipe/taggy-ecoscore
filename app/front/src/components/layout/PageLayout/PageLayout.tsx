import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageLayoutProps = {
  title: string;
  description?: string;
  back?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: ComponentProps<"div">["className"];
};

export const PageLayout = ({
  title,
  description,
  back,
  actions,
  children,
  className,
}: PageLayoutProps) => {
  return (
    <div className={cn("space-y-6 p-4 md:p-8", className)}>
      {back ? <div>{back}</div> : null}
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="page-title text-3xl font-semibold">{title}</h1>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
};
