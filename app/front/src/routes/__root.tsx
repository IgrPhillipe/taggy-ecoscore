import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/react";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuthStore } from "@/features/auth/auth-store";
import { queryClient } from "@/lib/query-client";
import { requireAuth } from "@/lib/route-guard";

const PUBLIC_LAYOUT_PATHS = ["/calcular", "/metodologia"];
const PUBLIC_PATHS = ["/login", ...PUBLIC_LAYOUT_PATHS];

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (PUBLIC_PATHS.includes(location.pathname)) return;
    await requireAuth()();
  },
  component: RootComponent,
});

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const usePublicLayout =
    PUBLIC_LAYOUT_PATHS.includes(pathname) && !isAuthenticated;

  let shell: ReactNode;
  if (usePublicLayout) {
    shell = <PublicLayout />;
  } else if (pathname === "/login") {
    shell = <Outlet />;
  } else {
    shell = <AppShell />;
  }

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        {shell}
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
