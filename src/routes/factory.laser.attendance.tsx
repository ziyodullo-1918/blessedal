import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listWorkers, type FactoryWorker } from "@/lib/factory/data";
import { defaultLaserRate, deleteLaserAttendance, listLaserAttendance, recordLaserAttendance, type LaserAttendance } from "@/lib/factory/laser";

export const Route = createFileRoute("/factory/laser/attendance")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

function Page() {
  const today = new Date();
  const monthStart = isoDay(new Date(today.getFullYear(), today.getMonth(), 1));
  const monthEnd = isoDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(monthEnd);
  const [workers, setWorkers] = useState<FactoryWorker[]>([]);
  const [att, setAtt] = useState<LaserAttendance[]>([]);
  const [form, setForm] = useState({ worker_id: "", date: isoDay(today), rate: "", note: "" });

  const refresh = async () => { setAtt(await listLaserAttendance(from, to)); };
  useEffect(() => { (async () => setWorkers(await listWorkers("laser")))(); }, []);
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [from, to]);

  const pickWorker = async (wid: string) => {
    setForm((f) => ({ ...f, worker_id: wid }));
    if (wid) {
      const r = await defaultLaserRate(wid);
      if (r > 0) setForm((f) => ({ ...f, worker_id: wid, rate: String(r) }));
    }
  };

  const add = async () => {
    if (!form.worker_id || !form.date) return toast.error("Ishchi va sana");
    const r = Number(form.rate);
    if (!r || r <= 0) return toast.error("Stavka");
    try {
      await recordLaserAttendance(form.worker_id, form.date, r, form.note || undefined);
      setForm({ worker_id: "", date: isoDay(new Date()), rate: "", note: "" });
      toast.success("Saqlandi"); refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  const nameOf = (id: string) => workers.find((w) => w.id === id)?.full_name ?? "—";
  const total = att.reduce((a, x) => a + Number(x.daily_rate), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Lazer — Davomat</h1>
        <p className="text-sm text-muted-foreground">Har ishchining kunlik ish kunini belgilang</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Yangi davomat</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr_160px_160px_1fr_auto]">
          <Select value={form.worker_id} onValueChange={pickWorker}>
            <SelectTrigger><SelectValue placeholder="Ishchini tanlang" /></SelectTrigger>
            <SelectContent>
              {workers.filter((w) => w.active).map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          <Input type="number" placeholder="So'm" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
          <Input placeholder="Izoh (ixtiyoriy)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          <Button onClick={add}>Saqlash</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>Davomat ({att.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
            <div className="text-sm font-semibold ml-2">Jami: {total.toLocaleString()} so'm</div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {att.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Ma'lumot yo'q.</div>
          ) : (
            <div className="divide-y">
              {att.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="w-[100px] font-mono text-xs text-muted-foreground">{a.work_date}</div>
                  <div className="flex-1">
                    <div className="font-medium">{nameOf(a.worker_id)}</div>
                    {a.note && <div className="text-xs text-muted-foreground">{a.note}</div>}
                  </div>
                  <div className="font-semibold">{Number(a.daily_rate).toLocaleString()} so'm</div>
                  <Button size="icon" variant="ghost" onClick={async () => { if (!confirm("O'chirilsinmi?")) return; await deleteLaserAttendance(a.id); refresh(); }}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
