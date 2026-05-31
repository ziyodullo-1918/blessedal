import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Package as PkgIcon, ImageIcon, Search, X } from "lucide-react";
import { toast } from "sonner";
import {
  listProducts, upsertProduct, deleteProduct, uploadProductImage,
  listProductRates, saveProductRate,
  CATEGORY_LABEL, RATE_DEPT_LABEL,
  parseColor, formatColor, colorLabel,
  type FactoryProduct, type ProductCategory, type RateDept, type ProductRate,
} from "@/lib/factory/products";

export const Route = createFileRoute("/factory/products")({
  component: () => <RequireAuth><ProductsPage /></RequireAuth>,
});

const CATEGORIES: ProductCategory[] = ["qish", "bahor_kuz", "yoz"];
const DEPTS: RateDept[] = ["laser", "sewing", "stretching", "packaging"];

function ProductsPage() {
  const [items, setItems] = useState<FactoryProduct[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<ProductCategory | "all">("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FactoryProduct | null>(null);

  const refresh = async () => setItems(await listProducts());

  useEffect(() => {
    refresh();
    const ch = supabase.channel("factory_products")
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_products" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((p) => {
      if (catFilter !== "all" && p.category !== catFilter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, catFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display tracking-tight">Mahsulotlar</h1>
          <p className="text-sm text-muted-foreground">
            Markaziy mahsulot katalogi — barcha bo'limlarda ko'rinadi
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}><Plus className="size-4 mr-1" />Yangi mahsulot</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</DialogTitle>
            </DialogHeader>
            <ProductForm
              editing={editing}
              onDone={() => { setOpen(false); setEditing(null); refresh(); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Mahsulot nomi bo'yicha qidiruv…"
            className="pl-9"
          />
        </div>
        <Select value={catFilter} onValueChange={(v) => setCatFilter(v as ProductCategory | "all")}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Barcha kategoriya</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            <PkgIcon className="mx-auto mb-2 size-8 opacity-40" />
            Hozircha mahsulotlar yo'q.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <Card key={p.id} className="overflow-hidden group">
              <div className="relative aspect-square bg-muted/40 overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="size-12 opacity-30" />
                  </div>
                )}
                {!p.active && (
                  <div className="absolute top-2 left-2 rounded bg-background/80 px-2 py-0.5 text-xs">
                    Faol emas
                  </div>
                )}
              </div>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold truncate">{p.name}</div>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {CATEGORY_LABEL[p.category]}
                  </Badge>
                </div>
                {p.colors.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.colors.slice(0, 6).map((c) => (
                      <span key={c} className="inline-block size-4 rounded-full border border-border" style={{ background: c }} title={c} />
                    ))}
                    {p.colors.length > 6 && (
                      <span className="text-xs text-muted-foreground">+{p.colors.length - 6}</span>
                    )}
                  </div>
                )}
                <div className="flex justify-end gap-1 pt-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={async () => {
                      if (!confirm(`"${p.name}" o'chirilsinmi?`)) return;
                      try { await deleteProduct(p.id); toast.success("O'chirildi"); refresh(); }
                      catch (e) { toast.error((e as Error).message); }
                    }}
                  >
                    <Trash2 className="size-4 text-red-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductForm({ editing, onDone }: { editing: FactoryProduct | null; onDone: () => void }) {
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState<ProductCategory>(editing?.category ?? "kuz_yoz");
  const [colors, setColors] = useState<string[]>(editing?.colors ?? []);
  const [newColor, setNewColor] = useState("#000000");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [imageUrl, setImageUrl] = useState<string | null>(editing?.image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rates, setRates] = useState<Record<RateDept, string>>({
    laser: "", sewing: "", stretching: "", packaging: "",
  });
  const [origRates, setOrigRates] = useState<Record<RateDept, number>>({
    laser: 0, sewing: 0, stretching: 0, packaging: 0,
  });

  useEffect(() => {
    if (!editing) return;
    listProductRates(editing.name).then((rs: ProductRate[]) => {
      const orig = { laser: 0, sewing: 0, stretching: 0, packaging: 0 } as Record<RateDept, number>;
      rs.forEach((r) => { orig[r.department] = r.rate_per_unit; });
      setOrigRates(orig);
      setRates({
        laser: orig.laser ? String(orig.laser) : "",
        sewing: orig.sewing ? String(orig.sewing) : "",
        stretching: orig.stretching ? String(orig.stretching) : "",
        packaging: orig.packaging ? String(orig.packaging) : "",
      });
    }).catch(() => {});
  }, [editing]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Fayl 5MB dan kichik bo'lsin"); return; }
    setUploading(true);
    try {
      const url = await uploadProductImage(file);
      setImageUrl(url);
      toast.success("Rasm yuklandi");
    } catch (err) { toast.error((err as Error).message); }
    finally { setUploading(false); e.target.value = ""; }
  }

  function addColor() {
    if (!newColor || colors.includes(newColor)) return;
    setColors([...colors, newColor]);
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        try {
          await upsertProduct({
            id: editing?.id,
            name: name.trim(),
            category, colors,
            image_url: imageUrl,
            notes: notes.trim() || null,
            active,
          });
          // Save dept rates
          for (const d of DEPTS) {
            const v = Number(rates[d]) || 0;
            if (v !== origRates[d]) {
              await saveProductRate(name.trim(), d, v);
            }
          }
          toast.success("Saqlandi");
          onDone();
        } catch (err) { toast.error((err as Error).message); }
        finally { setBusy(false); }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <div className="space-y-2">
          <Label>Rasm</Label>
          <div className="aspect-square rounded-md border bg-muted/30 overflow-hidden flex items-center justify-center">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="size-8 text-muted-foreground/40" />
            )}
          </div>
          <label className="block">
            <span className="sr-only">Rasm yuklash</span>
            <input type="file" accept="image/*" onChange={handleFile} disabled={uploading}
              className="block w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-primary-foreground file:text-xs" />
          </label>
          {imageUrl && (
            <Button type="button" size="sm" variant="outline" className="w-full"
              onClick={() => setImageUrl(null)}>
              <X className="size-3 mr-1" />Olib tashlash
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <Label>Mahsulot nomi</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="masalan: Oq Basanoshka" />
          </div>
          <div>
            <Label>Kategoriya</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as ProductCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ranglar</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {colors.length === 0 && (
                <span className="text-xs text-muted-foreground">Hali ranglar qo'shilmagan</span>
              )}
              {colors.map((c) => (
                <span key={c} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 py-1 pl-1 pr-2 text-xs">
                  <span className="inline-block size-4 rounded-full border" style={{ background: c }} />
                  {c}
                  <button type="button" onClick={() => setColors(colors.filter((x) => x !== c))}
                    className="rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)}
                className="h-9 w-12 rounded border bg-background" />
              <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="#000000" className="flex-1" />
              <Button type="button" variant="outline" onClick={addColor}>
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Bo'limlar bo'yicha narx (1 dona uchun, so'm)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Har bo'limning ishchisi bu mahsulotni tayyorlagani uchun oladigan haq.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEPTS.map((d) => (
            <div key={d} className="flex items-center gap-2">
              <Label className="w-20 text-sm">{RATE_DEPT_LABEL[d]}</Label>
              <Input
                type="number" min={0} step="100"
                value={rates[d]}
                onChange={(e) => setRates({ ...rates, [d]: e.target.value })}
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Izoh</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Faol
      </label>

      <Button type="submit" disabled={busy || uploading} className="w-full">
        {busy ? "Saqlanmoqda…" : "Saqlash"}
      </Button>
    </form>
  );
}
