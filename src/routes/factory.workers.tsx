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
  const [filter, setFilter] = useState<FactoryDept | "all">("all");

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

  const visible = filter === "all" ? workers : workers.filter((w) => w.department === filter);
  const counts: Record<FactoryDept | "all", number> = {
    all: workers.length,
    laser: 0, sewing: 0, stretching: 0, packaging: 0,
  };
  workers.forEach((w) => { counts[w.department] = (counts[w.department] ?? 0) + 1; });

  // Group by department for the list
  const grouped = DEPT_FLOW
    .map((d) => ({ dept: d, items: visible.filter((w) => w.department === d) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Zavod hodimlari</h1>
        <p className="text-sm text-muted-foreground">Barcha bo'limlar uchun yagona hodimlar bazasi · jami {workers.length}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Yangi hodim</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-7 items-end">
            <div className="md:col-span-2"><Label>Ism</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div><Label>Kod</Label><Input value={form.worker_code} onChange={(e) => setForm({ ...form, worker_code: e.target.value.toUpperCase() })} /></div>
            <div><Label>PIN</Label><Input type="password" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} /></div>
            <div><Label>Telefon</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+998..." /></div>
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

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
          Barchasi ({counts.all})
        </Button>
        {DEPT_FLOW.map((d) => (
          <Button key={d} size="sm" variant={filter === d ? "default" : "outline"} onClick={() => setFilter(d)}>
            {DEPT_LABEL[d]} ({counts[d] ?? 0})
          </Button>
        ))}
      </div>

      {grouped.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Hodimlar yo'q.</CardContent></Card>
      ) : (
        grouped.map(({ dept, items }) => (
          <Card key={dept}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <span>{DEPT_LABEL[dept]}</span>
                <span className="text-xs font-normal text-muted-foreground">{items.length} hodim</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {items.map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {w.full_name}
                        <span className="ml-2 font-mono text-xs text-muted-foreground">{w.worker_code}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {DEPT_LABEL[w.department]}
                        {w.phone ? ` · ${w.phone}` : ""}
                        {w.active ? "" : " · faol emas"}
                      </div>
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
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
