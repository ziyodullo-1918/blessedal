import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import {
  listFormulas, listMaterials, upsertFormula, deleteFormula,
  type Formula, type Material,
} from "@/lib/factory/inventory";

export const Route = createFileRoute("/factory/formulas")({
  component: () => <RequireAuth><FormulasPage /></RequireAuth>,
});

function FormulasPage() {
  const [formulas, setFormulas] = useState<Formula[]>([]);
  const [mats, setMats] = useState<Material[]>([]);
  const [open, setOpen] = useState(false);
  const [presetProduct, setPresetProduct] = useState("");

  const refresh = async () => {
    const [f, m] = await Promise.all([listFormulas(), listMaterials()]);
    setFormulas(f); setMats(m);
  };

  useEffect(() => {
    refresh();
    const ch = supabase.channel("formulas")
      .on("postgres_changes", { event: "*", schema: "public", table: "product_formulas" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const grouped = useMemo(() => {
    const g = new Map<string, Formula[]>();
    formulas.forEach((f) => {
      if (!g.has(f.product_name)) g.set(f.product_name, []);
      g.get(f.product_name)!.push(f);
    });
    return [...g.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [formulas]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Mahsulot formulalari</h1>
          <p className="text-sm text-muted-foreground">Har bir mahsulot uchun bir dona ishlab chiqarishga kerakli materiallar</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPresetProduct(""); }}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-1" />Material qo'shish</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Formulaga material qo'shish</DialogTitle></DialogHeader>
            <FormulaForm materials={mats} presetProduct={presetProduct} onDone={() => { setOpen(false); refresh(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <FlaskConical className="mx-auto mb-2 size-8 opacity-40" />
            Formulalar yo'q. Buyurtmadagi mahsulot nomi bilan formula yarating.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {grouped.map(([product, items]) => (
            <Card key={product}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">{product}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => { setPresetProduct(product); setOpen(true); }}>
                  <Plus className="size-3 mr-1" />Material
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-2 rounded-md border bg-card/40 px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{f.material?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        Bir donaga: <span className="text-foreground font-semibold">{f.quantity_per_unit}{f.material?.unit}</span>
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={async () => {
                      if (!confirm("O'chirilsinmi?")) return;
                      try { await deleteFormula(f.id); refresh(); }
                      catch (e) { toast.error((e as Error).message); }
                    }}>
                      <Trash2 className="size-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function FormulaForm({ materials, presetProduct, onDone }: {
  materials: Material[]; presetProduct: string; onDone: () => void;
}) {
  const [form, setForm] = useState({
    product_name: presetProduct,
    material_id: materials[0]?.id ?? "",
    quantity_per_unit: 1,
  });
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.product_name.trim() || !form.material_id || form.quantity_per_unit <= 0) return;
        setBusy(true);
        try {
          await upsertFormula({
            product_name: form.product_name.trim(),
            material_id: form.material_id,
            quantity_per_unit: Number(form.quantity_per_unit),
          });
          toast.success("Saqlandi");
          onDone();
        } catch (err) {
          toast.error((err as Error).message);
        } finally { setBusy(false); }
      }}
    >
      <div>
        <Label>Mahsulot nomi</Label>
        <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} required placeholder="masalan: Oq Basanoshka" />
        <p className="mt-1 text-xs text-muted-foreground">Buyurtma yaratganda kiritilgan mahsulot nomi bilan to'liq mos kelishi kerak.</p>
      </div>
      <div>
        <Label>Material</Label>
        <Select value={form.material_id} onValueChange={(v) => setForm({ ...form, material_id: v })}>
          <SelectTrigger><SelectValue placeholder="Material tanlang" /></SelectTrigger>
          <SelectContent>
            {materials.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Bir dona uchun miqdor</Label>
        <Input type="number" min={0} step="0.001" value={form.quantity_per_unit}
          onChange={(e) => setForm({ ...form, quantity_per_unit: Number(e.target.value) })} required />
      </div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Saqlanmoqda…" : "Saqlash"}</Button>
    </form>
  );
}
