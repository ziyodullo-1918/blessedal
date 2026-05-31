import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogOut, Boxes } from "lucide-react";
import {
  packagingWorkerName, packagingWorkerToken, packagingWorkerLogout,
  packagingWorkerTasks, packagingWorkerPack, packagingWorkerToday,
  type PackagingWorkerTask,
} from "@/lib/factory/packaging";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/factory/packaging/worker")({
  component: Page,
});

function Page() {
  const nav = useNavigate();
  const [name, setName] = useState<string | null>(null);
  const [tasks, setTasks] = useState<PackagingWorkerTask[]>([]);
  const [today, setToday] = useState({ total_units: 0, total_amount: 0 });

  const refresh = async () => {
    try {
      setTasks(await packagingWorkerTasks());
      setToday(await packagingWorkerToday());
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("invalid_session") || msg === "not_logged_in") {
        nav({ to: "/factory/packaging/worker-login" });
      }
    }
  };

  useEffect(() => {
    if (!packagingWorkerToken()) { nav({ to: "/factory/packaging/worker-login" }); return; }
    setName(packagingWorkerName());
    refresh();
    const ch = supabase.channel("pkg_worker")
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_stages", filter: "department=eq.packaging" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await packagingWorkerLogout();
    nav({ to: "/factory/packaging/worker-login" });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Boxes className="size-6 text-primary" />
          <div className="flex-1">
            <div className="font-display text-lg leading-none">Qadoq kabineti</div>
            <div className="text-xs text-muted-foreground">{name}</div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}><LogOut className="size-4" />Chiqish</Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <Card>
          <CardContent className="grid grid-cols-2 gap-3 py-4 text-center">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Bugun qadoqlandi</div>
              <div className="text-2xl font-display mt-1">{today.total_units.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Bugungi daromad</div>
              <div className="text-2xl font-display mt-1">{today.total_amount.toLocaleString()} so'm</div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Topshiriqlar ({tasks.length})</h2>
          {tasks.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Hozircha topshiriq yo'q.</CardContent></Card>
          ) : (
            tasks.map((t) => <TaskRow key={t.stage_id} task={t} onChanged={refresh} />)
          )}
        </div>
      </main>
    </div>
  );
}

function TaskRow({ task, onChanged }: { task: PackagingWorkerTask; onChanged: () => void }) {
  const [qty, setQty] = useState("");
  const [dmg, setDmg] = useState("");
  const [busy, setBusy] = useState(false);
  const remaining = task.planned - task.completed - task.rejected;
  const pct = task.planned > 0 ? Math.round((task.completed / task.planned) * 100) : 0;

  const submit = async () => {
    const q = Number(qty) || 0; const d = Number(dmg) || 0;
    if (q <= 0 && d <= 0) return;
    setBusy(true);
    try {
      await packagingWorkerPack(task.stage_id, q, d);
      setQty(""); setDmg("");
      toast.success("Saqlandi");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{task.product_name}{task.color ? ` · ${task.color}` : ""}</CardTitle>
        <div className="text-xs text-muted-foreground font-mono">{task.order_number}</div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-muted-foreground">
          {task.completed}/{task.planned} · Brak: {task.rejected} · Qoldi: {remaining}
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input type="number" min={0} placeholder="+Qadoqlandi" value={qty} onChange={(e) => setQty(e.target.value)} />
          <Input type="number" min={0} placeholder="+Brak" value={dmg} onChange={(e) => setDmg(e.target.value)} />
          <Button size="sm" disabled={busy} onClick={submit}>OK</Button>
        </div>
      </CardContent>
    </Card>
  );
}
