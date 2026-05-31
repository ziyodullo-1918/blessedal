import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { listWorkers, type FactoryWorker } from "@/lib/factory/data";
import {
  deleteLaserAttendance, listLaserAttendance, recordLaserAttendance,
  getDefaultLaserRate, type LaserAttendance,
} from "@/lib/factory/laser";
import { CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/factory/laser/attendance")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

function Page() {
  const [date, setDate] = useState(isoDay(new Date()));
  const [workers, setWorkers] = useState<FactoryWorker[]>([]);
  const [att, setAtt] = useState<LaserAttendance[]>([]);
  const [defaultRate, setDefaultRate] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    const [ws, a, r] = await Promise.all([
      listWorkers("laser"),
      listLaserAttendance(date, date),
      getDefaultLaserRate(),
    ]);
    setWorkers(ws.filter((w) => w.active));
    setAtt(a);
    setDefaultRate(r.rate);
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [date]);

  const byWorker = useMemo(() => {
    const m = new Map<string, LaserAttendance>();
    for (const a of att) m.set(a.worker_id, a);
    return m;
  }, [att]);

  const toggle = async (worker: FactoryWorker, checked: boolean) => {
    setBusy(worker.id);
    try {
      if (checked) {
        if (!defaultRate) { toast.error("Avval ishchilar bo'limida kunlik stavka belgilang"); return; }
        await recordLaserAttendance(worker.id, date, defaultRate);
      } else {
        const ex = byWorker.get(worker.id);
        if (ex) await deleteLaserAttendance(ex.id);
      }
      await refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(null); }
  };

  const presentCount = att.length;
  const total = att.reduce((a, x) => a + Number(x.daily_rate), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display tracking-tight flex items-center gap-2">
            <CalendarCheck className="size-7 text-emerald-400" />Lazer — Davomat
          </h1>
          <p className="text-sm text-muted-foreground">
            Ishchini belgilang — kunlik stavka: <span className="font-semibold text-foreground">{defaultRate.toLocaleString()} so'm</span>
          </p>
        </div>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[180px]" />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{date} — {presentCount}/{workers.length} ishchi</CardTitle>
          <div className="text-sm font-semibold">Jami: {total.toLocaleString()} so'm</div>
        </CardHeader>
        <CardContent className="p-0">
          {workers.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Ishchi yo'q. Avval Ishchilar bo'limida qo'shing.</div>
          ) : (
            <div className="divide-y">
              {workers.map((w) => {
                const a = byWorker.get(w.id);
                const checked = !!a;
                return (
                  <label key={w.id} className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer hover:bg-accent/30">
                    <Checkbox checked={checked} disabled={busy === w.id} onCheckedChange={(v) => toggle(w, !!v)} />
                    <div className="flex-1">
                      <div className="font-medium">{w.full_name}</div>
                      <div className="text-xs text-muted-foreground">Kod: {w.worker_code}</div>
                    </div>
                    <div className={checked ? "text-sm font-semibold text-emerald-400" : "text-xs text-muted-foreground"}>
                      {checked ? `${Number(a!.daily_rate).toLocaleString()} so'm` : "belgilanmagan"}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
