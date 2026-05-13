import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import {
  listAssignments,
  listProducts,
  listWorkers,
  listPayrollPeriods,
  reportByPeriod,
  type ReportRow,
  type PayrollPeriod,
} from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtMoney } from "@/lib/format";
import { Users, Package, ClipboardList, Wallet } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/")({
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

const PIE_COLORS = [
  "#22c55e", "#06b6d4", "#f59e0b", "#ec4899", "#8b5cf6",
  "#ef4444", "#3b82f6", "#10b981", "#eab308", "#a855f7",
  "#14b8a6", "#f97316", "#64748b", "#84cc16", "#0ea5e9",
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function DashboardPage() {
  const [stats, setStats] = useState({
    workers: 0,
    products: 0,
    inProgress: 0,
    periodSalary: 0,
  });
  const [openPeriod, setOpenPeriod] = useState<PayrollPeriod | null>(null);
  const [periodRows, setPeriodRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<string>(todayStr());

  useEffect(() => {
    (async () => {
      const [workers, products, assignments, periods] = await Promise.all([
        listWorkers(),
        listProducts({ activeOnly: true }),
        listAssignments({ status: "in_progress", activePeriodOnly: true }),
        listPayrollPeriods(),
      ]);
      const open = periods.find((p) => !p.closed_at) ?? null;
      setOpenPeriod(open);

      let rows: ReportRow[] = [];
      if (open) rows = await reportByPeriod(open.id);
      setPeriodRows(rows);

      const periodSalary = rows.reduce((s, a) => s + a.quantity * Number(a.unit_price), 0);
      setStats({
        workers: workers.length,
        products: products.length,
        inProgress: assignments.length,
        periodSalary,
      });
      setLoading(false);
    })().catch((e) => console.error(e));
  }, []);

  const cards = [
    { label: "Ishchilar", value: stats.workers, icon: Users },
    { label: "Mahsulotlar", value: stats.products, icon: Package },
    { label: "Jarayonda", value: stats.inProgress, icon: ClipboardList },
    {
      label: openPeriod ? `Joriy davr maoshi` : "Bu davr maoshi",
      value: fmtMoney(stats.periodSalary),
      icon: Wallet,
    },
  ];

  // Aggregate products for bar chart
  const productAgg = useMemo(() => {
    const m = new Map<string, { name: string; qty: number }>();
    for (const r of periodRows) {
      const id = r.product?.id ?? "—";
      const name = r.product?.name ?? "—";
      const cur = m.get(id) ?? { name, qty: 0 };
      cur.qty += r.quantity;
      m.set(id, cur);
    }
    return [...m.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [periodRows]);

  // Aggregate workers for donut
  const workerAgg = useMemo(() => {
    const m = new Map<string, { name: string; sum: number }>();
    for (const r of periodRows) {
      const id = r.worker.id;
      const cur = m.get(id) ?? { name: r.worker.full_name, sum: 0 };
      cur.sum += r.quantity * Number(r.unit_price);
      m.set(id, cur);
    }
    return [...m.values()].sort((a, b) => b.sum - a.sum);
  }, [periodRows]);

  // Daily summary — pick a single day, group by worker
  const dailyByWorker = useMemo(() => {
    const startStr = day;
    const dayRows = periodRows.filter((r) => {
      if (!r.completed_at) return false;
      const d = new Date(r.completed_at);
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return local === startStr;
    });
    const m = new Map<
      string,
      { name: string; total: number; qty: number; jobs: number; items: ReportRow[] }
    >();
    for (const r of dayRows) {
      const id = r.worker.id;
      const cur =
        m.get(id) ??
        { name: r.worker.full_name, total: 0, qty: 0, jobs: 0, items: [] as ReportRow[] };
      cur.total += r.quantity * Number(r.unit_price);
      cur.qty += r.quantity;
      cur.jobs += 1;
      cur.items.push(r);
      m.set(id, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [periodRows, day]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Boshqaruv paneli</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {openPeriod
            ? `Joriy davr: ${openPeriod.label}`
            : "Cex faoliyatining umumiy ko'rinishi"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </CardTitle>
                <Icon className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="font-display text-3xl break-words">
                  {loading ? "—" : c.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts: products bar + workers donut */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Mahsulot bo'yicha ishlab chiqarish</CardTitle>
            <span className="text-xs text-muted-foreground">
              {openPeriod?.label ?? "—"}
            </span>
          </CardHeader>
          <CardContent>
            {productAgg.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Ma'lumot yo'q
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productAgg} margin={{ top: 8, right: 8, left: -12, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      height={50}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="qty" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Ishchi bo'yicha daromad</CardTitle>
            <span className="text-xs text-muted-foreground">
              {openPeriod?.label ?? "—"}
            </span>
          </CardHeader>
          <CardContent>
            {workerAgg.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Ma'lumot yo'q
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workerAgg}
                      dataKey="sum"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {workerAgg.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => fmtMoney(v)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily worker summary */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Kunlik hodimlar yakuni</CardTitle>
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Sana</Label>
            <Input
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              min={openPeriod?.start_date}
              max={openPeriod?.end_date}
              className="w-auto"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {dailyByWorker.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Bu kunda bajarilgan ish yo'q.
            </p>
          ) : (
            <div className="divide-y">
              {dailyByWorker.map((w) => (
                <div key={w.name} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {w.jobs} yozuv · {w.qty} dona
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-primary">
                      {fmtMoney(w.total)}
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    {w.items.map((it) => (
                      <div
                        key={it.id}
                        className="flex items-center justify-between text-xs text-muted-foreground"
                      >
                        <span className="truncate">{it.product?.name ?? "—"}</span>
                        <span className="font-mono whitespace-nowrap">
                          {it.quantity} dona ·{" "}
                          <span className="text-foreground">
                            {fmtMoney(it.quantity * Number(it.unit_price))}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
