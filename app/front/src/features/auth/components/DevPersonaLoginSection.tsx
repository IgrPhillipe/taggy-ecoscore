import { Loader2 } from "lucide-react";
import { SEED_DEFAULT_PASSWORD, SEED_PERSONAS } from "@/constants/personas";
import { cn } from "@/lib/utils";
import { useLogin } from "../hooks/useLogin";

type DevPersonaLoginSectionProps = {
  redirectTo?: string;
};

export function DevPersonaLoginSection({ redirectTo }: DevPersonaLoginSectionProps) {
  const loginMutation = useLogin({ redirectTo });

  if (!import.meta.env.DEV) return null;

  return (
    <div className="mt-6 rounded-lg border border-dashed border-amber-300 bg-amber-50/50 p-4">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-800">
        Desenvolvimento
      </p>
      <p className="mb-3 text-sm text-amber-900/80">
        Entrar como usuário do seed (senha:{" "}
        <span className="font-mono text-xs">{SEED_DEFAULT_PASSWORD}</span>).
      </p>
      <div className="flex flex-col gap-1">
        {SEED_PERSONAS.map(({ label, email, password }) => {
          const isLoading =
            loginMutation.isPending && loginMutation.variables?.email === email;

          return (
            <button
              key={email}
              type="button"
              disabled={loginMutation.isPending}
              onClick={() => loginMutation.mutate({ email, password })}
              className={cn(
                "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors",
                "hover:bg-amber-100/80 disabled:opacity-60",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{label}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
              {isLoading ? (
                <Loader2 className="ml-2 size-4 shrink-0 animate-spin text-amber-800" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
