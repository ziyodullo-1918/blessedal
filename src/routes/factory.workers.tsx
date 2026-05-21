import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import {
  DEPT_FLOW, DEPT_LABEL, createWorker, deleteWorker, listWorkers, toggleWorker,
  type FactoryDept, type FactoryWorker,
} from "@/lib/factory/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/factory/workers")({
  component: () => <RequireAuth><WorkersPage /></RequireAuth>,
});

function WorkersPage() {
  const [workers, setWorkers] = useState<FactoryWorker[]>([]);
  const [form, setForm] = useState({ full_name: "", worker_code: "", pin: "", department: "laser" as FactoryDept, phone: "" });
  const [busy, setBusy] = useState(false);

  const refresh = async () => setWorkers(await listWorkers());
  useEffect(() => { refresh(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || !form.worker_code || form.pin.length < 4) {
      toast.error("Ism, kod va PIN (4+ raqam) majburiy");
      return;
    }
    setBusy(true);
    try {
      await createWorker({ ...form, phone: form.phone || null });
      setForm({ full_name: "", worker_code: "", pin: "", department: "laser", phone: "" });
      await refresh();
      toast.success("Hodim qo'shildi");
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Zavod hodimlari</h1>
        <p className="text-sm text-muted-foreground">Barcha bo'limlar uchun yagona hodimlar bazasi</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Yangi hodim</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-6 items-end">
            <div className="md:col-span-2"><Label>Ism</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Kod</Label><Input value={form.worker_code} onChange={(e) => setForm({ ...form, worker_code: e.target.value.toUpperCase() })} /></div>
            <div><Label>PIN</Label><Input type="password" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></div>
            <div>
              <Label>Bo'lim</Label>
              <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v as FactoryDept })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPT_FLOW.map((d) => <SelectItem key={d} value={d}>{DEPT_LABEL[d]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={busy}>Qo'shish</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {workers.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Hodimlar yo'q.</div>
          ) : (
            <div className="divide-y">
              {workers.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium">{w.full_name} <span className="ml-2 font-mono text-xs text-muted-foreground">{w.worker_code}</span></div>
                    <div className="text-xs text-muted-foreground">{DEPT_LABEL[w.department]}{w.phone ? ` · ${w.phone}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={w.active} onCheckedChange={async (v) => { await toggleWorker(w.id, v); refresh(); }} />
                    <Button variant="ghost" size="icon" onClick={async () => {
                      if (!confirm(`${w.full_name} o'chirilsinmi?`)) return;
                      await deleteWorker(w.id); refresh();
                    }}><Trash2 className="size-4 text-destructive" /></Button>
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
