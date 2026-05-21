import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEPT_FLOW, DEPT_LABEL, listStagesByDept, reportProgress,
  type FactoryDept, type FactoryOrder, type FactoryStage,
} from "@/lib/factory/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/factory/order-flow";
import { toast } from "sonner";

const VALID_DEPTS: FactoryDept[] = ["laser", "packaging", "warehouse", "delivery"];

export const Route = createFileRoute("/factory/dept/$dept")({
  component: () => <RequireAuth><DeptPage /></RequireAuth>,
});

function DeptPage() {
  const { dept } = useParams({ from: "/factory/dept/$dept" });
  const department = dept as FactoryDept;
  const [rows, setRows] = useState<(FactoryStage & { order: FactoryOrder })[]>([]);
  const valid = VALID_DEPTS.includes(department) || DEPT_FLOW.includes(department);

  useEffect(() => {
    if (!valid) return;
    const refresh = async () => setRows(await listStagesByDept(department));
    refresh();
    const ch = supabase.channel(`dept_${department}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_stages", filter: `department=eq.${department}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_orders" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [department, valid]);

  if (!valid) return <div className="p-6">Noma'lum bo'lim</div>;

  const refresh = async () => setRows(await listStagesByDept(department));
  const pending = rows.filter((r) => r.status !== "completed");
  const done = rows.filter((r) => r.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">{DEPT_LABEL[department]} bo'limi</h1>
        <p className="text-sm text-muted-foreground">Vazifalar avtomatik tarzda oldingi bosqichdan keladi</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Faol vazifalar ({pending.length})</h2>
        {pending.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Faol vazifalar yo'q.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((r) => <TaskCard key={r.id} stage={r} onChanged={refresh} />)}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tugatilgan ({done.length})</h2>
          <Card>
            <CardContent className="p-0 divide-y">
              {done.slice(0, 20).map((r) => (
                <Link key={r.id} to="/factory/orders/$id" params={{ id: r.order_id }}
                  className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-accent/40 text-sm">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{r.order.order_number}</span>{" "}
                    <span>{r.order.product_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {r.completed_quantity}/{r.planned_quantity}
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function TaskCard({ stage, onChanged }: { stage: FactoryStage & { order: FactoryOrder }; onChanged: () => void }) {
  const [done, setDone] = useState("");
  const [rej, setRej] = useState("");
  const [busy, setBusy] = useState(false);
  const pct = stage.planned_quantity > 0
    ? Math.round((stage.completed_quantity / stage.planned_quantity) * 100) : 0;

  const submit = async () => {
    const d = Number(done) || 0; const r = Number(rej) || 0;
    if (d <= 0 && r <= 0) return;
    setBusy(true);
    try {
      await reportProgress(stage.id, d, r);
      setDone(""); setRej("");
      toast.success("Yangilandi");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{stage.order.product_name}</CardTitle>
            <div className="text-xs text-muted-foreground truncate">
              <Link to="/factory/orders/$id" params={{ id: stage.order_id }} className="hover:text-foreground">
                {stage.order.order_number}
              </Link>
              {" · "}{stage.order.customer_name}
              {stage.order.color ? ` · ${stage.order.color}` : ""}
            </div>
          </div>
          <StatusBadge status={stage.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="text-xs text-muted-foreground">
          {stage.completed_quantity} / {stage.planned_quantity} · Brak: {stage.rejected_quantity}
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Input type="number" min={0} placeholder="+Bajarildi" value={done} onChange={(e) => setDone(e.target.value)} />
          <Input type="number" min={0} placeholder="+Brak" value={rej} onChange={(e) => setRej(e.target.value)} />
          <Button size="sm" disabled={busy} onClick={submit}>OK</Button>
        </div>
      </CardContent>
    </Card>
  );
}
