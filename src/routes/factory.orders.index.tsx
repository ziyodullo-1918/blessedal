import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createOrder, deleteOrder, listOrders, type FactoryOrder } from "@/lib/factory/data";
import { listProducts, parseColor, colorLabel, type FactoryProduct } from "@/lib/factory/products";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/factory/order-flow";
import { Plus, Trash2 } from "lucide-react";
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
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_stages" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const cancel = async (o: FactoryOrder) => {
    if (!confirm(`"${o.order_number}" buyurtmasi bekor qilinsinmi? Bu amal qaytmaydi.`)) return;
    try {
      await deleteOrder(o.id);
      toast.success("Buyurtma bekor qilindi");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Buyurtmalar</h1>
          <p className="text-sm text-muted-foreground">Barcha mijoz buyurtmalari · real vaqt holati</p>
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
                <div key={o.id} className="flex items-center gap-2 px-4 py-3 hover:bg-accent/40">
                  <Link
                    to="/factory/orders/$id"
                    params={{ id: o.id }}
                    className="flex flex-1 items-center justify-between gap-4 min-w-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{o.order_number}</span>
                        <span className="font-medium">{o.product_name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {o.customer_name} · {o.total_quantity} dona
                        {o.color ? ` · ${o.color}` : ""}
                        {o.due_date ? ` · ${o.due_date}` : ""}
                      </div>
                    </div>
                    <StatusBadge status={o.status} />
                  </Link>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground hover:text-red-500"
                    title="Bekor qilish"
                    onClick={() => cancel(o)}
                  >
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

function NewOrderForm({ onDone }: { onDone: () => void }) {
  const [products, setProducts] = useState<FactoryProduct[]>([]);
  const [form, setForm] = useState({
    customer_name: "", product_id: "", color: "",
    total_quantity: 1, due_date: "", notes: "",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => { listProducts().then(setProducts).catch(() => {}); }, []);
  const selected = useMemo(() => products.find((p) => p.id === form.product_id) ?? null, [products, form.product_id]);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.customer_name || !selected || form.total_quantity < 1) {
          toast.error("Mijoz va mahsulotni tanlang");
          return;
        }
        setBusy(true);
        try {
          await createOrder({
            customer_name: form.customer_name,
            product_name: selected.name,
            color: form.color ? colorLabel(form.color) : null,
            size: null,
            total_quantity: form.total_quantity,
            due_date: form.due_date || null,
            priority: 0,
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
          <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v, color: "" })}>
            <SelectTrigger><SelectValue placeholder="Ro'yhatdan tanlang" /></SelectTrigger>
            <SelectContent>
              {products.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Avval Mahsulotlar bo'limida qo'shing</div>}
              {products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Rang</Label>
          <Select value={form.color} onValueChange={(v) => setForm({ ...form, color: v })} disabled={!selected}>
            <SelectTrigger><SelectValue placeholder={selected ? "Rangni tanlang" : "Avval mahsulotni tanlang"} /></SelectTrigger>
            <SelectContent>
              {(selected?.colors ?? []).map((c) => {
                const p = parseColor(c);
                return (
                  <SelectItem key={c} value={c}>
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block size-3 rounded-full border" style={{ background: p.hex }} />
                      {colorLabel(c)}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Jami soni (juft/dona)</Label><Input type="number" min={1} value={form.total_quantity} onChange={(e) => setForm({ ...form, total_quantity: Number(e.target.value) })} required /></div>
        <div><Label>Muddat</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
        <div className="col-span-2"><Label>Izoh</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Yaratilmoqda…" : "Yaratish"}</Button>
    </form>
  );
}
