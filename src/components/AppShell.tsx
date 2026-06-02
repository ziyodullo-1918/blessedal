import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { usePin } from "@/lib/pin";
import { Lock as LockIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LogOut, LayoutDashboard, Users, Package, ClipboardList, BarChart3, Menu, X, Settings, ChevronDown, Factory, Boxes, Archive, Flame, Warehouse, FlaskConical, PackageCheck, CalendarClock } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const dashboardItem = { to: "/factory", label: "Boshqaruv paneli", icon: LayoutDashboard } as const;

const zavodNav = [
  { to: "/factory/orders", label: "Buyurtmalar", icon: ClipboardList },
  { to: "/factory/products", label: "Mahsulotlar", icon: Package },
  { to: "/factory/formulas", label: "Formulalar", icon: FlaskConical },
  { to: "/factory/workers", label: "Hodimlar", icon: Users },
  { to: "/factory/payroll", label: "Oylik davrlar", icon: CalendarClock },
  { to: "/factory/settings", label: "Sozlamalar", icon: Settings },
] as const;


const omborNav = [
  { to: "/factory/inventory", label: "Xom ashyo", icon: Warehouse },
  { to: "/factory/finished", label: "Tayyor ombor", icon: PackageCheck },
] as const;

const laserNav = [
  { to: "/factory/laser", label: "Boshqaruv", icon: LayoutDashboard },
  { to: "/factory/laser/workers", label: "Ishchilar", icon: Users },
  { to: "/factory/laser/tasks", label: "Topshiriqlar", icon: ClipboardList },
  { to: "/factory/laser/attendance", label: "Davomat", icon: CalendarClock },
  { to: "/factory/laser/report", label: "Oylik hisobot", icon: BarChart3 },
] as const;

const qadoqNav = [
  { to: "/factory/packaging", label: "Boshqaruv", icon: LayoutDashboard },
  { to: "/factory/packaging/workers", label: "Ishchilar", icon: Users },
  { to: "/factory/packaging/tasks", label: "Topshiriqlar", icon: ClipboardList },
  { to: "/factory/packaging/report", label: "Oylik hisobot", icon: BarChart3 },
] as const;


const founderNav = [
  { to: "/topshiriqlar", label: "Topshiriqlar", icon: ClipboardList },
] as const;

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { key: string; label: string; icon: typeof LayoutDashboard; items: readonly NavItem[] };

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut, role, founder } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const isFounder = role === "founder";
  const groups: NavGroup[] = isFounder
    ? [{ key: "founder", label: "Topshiriqlar", icon: ClipboardList, items: founderNav }]
    : [
        { key: "zavod", label: "Zavod (umumiy)", icon: Factory, items: zavodNav },
        { key: "ombor", label: "Ombor", icon: Archive, items: omborNav },
        { key: "laser", label: "Lazer bo'limi", icon: Flame, items: laserNav },
        { key: "qadoq", label: "Qadoq bo'limi", icon: Boxes, items: qadoqNav },
      ];

  const isInGroup = (g: NavGroup) => {
    if (g.key === "zavod") {
      return ["/factory/orders", "/factory/products", "/factory/formulas", "/factory/workers", "/factory/payroll", "/factory/settings"]
        .some((p) => loc.pathname === p || loc.pathname.startsWith(p + "/"));
    }
    if (g.key === "ombor") return loc.pathname.startsWith("/factory/inventory") || loc.pathname.startsWith("/factory/finished");
    if (g.key === "laser") return loc.pathname.startsWith("/factory/laser") || loc.pathname === "/factory/dept/laser";
    if (g.key === "qadoq") return loc.pathname.startsWith("/factory/packaging") || loc.pathname === "/factory/dept/packaging";
    return true;
  };



  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    groups.forEach((g) => { init[g.key] = isInGroup(g); });
    return init;
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur">
        <div
          className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4"
          style={{
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          <button className="lg:hidden -ml-1 p-2" onClick={() => setOpen((v) => !v)} aria-label="Menyu">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-display text-xl">B</div>
            <div>
              <div className="font-display text-xl leading-none">BLESSED AL</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Boshqaruv paneli</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {role === "founder" ? `Ta'sischi: ${founder?.name ?? ""}` : user?.email}
            </span>
            <PinLockBtn />
            <ThemeToggle />
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate({ to: "/login" }); }}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Chiqish</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        <aside
          className={cn(
            "fixed inset-y-16 left-0 z-20 w-64 shrink-0 border-r bg-card px-3 py-4 transition-transform lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <nav className="flex flex-col gap-1">
            {!isFounder && (() => {
              const DIcon = dashboardItem.icon;
              const active = loc.pathname === dashboardItem.to;
              return (
                <Link
                  to={dashboardItem.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                    active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-accent",
                  )}
                >
                  <DIcon className="size-4" />
                  {dashboardItem.label}
                </Link>
              );
            })()}
            {groups.map((g) => {
              const GIcon = g.icon;
              const isOpen = openGroups[g.key];
              const groupActive = isInGroup(g);
              return (
                <div key={g.key} className="flex flex-col">
                  <button
                    type="button"
                    onClick={() => setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                      groupActive ? "bg-accent text-foreground" : "text-foreground hover:bg-accent",
                    )}
                  >
                    <GIcon className="size-4" />
                    <span className="flex-1 text-left">{g.label}</span>
                    <ChevronDown className={cn("size-4 transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
                  </button>
                  {isOpen && (
                    <div className="mt-1 ml-3 flex flex-col gap-1 border-l border-border pl-2">
                      {g.items.map((n) => {
                        const Icon = n.icon;
                        const active = loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to + "/"));
                        return (
                          <Link
                            key={n.to}
                            to={n.to}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                              active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground hover:bg-accent",
                            )}
                          >
                            <Icon className="size-4" />
                            {n.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <main
          className="min-h-[calc(100vh-4rem)] flex-1 min-w-0 px-3 py-4 sm:px-4 sm:py-6 lg:px-6"
          style={{
            paddingLeft: "max(0.75rem, env(safe-area-inset-left))",
            paddingRight: "max(0.75rem, env(safe-area-inset-right))",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

function PinLockBtn() {
  const { enabled, lock } = usePin();
  if (!enabled) return null;
  return (
    <Button variant="outline" size="sm" onClick={lock} title="Qulflash">
      <LockIcon className="size-4" />
    </Button>
  );
}
