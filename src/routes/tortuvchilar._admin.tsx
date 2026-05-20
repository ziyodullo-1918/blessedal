import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";

export const Route = createFileRoute("/tortuvchilar/_admin")({
  component: () => (
    <RequireAuth>
      <Outlet />
    </RequireAuth>
  ),
});
