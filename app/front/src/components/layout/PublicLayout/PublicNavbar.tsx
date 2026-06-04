import { Link, useRouterState } from "@tanstack/react-router";
import { Logo } from "@/components/icons/Logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const PublicNavbar = () => {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navLinkClass = (path: string) =>
    cn(
      "text-sm transition-colors",
      pathname === path
        ? "font-medium text-foreground"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4 md:px-6">
      <Link to="/calcular" className="shrink-0">
        <Logo className="h-8 w-24" aria-label="Taggy Ecoscore" />
      </Link>

      <nav className="flex items-center gap-2 sm:gap-4">
        <Link to="/calcular" className={navLinkClass("/calcular")}>
          Calculadora
        </Link>
        <Link to="/metodologia" className={navLinkClass("/metodologia")}>
          Compliance
        </Link>
        <Button asChild size="sm" variant="outline">
          <Link to="/login">Login / Cadastro</Link>
        </Button>
      </nav>
    </header>
  );
};
