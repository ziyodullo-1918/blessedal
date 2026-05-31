import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePackagingRate, listPackagingRates, upsertPackagingRate, type PackagingRate } from "@/lib/factory/packaging";

export const Route = createFileRoute("/factory/packaging/rates")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function Page() {
  const [rates, setRates] = useState<PackagingRate[]>([]);
  const [form, setForm] = useState({ product: "", rate: "" });

  const refresh = async () => setRates(await listPackagingRates());
  useEffect(() => { refresh(); }, []);

  const add = async () => {
    const r = Number(form.rate);
    if (!r || r <= 0) return toast.error("Narx kiriting");
    try {
      await upsertPackagingRate({ product_name: form.product.trim() || null, rate_per_unit: r });
      setForm({ product: "", rate: "" });
      toast.success("Saqlandi"); refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Qadoq — Tariflar</h1>
        <p className="text-sm text-muted-foreground">Mahsulot bo'yicha donaboshi narx. Bo'sh qoldirilsa — default (umumiy)</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Yangi tarif</CardTitle></CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[1fr_180px_auto]">
          <Input placeholder="Mahsulot nomi (bo'sh = default)" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
          <Input type="number" placeholder="So'm / dona" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
          <Button onClick={add}>Saqlash</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tariflar ({rates.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {rates.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Tarif yo'q.</div>
          ) : (
            <div className="divide-y">
              {rates.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{r.product_name ?? "Default (barcha mahsulot)"}</div>
                    <div className="text-xs text-muted-foreground">{Number(r.rate_per_unit).toLocaleString()} so'm/dona</div>
                  </div>
                  <Switch checked={r.active} onCheckedChange={async (v) => { await upsertPackagingRate({ id: r.id, product_name: r.product_name, rate_per_unit: r.rate_per_unit, active: v }); refresh(); }} />
                  <Button size="icon" variant="ghost" onClick={async () => { if (!confirm("O'chirilsinmi?")) return; await deletePackagingRate(r.id); refresh(); }}>
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
