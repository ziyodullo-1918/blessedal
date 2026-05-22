import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEPT_LABEL, deleteOrder, getOrder, listStagesByOrder,
  type FactoryOrder, type FactoryStage,
} from "@/lib/factory/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OrderFlow, StatusBadge } from "@/components/factory/order-flow";
import { MaterialRequirements } from "@/components/factory/material-requirements";
import { ArrowLeft, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/factory/orders/$id")({
  component: () => <RequireAuth><OrderDetail /></RequireAuth>,
});

function OrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
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

  const cancel = async () => {
    if (!confirm(`"${order.order_number}" buyurtmasi bekor qilinsinmi? Bu amal qaytmaydi.`)) return;
    try {
      await deleteOrder(order.id);
      toast.success("Buyurtma bekor qilindi");
      navigate({ to: "/factory/orders" });
    } catch (e) { toast.error((e as Error).message); }
  };

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
            {order.color ? ` · ${order.color}` : ""}
            {order.due_date ? ` · Muddat: ${order.due_date}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={cancel}>
            <Trash2 className="size-4 mr-1" />Bekor qilish
          </Button>
        </div>
      </div>

      <div className="rounded-md border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground flex items-center gap-2">
        <Eye className="size-4" />
        Buyurtmalar bo'limi faqat kuzatish uchun — barcha amallar tegishli bo'limlar tomonidan bajariladi.
      </div>

      <Card>
        <CardHeader><CardTitle>Ishlab chiqarish jarayoni</CardTitle></CardHeader>
        <CardContent><OrderFlow stages={stages} /></CardContent>
      </Card>

      <MaterialRequirements orderId={order.id} />

      <div className="grid gap-3 lg:grid-cols-2">
        {stages.map((s) => <StageView key={s.id} stage={s} />)}
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

function StageView({ stage }: { stage: FactoryStage }) {
  const remaining = stage.planned_quantity - stage.completed_quantity - stage.rejected_quantity;
  const pct = stage.planned_quantity > 0
    ? Math.round((stage.completed_quantity / stage.planned_quantity) * 100) : 0;
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
          <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div><div className="text-xs text-muted-foreground">Reja</div><div className="font-medium">{stage.planned_quantity}</div></div>
          <div><div className="text-xs text-muted-foreground">Bajarildi</div><div className="font-medium text-emerald-400">{stage.completed_quantity}</div></div>
          <div><div className="text-xs text-muted-foreground">Brak</div><div className="font-medium text-red-400">{stage.rejected_quantity}</div></div>
        </div>
        <div className="text-xs text-muted-foreground">Qoldi: {remaining}</div>
      </CardContent>
    </Card>
  );
}
