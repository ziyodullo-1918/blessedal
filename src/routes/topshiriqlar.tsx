import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import {
  completeAssignment,
  createAssignment,
  deleteAssignment,
  listAssignments,
  listProducts,
  listWorkers,
  type Assignment,
  type Product,
  type Worker,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtMoney } from "@/lib/format";

export const Route = createFileRoute("/topshiriqlar")({
  component: () => (
    <AuthProvider>
      <RequireAuth>
        <Page />
      </RequireAuth>
    </AuthProvider>
  ),
});

function Page() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<"all" | "in_progress" | "completed">("in_progress");

  const [workerId, setWorkerId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [a, w, p] = await Promise.all([
      listAssignments(tab === "all" ? undefined : { status: tab }),
      listWorkers(),
      listProducts(),
    ]);
    setItems(a);
    setWorkers(w);
    setProducts(p);
  }
  useEffect(() => {
    load().catch(console.error);
  }, [tab]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );
  const previewSalary =
    selectedProduct && qty ? Number(selectedProduct.price_per_unit) * Number(qty) : 0;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const q = parseInt(qty);
    if (!workerId || !productId || isNaN(q) || q <= 0) {
      toast.error("Ishchi, mahsulot va miqdorni kiriting");
      return;
    }
    setBusy(true);
    try {
      await createAssignment({ worker_id: workerId, product_id: productId, quantity: q });
      setWorkerId("");
      setProductId("");
      setQty("");
      await load();
      toast.success("Topshiriq berildi");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function complete(id: string) {
    try {
      await completeAssignment(id);
      await load();
      toast.success("Bajarildi deb belgilandi");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Topshiriqni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteAssignment(id);
      await load();
      toast.success("O'chirildi");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Topshiriqlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ishchiga yarim tayyor mahsulot berish va bajarilishini kuzatish
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yangi topshiriq</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Ishchi</Label>
              <Select value={workerId} onValueChange={setWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {workers.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mahsulot</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {fmtMoney(p.price_per_unit)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Miqdor (dona)</Label>
              <Input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="50"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hisoblangan maosh</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 font-mono text-sm">
                {fmtMoney(previewSalary)}
              </div>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={busy}>
                <Plus className="size-4" /> Berish
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="in_progress">Jarayonda</TabsTrigger>
          <TabsTrigger value="completed">Bajarilgan</TabsTrigger>
          <TabsTrigger value="all">Hammasi</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Topshiriqlar yo'q.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-4 py-3">Ishchi</th>
                    <th className="px-4 py-3">Mahsulot</th>
                    <th className="px-4 py-3 text-right">Miqdor</th>
                    <th className="px-4 py-3 text-right">Maosh</th>
                    <th className="px-4 py-3">Boshlandi</th>
                    <th className="px-4 py-3">Tugadi</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3 w-32"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((a) => {
                    const salary = a.quantity * Number(a.unit_price);
                    return (
                      <tr key={a.id} className="border-b last:border-0">
                        <td className="px-4 py-3 font-medium">{a.worker?.full_name ?? "—"}</td>
                        <td className="px-4 py-3">{a.product?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-mono">{a.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono">{fmtMoney(salary)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(a.started_at)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(a.completed_at)}</td>
                        <td className="px-4 py-3">
                          {a.status === "completed" ? (
                            <Badge className="bg-success text-success-foreground hover:bg-success">Bajarildi</Badge>
                          ) : (
                            <Badge variant="outline" className="border-warning text-warning">Jarayonda</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {a.status === "in_progress" && (
                              <Button variant="ghost" size="sm" onClick={() => complete(a.id)}>
                                <CheckCircle2 className="size-4 text-success" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
