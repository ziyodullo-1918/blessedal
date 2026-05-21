import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEPT_LABEL, type FactoryDept } from "@/lib/factory/data";
import { deleteRate, listRates, upsertRate, workerSalary, type SalaryRate, type WorkerSalary } from "@/lib/factory/salary";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const SALARY_DEPTS: FactoryDept[] = ["laser", "sewing", "stretching", "packaging"];

export const Route = createFileRoute("/factory/salary")({
  component: () => <RequireAuth><SalaryPage /></RequireAuth>,
});

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

function SalaryPage() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(isoDay(monthStart));
  const [to, setTo] = useState(isoDay(today));
  const [rates, setRates] = useState<SalaryRate[]>([]);
  const [rows, setRows] = useState<WorkerSalary[]>([]);

  const refreshAll = async () => {
    const [r, w] = await Promise.all([listRates(), workerSalary(from, to)]);
    setRates(r);
    setRows(w);
  };
  useEffect(() => { refreshAll(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [from, to]);

  const totals = useMemo(() => {
    const byDept = new Map<FactoryDept, { units: number; amount: number }>();
    let grand = 0;
    for (const r of rows) {
      const cur = byDept.get(r.department) ?? { units: 0, amount: 0 };
      cur.units += Number(r.total_units); cur.amount += Number(r.total_amount);
      byDept.set(r.department, cur);
      grand += Number(r.total_amount);
    }
    return { byDept: Array.from(byDept.entries()), grand };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Oylik (donaboy) hisob</h1>
        <p className="text-sm text-muted-foreground">Har bir bo'lim uchun avtomatik donalik to'lov hisobi</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Davr</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div><label className="text-xs text-muted-foreground">Boshlanish</label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div><label className="text-xs text-muted-foreground">Tugash</label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="ml-auto text-right">
            <div className="text-xs text-muted-foreground">Umumiy</div>
            <div className="text-2xl font-semibold">{totals.grand.toLocaleString()} so'm</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-4">
        {SALARY_DEPTS.map((d) => {
          const t = totals.byDept.find(([k]) => k === d)?.[1] ?? { units: 0, amount: 0 };
          return (
            <Card key={d}><CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{DEPT_LABEL[d]}</div>
              <div className="text-xl font-semibold">{t.amount.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{t.units.toLocaleString()} dona</div>
            </CardContent></Card>
          );
        })}
      </div>

      <RateEditor rates={rates} onChanged={refreshAll} />

      <Card>
        <CardHeader><CardTitle>Hodimlar bo'yicha hisob</CardTitle></CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Bu davr uchun ma'lumot yo'q.</div>
          ) : (
            <div className="divide-y text-sm">
              {rows.map((r) => (
                <div key={`${r.worker_id}-${r.department}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="font-medium">{r.worker_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{DEPT_LABEL[r.department]} · {Number(r.total_units).toLocaleString()} dona</div>
                  </div>
                  <div className="font-semibold">{Number(r.total_amount).toLocaleString()} so'm</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RateEditor({ rates, onChanged }: { rates: SalaryRate[]; onChanged: () => void }) {
  const [dept, setDept] = useState<FactoryDept>("sewing");
  const [product, setProduct] = useState("");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const n = Number(rate); if (!n || n <= 0) { toast.error("Narx noto'g'ri"); return; }
    setBusy(true);
    try {
      await upsertRate({ department: dept, product_name: product.trim() || null, rate_per_unit: n, active: true });
      setProduct(""); setRate(""); toast.success("Saqlandi"); onChanged();
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader><CardTitle>Donalik narxlar</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[160px_1fr_160px_auto]">
          <select className="rounded-md border bg-background px-3 py-2 text-sm" value={dept} onChange={(e) => setDept(e.target.value as FactoryDept)}>
            {SALARY_DEPTS.map((d) => <option key={d} value={d}>{DEPT_LABEL[d]}</option>)}
          </select>
          <Input placeholder="Mahsulot (bo'sh = barchasi)" value={product} onChange={(e) => setProduct(e.target.value)} />
          <Input type="number" min={0} placeholder="Narx (so'm)" value={rate} onChange={(e) => setRate(e.target.value)} />
          <Button disabled={busy} onClick={add}>Qo'shish</Button>
        </div>
        <div className="divide-y text-sm">
          {rates.length === 0 && <div className="py-6 text-center text-muted-foreground">Hozircha narx yo'q.</div>}
          {rates.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <span className="font-medium">{DEPT_LABEL[r.department]}</span>
                <span className="ml-2 text-muted-foreground text-xs">{r.product_name ?? "barchasi"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{Number(r.rate_per_unit).toLocaleString()} so'm</span>
                <Button size="icon" variant="ghost" onClick={async () => { if (confirm("O'chirish?")) { await deleteRate(r.id); onChanged(); } }}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
