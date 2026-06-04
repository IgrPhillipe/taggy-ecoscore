import { cn } from "@/lib/utils";

type PageSectionHeaderProps = {
  title: string;
  description?: string;
  /** `page` matches PageLayout h1; `section` for panels and in-page blocks */
  variant?: "page" | "section";
  className?: string;
};

export function PageSectionHeader({
  title,
  description,
  variant = "section",
  className,
}: PageSectionHeaderProps) {
  const isPage = variant === "page";

  return (
    <div className={cn("space-y-1", className)}>
      {isPage ? (
        <h1 className="page-title text-3xl font-semibold text-foreground">{title}</h1>
      ) : (
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      )}
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
