import { useEffect, useState } from "react";
import { createWorker, deleteWorker, listWorkers, toggleWorker, type FactoryDept, type FactoryWorker } from "@/lib/factory/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

export function DeptWorkers({ department, title }: { department: FactoryDept; title: string }) {
  const [list, setList] = useState<FactoryWorker[]>([]);
  const [form, setForm] = useState({ full_name: "", worker_code: "", pin: "", phone: "" });

  const refresh = async () => setList(await listWorkers(department));
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [department]);

  const add = async () => {
    if (!form.full_name || !form.worker_code || !form.pin) return toast.error("F.I.Sh, kod va PIN majburiy");
    try {
      await createWorker({
        full_name: form.full_name.trim(),
        worker_code: form.worker_code.trim(),
        pin: form.pin.trim(),
        department,
        phone: form.phone.trim() || null,
      });
      setForm({ full_name: "", worker_code: "", pin: "", phone: "" });
      toast.success("Ishchi qo'shildi"); refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">Bo'lim ishchilarini boshqaring</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Yangi ishchi</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr_140px_120px_140px_auto]">
          <Input placeholder="F.I.Sh" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input placeholder="Kod" value={form.worker_code} onChange={(e) => setForm({ ...form, worker_code: e.target.value })} />
          <Input placeholder="PIN" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} />
          <Input placeholder="Telefon" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Button onClick={add}><UserPlus className="size-4 mr-1" />Qo'shish</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Ishchilar ({list.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Ishchilar yo'q.</div>
          ) : (
            <div className="divide-y">
              {list.map((w) => (
                <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1">
                    <div className="font-medium">{w.full_name}</div>
                    <div className="text-xs text-muted-foreground">Kod: {w.worker_code}{w.phone ? ` · ${w.phone}` : ""}</div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">{w.active ? "Faol" : "Nofaol"}</span>
                    <Switch checked={w.active} onCheckedChange={async (v) => { await toggleWorker(w.id, v); refresh(); }} />
                  </div>
                  <Button size="icon" variant="ghost" onClick={async () => {
                    if (!confirm("O'chirilsinmi?")) return;
                    try { await deleteWorker(w.id); refresh(); } catch (e) { toast.error((e as Error).message); }
                  }}><Trash2 className="size-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
