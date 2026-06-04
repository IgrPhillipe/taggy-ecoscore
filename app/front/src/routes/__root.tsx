import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/react";
import { Toaster } from "sonner";
import { AppShell } from "@/components/layout/AppShell";
import { queryClient } from "@/lib/query-client";
import { requireAuth } from "@/lib/route-guard";

const PUBLIC_PATHS = ["/login", "/calcular"];

export const Route = createRootRoute({
  beforeLoad: ({ location }) => {
    if (PUBLIC_PATHS.includes(location.pathname)) return;
    requireAuth()();
  },
  component: RootComponent,
});

function RootComponent() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isPublic = PUBLIC_PATHS.includes(pathname);

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        {isPublic ? <Outlet /> : <AppShell />}
        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster richColors closeButton />
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
