import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AppShell } from "./AppShell";
import { PinProvider, PinGate } from "@/lib/pin";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Yuklanmoqda…
      </div>
    );
  }
  return (
    <PinProvider>
      <PinGate>
        <AppShell>{children}</AppShell>
      </PinGate>
    </PinProvider>
  );
}
