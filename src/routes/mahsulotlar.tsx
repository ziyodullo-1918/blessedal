import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import {
  createProduct,
  deleteProduct,
  listCategories,
  listProducts,
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtMoney } from "@/lib/format";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/mahsulotlar")({
  component: () => (
    <AuthProvider>
      <RequireAuth>
        <Page />
      </RequireAuth>
    </AuthProvider>
  ),
});

function Page() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [catId, setCatId] = useState<string>("none");
  const [busy, setBusy] = useState(false);

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
      });
      setName("");
      setPrice("");
      setCatId("none");
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Mahsulotlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Mahsulotlar va birlik uchun narxlarni boshqarish
        </p>
      </div>

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
          </form>
        </CardContent>
      </Card>

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
                    <th className="py-3 pr-4 text-right">Narxi</th>
                    <th className="py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 font-medium">{p.name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {p.category?.name ?? "—"}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono">
                        {fmtMoney(p.price_per_unit)}
                      </td>
                      <td className="py-3">
                        <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
