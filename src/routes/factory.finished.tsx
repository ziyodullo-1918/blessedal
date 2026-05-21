import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { listFinished, type FinishedItem } from "@/lib/factory/salary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/factory/finished")({
  component: () => <RequireAuth><FinishedPage /></RequireAuth>,
});

function FinishedPage() {
  const [items, setItems] = useState<FinishedItem[]>([]);
  const [q, setQ] = useState("");

  const refresh = async () => setItems(await listFinished());
  useEffect(() => {
    refresh();
    const ch = supabase.channel("finished_inv")
      .on("postgres_changes", { event: "*", schema: "public", table: "finished_inventory" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = q.trim()
    ? items.filter((i) => `${i.product_name} ${i.color ?? ""} ${i.size ?? ""}`.toLowerCase().includes(q.toLowerCase()))
    : items;

  const totals = filtered.reduce((a, i) => ({ qty: a.qty + i.quantity, dmg: a.dmg + i.damaged_quantity }), { qty: 0, dmg: 0 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Tayyor mahsulot ombori</h1>
        <p className="text-sm text-muted-foreground">Qadoqlangan mahsulotlar ro'yxati</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Jami dona</div><div className="text-2xl font-semibold">{totals.qty.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Brak</div><div className="text-2xl font-semibold text-red-400">{totals.dmg.toLocaleString()}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Yozuvlar</div><div className="text-2xl font-semibold">{filtered.length}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>Tayyor mahsulotlar</CardTitle>
          <Input className="max-w-xs" placeholder="Qidirish (mahsulot, rang, o'lcham)" value={q} onChange={(e) => setQ(e.target.value)} />
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Hozircha tayyor mahsulot yo'q.</div>
          ) : (
            <div className="divide-y text-sm">
              {filtered.map((i) => (
                <div key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{i.product_name}{i.color ? ` · ${i.color}` : ""}{i.size ? ` · ${i.size}` : ""}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(i.packaged_at).toLocaleString()} {i.order_id && (
                        <>· <Link to="/factory/orders/$id" params={{ id: i.order_id }} className="hover:text-foreground">Buyurtma</Link></>
                      )}
                      {i.note ? ` · ${i.note}` : ""}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{i.quantity} dona</div>
                    {i.damaged_quantity > 0 && <div className="text-xs text-red-400">Brak: {i.damaged_quantity}</div>}
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
