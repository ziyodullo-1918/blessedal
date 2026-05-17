import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, adminSignOut } from "@/components/tortuvchilar/app-shell";
import { useRequireAdmin } from "@/hooks/use-require-tortuvchilar-admin";
import { supabase } from "@/integrations/supabase/client";
import { t } from "@/lib/tortuvchilar/i18n";
import { lockPin } from "@/lib/tortuvchilar/admin-pin";

export const Route = createFileRoute("/tortuvchilar")({
  component: AdminLayout,
});

function AdminLayout() {
  const ready = useRequireAdmin();
  const [email, setEmail] = useState("");
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? ""));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        {t.loading}
      </div>
    );
  }

  return (
    <AppShell
      userLabel={`${t.admin}${email ? " · " + email : ""}`}
      onSignOut={async () => { lockPin(); await adminSignOut(); }}
      navItems={[
        { to: "/tortuvchilar", label: t.dashboard },
        { to: "/tortuvchilar/live", label: t.liveFeed },
        { to: "/tortuvchilar/workers", label: t.workers },
        { to: "/tortuvchilar/products", label: t.products },
        { to: "/tortuvchilar/reports", label: t.reports },
        { to: "/tortuvchilar/settings", label: t.settings },
      ]}
    >
      <Outlet />
    </AppShell>
  );
}
