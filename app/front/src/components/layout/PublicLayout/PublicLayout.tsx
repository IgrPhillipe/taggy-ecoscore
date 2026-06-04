import { Outlet } from "@tanstack/react-router";
import { PublicNavbar } from "./PublicNavbar";

export const PublicLayout = () => {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <PublicNavbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};
