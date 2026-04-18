import { useAuth } from "@/lib/auth";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { AppShell } from "./AppShell";
import { PinProvider, PinGate } from "@/lib/pin";

const FOUNDER_ALLOWED = new Set<string>(["/topshiriqlar"]);

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, role } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!loading && user && role === "founder" && !FOUNDER_ALLOWED.has(loc.pathname)) {
      navigate({ to: "/topshiriqlar" });
    }
  }, [loading, user, role, loc.pathname, navigate]);

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
