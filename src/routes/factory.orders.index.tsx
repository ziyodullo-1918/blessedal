import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createOrder, listOrders, type FactoryOrder } from "@/lib/factory/data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/factory/order-flow";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/factory/orders/")({
  component: () => <RequireAuth><OrdersPage /></RequireAuth>,
});

function OrdersPage() {
  const [orders, setOrders] = useState<FactoryOrder[]>([]);
  const [open, setOpen] = useState(false);

  const refresh = async () => setOrders(await listOrders());

  useEffect(() => {
    refresh();
    const ch = supabase.channel("orders_list")
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_orders" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Buyurtmalar</h1>
          <p className="text-sm text-muted-foreground">Barcha mijoz buyurtmalari</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1" />Yangi buyurtma</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Yangi buyurtma</DialogTitle></DialogHeader>
            <NewOrderForm onDone={() => { setOpen(false); refresh(); }} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Buyurtmalar yo'q. Birinchi buyurtmani yarating.</div>
          ) : (
            <div className="divide-y">
              {orders.map((o) => (
                <Link
                  key={o.id}
                  to="/factory/orders/$id"
                  params={{ id: o.id }}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-accent/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{o.order_number}</span>
                      <span className="font-medium">{o.product_name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {o.customer_name} · {o.total_quantity} dona
                      {o.color ? ` · ${o.color}` : ""}{o.size ? ` · ${o.size}` : ""}
                      {o.due_date ? ` · ${o.due_date}` : ""}
                    </div>
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewOrderForm({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    customer_name: "", product_name: "", color: "", size: "",
    total_quantity: 1, due_date: "", priority: 0, notes: "",
  });
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.customer_name || !form.product_name || form.total_quantity < 1) return;
        setBusy(true);
        try {
          await createOrder({
            customer_name: form.customer_name,
            product_name: form.product_name,
            color: form.color || null,
            size: form.size || null,
            total_quantity: form.total_quantity,
            due_date: form.due_date || null,
            priority: form.priority,
            notes: form.notes || null,
          });
          toast.success("Buyurtma yaratildi — Laser bo'limiga yuborildi");
          onDone();
        } catch (err) {
          toast.error((err as Error).message);
        } finally { setBusy(false); }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Mijoz</Label>
          <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
        </div>
        <div className="col-span-2">
          <Label>Mahsulot turi</Label>
          <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required placeholder="masalan: Oq Basanoshka" />
        </div>
        <div><Label>Rang</Label><Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
        <div><Label>O'lchamlar</Label><Input value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} placeholder="39, 40, 41" /></div>
        <div><Label>Jami soni (juft/dona)</Label><Input type="number" min={1} value={form.total_quantity} onChange={(e) => setForm({ ...form, total_quantity: Number(e.target.value) })} required /></div>
        <div><Label>Muddat</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
        <div className="col-span-2">
          <Label>Muhimlik darajasi (0–10)</Label>
          <Input type="number" min={0} max={10} value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
        </div>
        <div className="col-span-2"><Label>Izoh</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Yaratilmoqda…" : "Yaratish"}</Button>
    </form>
  );
}
