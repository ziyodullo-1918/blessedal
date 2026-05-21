import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { closePayrollPeriod, createPayrollPeriod, listPayrollPeriods, listSnapshots, type PayrollPeriod, type PayrollSnapshot } from "@/lib/factory/salary";
import { DEPT_LABEL } from "@/lib/factory/data";
import { toast } from "sonner";
import { Lock, Unlock } from "lucide-react";

export const Route = createFileRoute("/factory/payroll")({
  component: () => <RequireAuth><PayrollPage /></RequireAuth>,
});

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

function PayrollPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [snaps, setSnaps] = useState<PayrollSnapshot[]>([]);
  const [label, setLabel] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const [from, setFrom] = useState(isoDay(monthStart));
  const [to, setTo] = useState(isoDay(monthEnd));

  const refresh = async () => {
    const p = await listPayrollPeriods();
    setPeriods(p);
    if (selected) setSnaps(await listSnapshots(selected));
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [selected]);

  const create = async () => {
    if (!label || !from || !to) return;
    try {
      await createPayrollPeriod({ label, start_date: from, end_date: to });
      toast.success("Davr yaratildi");
      setLabel(""); refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  const close = async (id: string) => {
    if (!confirm("Davrni yopish va statistikani muzlatib qo'yish?")) return;
    try { await closePayrollPeriod(id); toast.success("Yopildi"); refresh(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const total = snaps.reduce((a, s) => a + Number(s.total_amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Oylik davrlar</h1>
        <p className="text-sm text-muted-foreground">Oylik davr ochib, oxirida yoping — natija muzlatib saqlanadi</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Yangi davr</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr_160px_160px_auto]">
          <Input placeholder="Nomi (masalan: 2026-05)" value={label} onChange={(e) => setLabel(e.target.value)} />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button onClick={create}>Yaratish</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Davrlar</CardTitle></CardHeader>
        <CardContent className="p-0">
          {periods.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Hozircha davrlar yo'q.</div>
          ) : (
            <div className="divide-y">
              {periods.map((p) => (
                <button key={p.id} onClick={() => setSelected(p.id)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 text-sm hover:bg-accent/40 ${selected === p.id ? "bg-accent/40" : ""}`}>
                  <div className="flex-1">
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.start_date} → {p.end_date}</div>
                  </div>
                  {p.closed_at ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-xs"><Lock className="size-3" />Yopilgan</span>
                  ) : (
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); close(p.id); }}>
                      <Unlock className="size-3 mr-1" />Yopish
                    </Button>
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Muzlatilgan natija</CardTitle>
            <div className="text-sm text-muted-foreground">Jami: <span className="font-semibold text-foreground">{total.toLocaleString()} so'm</span></div>
          </CardHeader>
          <CardContent className="p-0">
            {snaps.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Bu davr hali yopilmagan yoki ma'lumot yo'q.</div>
            ) : (
              <div className="divide-y text-sm">
                {snaps.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <div className="font-medium">{s.worker_name}</div>
                      <div className="text-xs text-muted-foreground">{DEPT_LABEL[s.department]} · {s.total_units.toLocaleString()} dona</div>
                    </div>
                    <div className="font-semibold">{Number(s.total_amount).toLocaleString()} so'm</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
