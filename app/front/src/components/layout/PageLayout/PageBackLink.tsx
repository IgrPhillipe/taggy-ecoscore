import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

type PageBackLinkProps = {
  to: string;
  label: string;
};

export function PageBackLink({ to, label }: PageBackLinkProps) {
  return (
    <Link
      to={to}
      className="-ml-1 inline-flex items-center gap-1 text-sm text-muted-foreground/80 underline-offset-4 hover:text-muted-foreground hover:underline"
    >
      <ArrowLeft className="h-3 w-3" />
      {label}
    </Link>
  );
}
