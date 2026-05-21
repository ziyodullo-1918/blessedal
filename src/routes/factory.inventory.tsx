import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, AlertTriangle, Trash2, Edit, Package } from "lucide-react";
import { toast } from "sonner";
import {
  listMaterials, upsertMaterial, deleteMaterial, adjustStock,
  type Material,
} from "@/lib/factory/inventory";

const TYPES = ["leather", "fabric", "rubber", "thread", "glue", "accessory", "other"];

export const Route = createFileRoute("/factory/inventory")({
  component: () => <RequireAuth><InventoryPage /></RequireAuth>,
});

function InventoryPage() {
  const [mats, setMats] = useState<Material[]>([]);
  const [editing, setEditing] = useState<Material | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = async () => setMats(await listMaterials());

  useEffect(() => {
    refresh();
    const ch = supabase.channel("inv_mats")
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_materials" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const lowStock = mats.filter((m) => m.stock_quantity <= m.min_stock);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Xom ashyo ombori</h1>
          <p className="text-sm text-muted-foreground">Materiallar ro'yxati va zaxira holati</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-1" />Yangi material</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Materialni tahrirlash" : "Yangi material"}</DialogTitle></DialogHeader>
            <MaterialForm
              initial={editing}
              onDone={() => { setOpen(false); setEditing(null); refresh(); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-400" />
              Kam zaxira ogohlantirishi ({lowStock.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 text-sm">
              {lowStock.map((m) => (
                <span key={m.id} className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-200">
                  {m.name}: {m.stock_quantity}{m.unit} (min {m.min_stock}{m.unit})
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {mats.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Package className="mx-auto mb-2 size-8 opacity-40" />
              Materiallar yo'q. Birinchi materialni qo'shing.
            </div>
          ) : (
            <div className="divide-y">
              {mats.map((m) => (
                <MaterialRow
                  key={m.id}
                  mat={m}
                  onEdit={() => { setEditing(m); setOpen(true); }}
                  onChanged={refresh}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MaterialRow({ mat, onEdit, onChanged }: { mat: Material; onEdit: () => void; onChanged: () => void }) {
  const [delta, setDelta] = useState("");
  const low = mat.stock_quantity <= mat.min_stock;

  const apply = async (sign: 1 | -1) => {
    const n = Number(delta);
    if (!n || n <= 0) return;
    try {
      await adjustStock(mat.id, sign * n, sign === 1 ? "receive" : "writeoff");
      setDelta("");
      toast.success(sign === 1 ? "Kirim qilindi" : "Chiqim qilindi");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{mat.name}</span>
          <span className="text-xs text-muted-foreground">· {mat.material_type}</span>
          {low && <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">KAM</span>}
        </div>
        <div className="text-xs text-muted-foreground">
          Zaxira: <span className={low ? "text-amber-400 font-semibold" : "font-semibold text-foreground"}>{mat.stock_quantity}{mat.unit}</span>
          {" · "}Min: {mat.min_stock}{mat.unit}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number" min={0} step="0.01" placeholder={`Miqdor (${mat.unit})`}
          value={delta} onChange={(e) => setDelta(e.target.value)}
          className="w-32"
        />
        <Button size="sm" variant="outline" onClick={() => apply(1)}>+ Kirim</Button>
        <Button size="sm" variant="outline" onClick={() => apply(-1)}>− Chiqim</Button>
        <Button size="icon" variant="ghost" onClick={onEdit}><Edit className="size-4" /></Button>
        <Button size="icon" variant="ghost" onClick={async () => {
          if (!confirm(`${mat.name} o'chirilsinmi?`)) return;
          try { await deleteMaterial(mat.id); toast.success("O'chirildi"); onChanged(); }
          catch (e) { toast.error((e as Error).message); }
        }}><Trash2 className="size-4 text-red-400" /></Button>
      </div>
    </div>
  );
}

function MaterialForm({ initial, onDone }: { initial: Material | null; onDone: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    material_type: initial?.material_type ?? "leather",
    unit: initial?.unit ?? "m",
    stock_quantity: initial?.stock_quantity ?? 0,
    min_stock: initial?.min_stock ?? 0,
    notes: initial?.notes ?? "",
  });
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!form.name.trim()) return;
        setBusy(true);
        try {
          await upsertMaterial({
            id: initial?.id,
            name: form.name.trim(),
            material_type: form.material_type,
            unit: form.unit,
            stock_quantity: Number(form.stock_quantity),
            min_stock: Number(form.min_stock),
            notes: form.notes || null,
          });
          toast.success("Saqlandi");
          onDone();
        } catch (err) {
          toast.error((err as Error).message);
        } finally { setBusy(false); }
      }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Label>Nomi</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div>
          <Label>Tur</Label>
          <Select value={form.material_type} onValueChange={(v) => setForm({ ...form, material_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>O'lchov birligi</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="m, kg, dona" required /></div>
        <div><Label>Boshlang'ich zaxira</Label><Input type="number" min={0} step="0.01" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: Number(e.target.value) })} /></div>
        <div><Label>Min zaxira ogohlantirishi</Label><Input type="number" min={0} step="0.01" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} /></div>
        <div className="col-span-2"><Label>Izoh</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
      </div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Saqlanmoqda…" : "Saqlash"}</Button>
    </form>
  );
}
