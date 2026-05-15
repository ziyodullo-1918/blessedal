import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import {
  listAssignments,
  listProducts,
  listWorkers,
  listPayrollPeriods,
  reportByPeriod,
  listAbsences,
  type ReportRow,
  type PayrollPeriod,
  type Worker,
  type AbsenceRow,
  type Assignment,
} from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtMoney, fmtDate } from "@/lib/format";
import { Users, Package, ClipboardList, Wallet, UserX } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/")({
  component: () => (
    <RequireAuth>
      <DashboardPage />
    </RequireAuth>
  ),
});

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function localDateStr(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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
  const [inProgressRows, setInProgressRows] = useState<Assignment[]>([]);
  const [allWorkers, setAllWorkers] = useState<Worker[]>([]);
  const [todayAbsences, setTodayAbsences] = useState<AbsenceRow[]>([]);
  const [dayAbsences, setDayAbsences] = useState<AbsenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState<string>(todayStr());
  const today = todayStr();

  useEffect(() => {
    (async () => {
      const [workers, products, assignments, periods, absToday] = await Promise.all([
        listWorkers(),
        listProducts({ activeOnly: true }),
        listAssignments({ status: "in_progress", activePeriodOnly: true }),
        listPayrollPeriods(),
        listAbsences(today),
      ]);
      const open = periods.find((p) => !p.closed_at) ?? null;
      setOpenPeriod(open);
      setAllWorkers(workers);
      setTodayAbsences(absToday);
      setInProgressRows(assignments);

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
  }, [today]);

  // Load absences for selected day (for the daily summary section)
  useEffect(() => {
    listAbsences(day).then(setDayAbsences).catch(console.error);
  }, [day]);

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

  // ------- Today's attendance summary (banner) -------
  const todayAbsentSet = useMemo(
    () => new Set(todayAbsences.map((a) => a.worker_id)),
    [todayAbsences],
  );
  const todayAbsentNames = useMemo(
    () => allWorkers.filter((w) => todayAbsentSet.has(w.id)),
    [allWorkers, todayAbsentSet],
  );
  const todayActive = allWorkers.length - todayAbsentSet.size;

  // ------- Charts -------
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

  // Workers — horizontal bar chart (more readable than donut)
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
  const workerChartHeight = Math.max(220, workerAgg.length * 28 + 40);

  // ------- Daily summary -------
  // For each worker, on the selected day:
  //   received[]  = assignments started that day
  //   completed[] = assignments completed that day (with original "berilgan" date)
  type DailyWorker = {
    workerId: string;
    name: string;
    receivedQty: number;
    receivedJobs: ReportRow[];
    completedQty: number;
    completedTotal: number;
    completedJobs: ReportRow[];
  };

  const dailyByWorker = useMemo<DailyWorker[]>(() => {
    const map = new Map<string, DailyWorker>();
    const ensure = (id: string, name: string) => {
      let cur = map.get(id);
      if (!cur) {
        cur = {
          workerId: id,
          name,
          receivedQty: 0,
          receivedJobs: [],
          completedQty: 0,
          completedTotal: 0,
          completedJobs: [],
        };
        map.set(id, cur);
      }
      return cur;
    };
    for (const r of periodRows) {
      if (localDateStr(r.started_at) === day) {
        const w = ensure(r.worker.id, r.worker.full_name);
        w.receivedQty += r.quantity;
        w.receivedJobs.push(r);
      }
      if (r.completed_at && localDateStr(r.completed_at) === day) {
        const w = ensure(r.worker.id, r.worker.full_name);
        w.completedQty += r.quantity;
        w.completedTotal += r.quantity * Number(r.unit_price);
        w.completedJobs.push(r);
      }
    }
    // Also include in-progress assignments started on the selected day
    for (const a of inProgressRows) {
      if (localDateStr(a.started_at) !== day) continue;
      const w = ensure(a.worker_id, a.worker?.full_name ?? "—");
      w.receivedQty += a.quantity;
      // Adapt Assignment shape to ReportRow display fields used in the list
      w.receivedJobs.push({
        ...a,
        worker: { id: a.worker_id, full_name: a.worker?.full_name ?? "—" },
        product: a.product ? { id: a.product_id, name: a.product.name } : null,
      } as ReportRow);
    }
    return [...map.values()].sort((a, b) => b.completedTotal - a.completedTotal);
  }, [periodRows, inProgressRows, day]);

  // Daily product totals — what was assigned to workers on the selected day
  const dailyProductAgg = useMemo(() => {
    const m = new Map<string, { name: string; qty: number }>();
    const bump = (id: string, name: string, qty: number) => {
      const cur = m.get(id) ?? { name, qty: 0 };
      cur.qty += qty;
      m.set(id, cur);
    };
    for (const r of periodRows) {
      if (localDateStr(r.started_at) !== day) continue;
      bump(r.product?.id ?? "—", r.product?.name ?? "—", r.quantity);
    }
    for (const a of inProgressRows) {
      if (localDateStr(a.started_at) !== day) continue;
      bump(a.product_id, a.product?.name ?? "—", a.quantity);
    }
    return [...m.values()].sort((a, b) => b.qty - a.qty);
  }, [periodRows, inProgressRows, day]);

  const dayAbsentSet = useMemo(() => new Set(dayAbsences.map((a) => a.worker_id)), [dayAbsences]);
  const dayAbsentNames = allWorkers.filter((w) => dayAbsentSet.has(w.id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl">Boshqaruv paneli</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {openPeriod ? `Joriy davr: ${openPeriod.label}` : "Cex faoliyatining umumiy ko'rinishi"}
        </p>
      </div>

      {/* TODAY ATTENDANCE BANNER */}
      <Card
        className={
          todayAbsentNames.length > 0
            ? "border-l-4 border-l-destructive"
            : "border-l-4 border-l-primary"
        }
      >
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <UserX
              className={`size-5 ${
                todayAbsentNames.length > 0 ? "text-destructive" : "text-primary"
              }`}
            />
            <div>
              <div className="text-sm font-semibold">
                {fmtDate(new Date())} · {allWorkers.length} ta ishchi · {todayActive} faol ·{" "}
                {todayAbsentNames.length} kelmagan
              </div>
              {todayAbsentNames.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 text-xs">
                  {todayAbsentNames.map((w, i) => (
                    <span
                      key={w.id}
                      className="rounded bg-destructive/10 px-2 py-0.5 text-destructive"
                    >
                      {i + 1}. {w.full_name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

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

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Mahsulot bo'yicha ishlab chiqarish</CardTitle>
            <span className="text-xs text-muted-foreground">{openPeriod?.label ?? "—"}</span>
          </CardHeader>
          <CardContent>
            {productAgg.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Ma'lumot yo'q</p>
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
            <span className="text-xs text-muted-foreground">{openPeriod?.label ?? "—"}</span>
          </CardHeader>
          <CardContent>
            {workerAgg.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">Ma'lumot yo'q</p>
            ) : (
              <div style={{ height: workerChartHeight }} className="max-h-[480px] overflow-auto">
                <ResponsiveContainer width="100%" height={workerChartHeight}>
                  <BarChart
                    data={workerAgg}
                    layout="vertical"
                    margin={{ top: 4, right: 60, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      width={110}
                      interval={0}
                    />
                    <Tooltip
                      formatter={(v: number) => fmtMoney(v)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="sum" fill="#22c55e" radius={[0, 4, 4, 0]}>
                      {/* Inline label at end of bar */}
                    </Bar>
                  </BarChart>
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
          {dayAbsentNames.length > 0 && (
            <div className="border-b bg-destructive/5 px-4 py-2 text-xs">
              <span className="font-semibold text-destructive">
                Kelmaganlar ({dayAbsentNames.length}):
              </span>{" "}
              <span className="text-muted-foreground">
                {dayAbsentNames.map((w) => w.full_name).join(", ")}
              </span>
            </div>
          )}
          {dailyByWorker.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Bu kunda na olingan, na bajarilgan ish bor.
            </p>
          ) : (
            <div className="divide-y">
              {dailyByWorker.map((w) => (
                <div key={w.workerId} className="px-4 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <div className="font-semibold">{w.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Olgan: <span className="text-foreground">{w.receivedQty} dona</span> ·{" "}
                        Bajargan:{" "}
                        <span className="text-foreground">{w.completedQty} dona</span>
                      </div>
                    </div>
                    <div className="font-mono font-semibold text-primary">
                      {fmtMoney(w.completedTotal)}
                    </div>
                  </div>

                  {w.receivedJobs.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Bugun olgan ishlari
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {w.receivedJobs.map((it) => (
                          <div
                            key={`r-${it.id}`}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="truncate">
                              {it.product?.name ?? "—"}
                              {it.color_name ? (
                                <span className="text-muted-foreground"> · {it.color_name}</span>
                              ) : null}
                            </span>
                            <span className="font-mono whitespace-nowrap text-muted-foreground">
                              {it.quantity} dona ·{" "}
                              <span
                                className={
                                  it.status === "completed"
                                    ? "text-primary"
                                    : "text-amber-600 dark:text-amber-400"
                                }
                              >
                                {it.status === "completed" ? "bajarildi" : "jarayonda"}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {w.completedJobs.length > 0 && (
                    <div className="mt-2">
                      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        Bugun bajargan ishlari
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {w.completedJobs.map((it) => {
                          const startedDate = localDateStr(it.started_at);
                          const fromOtherDay = startedDate !== day;
                          return (
                            <div
                              key={`c-${it.id}`}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="truncate">
                                {it.product?.name ?? "—"}
                                {it.color_name ? (
                                  <span className="text-muted-foreground">
                                    {" "}
                                    · {it.color_name}
                                  </span>
                                ) : null}
                                {fromOtherDay && (
                                  <span className="ml-1 text-muted-foreground">
                                    (olgan: {fmtDate(it.started_at)})
                                  </span>
                                )}
                              </span>
                              <span className="font-mono whitespace-nowrap">
                                {it.quantity} dona ·{" "}
                                <span className="text-foreground">
                                  {fmtMoney(it.quantity * Number(it.unit_price))}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
