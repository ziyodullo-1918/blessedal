import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEPT_FLOW, DEPT_LABEL, dashboardSummary, listOrders, type FactoryOrder } from "@/lib/factory/data";
import { workerSalary } from "@/lib/factory/salary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "@/components/factory/order-flow";
import { Activity, Package, AlertTriangle, CheckCircle2, Clock, TrendingDown, Wallet } from "lucide-react";

export const Route = createFileRoute("/factory/")({
  component: () => <RequireAuth><FactoryDashboard /></RequireAuth>,
});

function FactoryDashboard() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof dashboardSummary>> | null>(null);
  const [orders, setOrders] = useState<FactoryOrder[]>([]);

  const refresh = async () => {
    const [s, o] = await Promise.all([dashboardSummary(), listOrders()]);
    setSummary(s);
    setOrders(o.slice(0, 10));
  };

  useEffect(() => {
    refresh();
    const channel = supabase
      .channel("factory_dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_orders" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_stages" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const totalOrders = summary?.orders.length ?? 0;
  const activeOrders = summary?.orders.filter((o) => o.status === "in_progress" || o.status === "partial").length ?? 0;
  const completedOrders = summary?.orders.filter((o) => o.status === "completed").length ?? 0;
  const waiting = summary?.orders.filter((o) => o.status === "waiting_material" || o.status === "rejected").length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Zavod boshqaruv paneli</h1>
          <p className="text-sm text-muted-foreground">Jonli ishlab chiqarish ko'rinishi</p>
        </div>
        <Link
          to="/factory/orders"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Buyurtmalar
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={Package} label="Jami buyurtma" value={totalOrders} />
        <Kpi icon={Activity} label="Faol" value={activeOrders} tone="info" />
        <Kpi icon={CheckCircle2} label="Tugatilgan" value={completedOrders} tone="success" />
        <Kpi icon={AlertTriangle} label="To'xtagan" value={waiting} tone="warning" />
      </div>

      {/* Department breakdown */}
      <Card>
        <CardHeader><CardTitle>Bo'limlar bo'yicha holat</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {DEPT_FLOW.map((dept) => {
              const stages = summary?.stages.filter((s) => s.department === dept) ?? [];
              const planned = stages.reduce((a, s) => a + s.planned_quantity, 0);
              const done = stages.reduce((a, s) => a + s.completed_quantity, 0);
              const active = stages.filter((s) => s.status === "in_progress" || s.status === "partial").length;
              const pct = planned > 0 ? Math.round((done / planned) * 100) : 0;
              const inner = (
                <>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{DEPT_LABEL[dept]}</div>
                    <div className="text-xs text-muted-foreground">{active} faol</div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {done.toLocaleString()} / {planned.toLocaleString()} ({pct}%)
                  </div>
                </>
              );
              const cls = "group rounded-lg border bg-card p-4 transition-colors hover:border-primary block";
              if (dept === "sewing") return <Link key={dept} to="/topshiriqlar" className={cls}>{inner}</Link>;
              if (dept === "stretching") return <Link key={dept} to="/tortuvchilar" className={cls}>{inner}</Link>;
              return <Link key={dept} to="/factory/dept/$dept" params={{ dept }} className={cls}>{inner}</Link>;
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card>
        <CardHeader><CardTitle>So'nggi buyurtmalar</CardTitle></CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Hozircha buyurtmalar yo'q.</div>
          ) : (
            <div className="divide-y">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  to="/factory/orders/$id"
                  params={{ id: o.id }}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-accent/40 rounded-md px-2 -mx-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{o.order_number} · {o.product_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {o.customer_name} · {o.total_quantity} dona{o.due_date ? ` · ${o.due_date}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Activity; label: string; value: number; tone?: "info" | "success" | "warning" }) {
  const toneCls =
    tone === "info" ? "text-blue-400" :
    tone === "success" ? "text-emerald-400" :
    tone === "warning" ? "text-orange-400" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-md bg-muted p-2 ${toneCls}`}><Icon className="size-5" /></div>
          <div>
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-2xl font-semibold">{value}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
