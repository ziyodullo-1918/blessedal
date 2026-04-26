import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
  updateProduct,
  type Category,
  type Product,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/auth";
import { ColorVariantsEditor } from "@/components/ColorVariantsEditor";

export const Route = createFileRoute("/mahsulotlar")({
  component: Page,
});

function Page() {
  const confirm = useConfirm();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [catId, setCatId] = useState<string>("none");
  const [colors, setColors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eName, setEName] = useState("");
  const [ePrice, setEPrice] = useState("");
  const [eCatId, setECatId] = useState<string>("none");
  const [eColors, setEColors] = useState<string[]>([]);

  async function load() {
    const [p, c] = await Promise.all([listProducts(), listCategories()]);
    setItems(p);
    setCats(c);
  }
  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = parseFloat(price);
    if (!name.trim() || isNaN(priceNum) || priceNum < 0) {
      toast.error("Iltimos, ma'lumotlarni to'g'ri kiriting");
      return;
    }
    setBusy(true);
    try {
      await createProduct({
        name: name.trim(),
        price_per_unit: priceNum,
        category_id: catId === "none" ? null : catId,
        colors,
      });
      setName("");
      setPrice("");
      setCatId("none");
      setColors([]);
      await load();
      toast.success("Mahsulot qo'shildi");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Mahsulotni o'chirasizmi?",
      description: "Bu amalni qaytarib bo'lmaydi.",
      confirmText: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(id);
      await load();
      toast.success("O'chirildi");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setEName(p.name);
    setEPrice(String(p.price_per_unit));
    setECatId(p.category_id ?? "none");
    setEColors(p.colors ?? []);
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: string) {
    const priceNum = parseFloat(ePrice);
    if (!eName.trim() || isNaN(priceNum) || priceNum < 0) {
      toast.error("Iltimos, ma'lumotlarni to'g'ri kiriting");
      return;
    }
    try {
      await updateProduct(id, {
        name: eName.trim(),
        price_per_unit: priceNum,
        category_id: eCatId === "none" ? null : eCatId,
        colors: eColors,
      });
      setEditingId(null);
      await load();
      toast.success("Saqlandi");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function toggleActive(p: Product, val: boolean) {
    try {
      await updateProduct(p.id, { is_active: val });
      setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: val } : x)));
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Mahsulotlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mahsulotlar va birlik uchun narxlarni boshqarish
        </p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Yangi mahsulot</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Nomi</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Ko'ylak A1" />
              </div>
              <div className="space-y-1.5">
                <Label>Narx (so'm / dona)</Label>
                <Input
                  type="number"
                  min="0"
                  step="100"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="15000"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Kategoriya</Label>
                <Select value={catId} onValueChange={setCatId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Yo'q —</SelectItem>
                    {cats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={busy}>
                  <Plus className="size-4" /> Qo'shish
                </Button>
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
                <Label>Ranglar (variantlar)</Label>
                <ColorVariantsEditor value={colors} onChange={setColors} />
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ro'yxat ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hali mahsulotlar yo'q.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-3 pr-4">Mahsulot</th>
                    <th className="py-3 pr-4">Kategoriya</th>
                    <th className="py-3 pr-4">Ranglar</th>
                    <th className="py-3 pr-4 text-right">Narxi</th>
                    <th className="py-3 pr-4">Faol</th>
                    {isAdmin && <th className="py-3 w-24"></th>}
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) =>
                    editingId === p.id ? (
                      <tr key={p.id} className="border-b last:border-0 bg-muted/30">
                        <td className="py-2 pr-4">
                          <Input value={eName} onChange={(e) => setEName(e.target.value)} />
                        </td>
                        <td className="py-2 pr-4">
                          <Select value={eCatId} onValueChange={setECatId}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">— Yo'q —</SelectItem>
                              {cats.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-4 min-w-[220px]">
                          <ColorVariantsEditor value={eColors} onChange={setEColors} />
                        </td>
                        <td className="py-2 pr-4">
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            value={ePrice}
                            onChange={(e) => setEPrice(e.target.value)}
                            className="text-right font-mono"
                          />
                        </td>
                        <td className="py-2 pr-4">
                          <Switch checked={p.is_active} onCheckedChange={(v) => toggleActive(p, v)} />
                        </td>
                        {isAdmin && (
                          <td className="py-2">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => saveEdit(p.id)}>
                                <Check className="size-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                <X className="size-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ) : (
                      <tr key={p.id} className={`border-b last:border-0 ${!p.is_active ? "opacity-50" : ""}`}>
                        <td className="py-3 pr-4 font-medium">
                          <div className="flex items-center gap-2">
                            {p.name}
                            {!p.is_active && <Badge variant="outline" className="text-xs">Nofaol</Badge>}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {p.category?.name ?? "—"}
                        </td>
                        <td className="py-3 pr-4">
                          {p.colors && p.colors.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {p.colors.map((c) => (
                                <span
                                  key={c}
                                  className="inline-block size-4 rounded-full border border-border"
                                  style={{ backgroundColor: c }}
                                  title={c}
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono">
                          {fmtMoney(p.price_per_unit)}
                        </td>
                        <td className="py-3 pr-4">
                          <Switch
                            checked={p.is_active}
                            onCheckedChange={(v) => toggleActive(p, v)}
                            disabled={!isAdmin}
                          />
                        </td>
                        {isAdmin && (
                          <td className="py-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                                <Pencil className="size-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
