import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listWorkers, type FactoryWorker } from "@/lib/factory/data";
import { deleteLaserRate, listLaserRates, upsertLaserRate, type LaserRate } from "@/lib/factory/laser";

export const Route = createFileRoute("/factory/laser/rates")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function Page() {
  const [rates, setRates] = useState<LaserRate[]>([]);
  const [workers, setWorkers] = useState<FactoryWorker[]>([]);
  const [form, setForm] = useState<{ worker_id: string; rate: string }>({ worker_id: "default", rate: "" });

  const refresh = async () => { setRates(await listLaserRates()); setWorkers(await listWorkers("laser")); };
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    const r = Number(form.rate);
    if (!r || r <= 0) return toast.error("Stavka kiriting");
    try {
      await upsertLaserRate({ worker_id: form.worker_id === "default" ? null : form.worker_id, rate_per_day: r });
      setForm({ worker_id: "default", rate: "" });
      toast.success("Saqlandi"); refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  const workerName = (id: string | null) => id ? (workers.find((w) => w.id === id)?.full_name ?? "—") : "Default (umumiy)";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Lazer — Kunlik stavka</h1>
        <p className="text-sm text-muted-foreground">Default barcha ishchilar uchun, shaxsiy esa ustun bo'ladi</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Yangi stavka</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <Select value={form.worker_id} onValueChange={(v) => setForm({ ...form, worker_id: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (umumiy)</SelectItem>
              {workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" placeholder="So'm / kun" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
          <Button onClick={add}>Saqlash</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Stavkalar ({rates.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {rates.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Stavka yo'q.</div>
          ) : (
            <div className="divide-y">
              {rates.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{workerName(r.worker_id)}</div>
                    <div className="text-xs text-muted-foreground">{Number(r.rate_per_day).toLocaleString()} so'm/kun</div>
                  </div>
                  <Switch checked={r.active} onCheckedChange={async (v) => { await upsertLaserRate({ id: r.id, worker_id: r.worker_id, rate_per_day: r.rate_per_day, active: v }); refresh(); }} />
                  <Button size="icon" variant="ghost" onClick={async () => { if (!confirm("O'chirilsinmi?")) return; await deleteLaserRate(r.id); refresh(); }}>
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
