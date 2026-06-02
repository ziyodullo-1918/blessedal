import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Boxes, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { listWorkers, type FactoryWorker } from "@/lib/factory/data";
import { listProducts, parseColor, colorLabel, type FactoryProduct } from "@/lib/factory/products";
import { recordPackagingBox, listPackagingEntries, deletePackagingEntry, type PackagingBoxEntry } from "@/lib/factory/packaging";

export const Route = createFileRoute("/factory/packaging/tasks")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

function Page() {
  const today = new Date();
  const [workers, setWorkers] = useState<FactoryWorker[]>([]);
  const [products, setProducts] = useState<FactoryProduct[]>([]);
  const [workerId, setWorkerId] = useState<string>("");
  const [productId, setProductId] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [boxes, setBoxes] = useState<string>("1");
  const [workDate, setWorkDate] = useState(isoDay(today));
  const [busy, setBusy] = useState(false);
  const [entries, setEntries] = useState<PackagingBoxEntry[]>([]);

  const refresh = async () => {
    const monthStart = isoDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const monthEnd = isoDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    setEntries(await listPackagingEntries(monthStart, monthEnd));
  };

  useEffect(() => {
    (async () => {
      const [w, p] = await Promise.all([listWorkers("packaging"), listProducts()]);
      setWorkers(w);
      setProducts(p);
    })();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId) ?? null, [products, productId]);

  useEffect(() => {
    // Reset color when product changes
    setColor("");
  }, [productId]);

  const submit = async () => {
    if (!workerId) return toast.error("Ishchini tanlang");
    if (!productId) return toast.error("Mahsulotni tanlang");
    const b = Number(boxes);
    if (!b || b <= 0) return toast.error("Karobkalar soni noto'g'ri");
    setBusy(true);
    try {
      await recordPackagingBox({ worker_id: workerId, product_id: productId, color: color || null, boxes: b, work_date: workDate });
      toast.success(`${b} karobka qadoqlandi va tayyor omborga qo'shildi`);
      setBoxes("1");
      refresh();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const todayEntries = entries.filter((e) => e.work_date === isoDay(today));
  const todayTotalUnits = todayEntries.reduce((a, e) => a + e.units, 0);
  const todayTotalAmount = todayEntries.reduce((a, e) => a + Number(e.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight flex items-center gap-2"><Boxes className="size-7 text-primary" />Qadoq — Topshiriqlar</h1>
        <p className="text-sm text-muted-foreground">Har bir karobka = mahsulotning karobka sig'imi (juftlar soni). Qadoqlangan mahsulot avtomatik omborga qo'shiladi.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Yangi qadoqlash yozuvi</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Label>Ishchi</Label>
            <Select value={workerId} onValueChange={setWorkerId}>
              <SelectTrigger><SelectValue placeholder="Ishchini tanlang" /></SelectTrigger>
              <SelectContent>
                {workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-2">
            <Label>Mahsulot</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger><SelectValue placeholder="Mahsulotni tanlang" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.pack_box_size} juft/karobka)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rang</Label>
            <Select value={color} onValueChange={setColor} disabled={!selectedProduct}>
              <SelectTrigger><SelectValue placeholder={selectedProduct ? "Rang" : "—"} /></SelectTrigger>
              <SelectContent>
                {(selectedProduct?.colors ?? []).map((c) => {
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
          <div>
            <Label>Karobkalar</Label>
            <Input type="number" min={1} value={boxes} onChange={(e) => setBoxes(e.target.value)} />
          </div>
          <div className="lg:col-span-2">
            <Label>Sana</Label>
            <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </div>
          <div className="lg:col-span-4 flex items-end">
            <div className="text-sm text-muted-foreground flex-1">
              {selectedProduct && Number(boxes) > 0 && (
                <>= <b className="text-foreground">{Number(boxes) * selectedProduct.pack_box_size}</b> juft</>
              )}
            </div>
            <Button onClick={submit} disabled={busy} className="ml-auto">
              <PackageCheck className="size-4 mr-1" />Saqlash
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Bugungi yozuvlar</CardTitle>
          <div className="text-sm font-semibold">{todayTotalUnits.toLocaleString()} juft · {todayTotalAmount.toLocaleString()} so'm</div>
        </CardHeader>
        <CardContent className="p-0">
          {todayEntries.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Bugun hali yozuv yo'q.</div>
          ) : (
            <div className="divide-y">
              {todayEntries.map((e) => {
                const cp = e.color ? parseColor(e.color) : null;
                const wn = workers.find((w) => w.id === e.worker_id)?.full_name ?? "—";
                return (
                  <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      {cp && <span className="inline-block size-4 rounded-full border shrink-0" style={{ background: cp.hex }} />}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{e.product_name} {e.color ? `· ${colorLabel(e.color)}` : ""}</div>
                        <div className="text-xs text-muted-foreground">{wn} · {e.boxes} karobka × {e.pairs_per_box} = {e.units} juft</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">{Number(e.total).toLocaleString()} so'm</div>
                      <Button size="icon" variant="ghost" onClick={async () => {
                        if (!confirm("Yozuv o'chirilsinmi?")) return;
                        try { await deletePackagingEntry(e.id); toast.success("O'chirildi"); refresh(); }
                        catch (err) { toast.error((err as Error).message); }
                      }}>
                        <Trash2 className="size-4 text-red-400" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
