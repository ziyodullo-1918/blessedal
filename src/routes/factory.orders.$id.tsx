import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEPT_LABEL, STATUS_LABEL, getOrder, listStagesByOrder, reportProgress, setStageStatus,
  type FactoryOrder, type FactoryStage, type StageStatus,
} from "@/lib/factory/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrderFlow, StatusBadge } from "@/components/factory/order-flow";
import { MaterialRequirements } from "@/components/factory/material-requirements";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/factory/orders/$id")({
  component: () => <RequireAuth><OrderDetail /></RequireAuth>,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<FactoryOrder | null>(null);
  const [stages, setStages] = useState<FactoryStage[]>([]);

  const refresh = async () => {
    const [o, s] = await Promise.all([getOrder(id), listStagesByOrder(id)]);
    setOrder(o); setStages(s);
  };

  useEffect(() => {
    refresh();
    const ch = supabase.channel(`order_${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_orders", filter: `id=eq.${id}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_stages", filter: `order_id=eq.${id}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  if (!order) return <div className="p-6 text-muted-foreground">Yuklanmoqda…</div>;

  return (
    <div className="space-y-6">
      <Link to="/factory/orders" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />Buyurtmalar
      </Link>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-mono text-xs text-muted-foreground">{order.order_number}</div>
          <h1 className="text-3xl font-display tracking-tight">{order.product_name}</h1>
          <p className="text-sm text-muted-foreground">
            {order.customer_name} · {order.total_quantity} dona
            {order.color ? ` · ${order.color}` : ""}{order.size ? ` · ${order.size}` : ""}
            {order.due_date ? ` · Muddat: ${order.due_date}` : ""}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <Card>
        <CardHeader><CardTitle>Ishlab chiqarish jarayoni</CardTitle></CardHeader>
        <CardContent><OrderFlow stages={stages} /></CardContent>
      </Card>

      <MaterialRequirements orderId={order.id} onConsumed={refresh} />

      <div className="grid gap-3 lg:grid-cols-2">
        {stages.map((s) => <StageCard key={s.id} stage={s} />)}
      </div>

      {order.notes && (
        <Card>
          <CardHeader><CardTitle>Izoh</CardTitle></CardHeader>
          <CardContent className="text-sm">{order.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}

function StageCard({ stage }: { stage: FactoryStage }) {
  const [done, setDone] = useState("");
  const [rej, setRej] = useState("");
  const [busy, setBusy] = useState(false);
  const remaining = stage.planned_quantity - stage.completed_quantity - stage.rejected_quantity;
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
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const changeStatus = async (status: StageStatus) => {
    try {
      await setStageStatus(stage.id, status);
      toast.success("Holat o'zgartirildi");
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{stage.sequence_no}. {DEPT_LABEL[stage.department]}</CardTitle>
          <StatusBadge status={stage.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div><div className="text-xs text-muted-foreground">Reja</div><div className="font-medium">{stage.planned_quantity}</div></div>
          <div><div className="text-xs text-muted-foreground">Bajarildi</div><div className="font-medium text-emerald-400">{stage.completed_quantity}</div></div>
          <div><div className="text-xs text-muted-foreground">Brak</div><div className="font-medium text-red-400">{stage.rejected_quantity}</div></div>
        </div>
        <div className="text-xs text-muted-foreground">Qoldi: {remaining}</div>

        {stage.status !== "completed" && (
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
            <Input type="number" min={0} placeholder="+Bajarildi" value={done} onChange={(e) => setDone(e.target.value)} />
            <Input type="number" min={0} placeholder="+Brak" value={rej} onChange={(e) => setRej(e.target.value)} />
            <Button size="sm" disabled={busy} onClick={submit}>Saqlash</Button>
          </div>
        )}

        <Select value={stage.status} onValueChange={(v) => changeStatus(v as StageStatus)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABEL) as StageStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
