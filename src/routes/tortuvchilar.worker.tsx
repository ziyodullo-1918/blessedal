import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell, workerSignOut } from "@/components/tortuvchilar/app-shell";
import { useRequireWorker } from "@/hooks/use-require-tortuvchilar-worker";
import { t } from "@/lib/tortuvchilar/i18n";

export const Route = createFileRoute("/tortuvchilar/worker")({
  component: WorkerLayout,
});

function WorkerLayout() {
  const { session, ready } = useRequireWorker();
  if (!ready || !session) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">{t.loading}</div>;
  }
  return (
    <AppShell
      userLabel={`${t.worker} · ${session.name}`}
      onSignOut={workerSignOut}
      navItems={[
        { to: "/tortuvchilar/worker", label: t.myWork },
        { to: "/tortuvchilar/worker/new", label: t.addEntry },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
