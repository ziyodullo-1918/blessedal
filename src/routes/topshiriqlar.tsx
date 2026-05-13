import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import {
  completeAssignment,
  createAssignment,
  deleteAssignment,
  listAssignments,
  listAssignmentsByPeriod,
  listPayrollPeriods,
  listProducts,
  listWorkers,
  updateAssignment,
  type Assignment,
  type PayrollPeriod,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, History, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtMoney } from "@/lib/format";
import { useConfirm } from "@/components/ConfirmDialog";
import { ColorChip } from "@/components/ColorChip";

export const Route = createFileRoute("/topshiriqlar")({
  component: () => (
    <RequireAuth>
      <Page />
    </RequireAuth>
  ),
});

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function Page() {
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const confirm = useConfirm();

  const [items, setItems] = useState<Assignment[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tab, setTab] = useState<"all" | "in_progress" | "completed">("in_progress");
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>("");
  const [historyItems, setHistoryItems] = useState<Assignment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [workerId, setWorkerId] = useState("");
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [color, setColor] = useState("");
  const [startDate, setStartDate] = useState<string>(todayStr());
  const [busy, setBusy] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Edit state (admin only)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [eWorkerId, setEWorkerId] = useState("");
  const [eProductId, setEProductId] = useState("");
  const [eQty, setEQty] = useState("");
  const [eColor, setEColor] = useState("");
  const [eStartDate, setEStartDate] = useState("");

  async function load() {
    const [a, w, p, prs] = await Promise.all([
      listAssignments({
        status: tab === "all" ? undefined : tab,
        activePeriodOnly: true,
      }),
      listWorkers(),
      listProducts({ activeOnly: true }),
      listPayrollPeriods(),
    ]);
    setItems(a);
    setWorkers(w);
    setProducts(p);
    setPeriods(prs);
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

  // Reset color when product changes; preselect first variant if available
  useEffect(() => {
    if (!selectedProduct) {
      setColor("");
      return;
    }
    if (selectedProduct.colors && selectedProduct.colors.length > 0) {
      setColor(selectedProduct.colors[0]);
    } else {
      setColor("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const q = parseInt(qty);
    if (!workerId || !productId || isNaN(q) || q <= 0) {
      toast.error("Ishchi, mahsulot va miqdorni kiriting");
      return;
    }
    setBusy(true);
    try {
      // For admin, allow custom date. For founder, always now (current period).
      let startedAt: string | undefined;
      if (isAdmin && startDate) {
        // Use noon UTC to avoid TZ issues shifting the date
        startedAt = new Date(startDate + "T12:00:00Z").toISOString();
      }
      await createAssignment({
        worker_id: workerId,
        product_id: productId,
        quantity: q,
        started_at: startedAt,
        color: color || null,
      });
      setWorkerId("");
      setProductId("");
      setQty("");
      setColor("");
      setStartDate(todayStr());
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
    const ok = await confirm({
      title: "Topshiriqni o'chirasizmi?",
      description: "Bu amalni qaytarib bo'lmaydi.",
      confirmText: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteAssignment(id);
      await load();
      toast.success("O'chirildi");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function startEdit(a: Assignment) {
    setEditingId(a.id);
    setEWorkerId(a.worker_id);
    setEProductId(a.product_id);
    setEQty(String(a.quantity));
    setEColor(a.color ?? "");
    setEStartDate(a.started_at ? a.started_at.slice(0, 10) : "");
  }
  function cancelEdit() {
    setEditingId(null);
  }
  async function saveEdit(id: string) {
    const q = parseInt(eQty);
    if (!eWorkerId || !eProductId || isNaN(q) || q <= 0) {
      toast.error("Ma'lumotlarni to'g'ri kiriting");
      return;
    }
    try {
      await updateAssignment(id, {
        worker_id: eWorkerId,
        product_id: eProductId,
        quantity: q,
        color: eColor || null,
        started_at: eStartDate ? new Date(eStartDate + "T12:00:00Z").toISOString() : undefined,
      });
      setEditingId(null);
      await load();
      toast.success("Saqlandi");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  const editingProduct = useMemo(
    () => products.find((p) => p.id === eProductId),
    [products, eProductId],
  );

  const closedPeriods = useMemo(() => periods.filter((p) => p.closed_at), [periods]);

  async function loadHistoryItems(periodId: string) {
    setSelectedHistoryId(periodId);
    if (!periodId) {
      setHistoryItems([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const data = await listAssignmentsByPeriod(periodId);
      setHistoryItems(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl">Topshiriqlar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hozirgi davr — yarim tayyor mahsulot berish va bajarilishini kuzatish
          </p>
        </div>
        <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
              <History className="size-4" /> Davrlar tarixi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Davrlar tarixi</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Davrni tanlang</Label>
                <Select value={selectedHistoryId || undefined} onValueChange={loadHistoryItems}>
                  <SelectTrigger>
                    <SelectValue placeholder="Yopilgan davrlardan birini tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    {closedPeriods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        🔒 {p.label} · {p.start_date} → {p.end_date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="max-h-[55vh] overflow-y-auto rounded-md border">
                {historyLoading ? (
                  <p className="p-6 text-sm text-muted-foreground">Yuklanmoqda…</p>
                ) : !selectedHistoryId ? (
                  <p className="p-6 text-sm text-muted-foreground">Davr tanlang.</p>
                ) : historyItems.length === 0 ? (
                  <p className="p-6 text-sm text-muted-foreground">
                    Bu davrda topshiriqlar yo'q.
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2">Ishchi</th>
                        <th className="px-3 py-2">Mahsulot</th>
                        <th className="px-3 py-2 text-right">Miqdor</th>
                        <th className="px-3 py-2 text-right">Maosh</th>
                        <th className="px-3 py-2">Holat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyItems.map((it) => (
                        <tr key={it.id} className="border-b last:border-0">
                          <td className="px-3 py-2 font-medium">{it.worker?.full_name ?? "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{it.product?.name ?? "—"}</span>
                              <ColorChip color={it.color} name={it.color_name} />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{it.quantity}</td>
                          <td className="px-3 py-2 text-right font-mono">
                            {fmtMoney(it.quantity * Number(it.unit_price))}
                          </td>
                          <td className="px-3 py-2">
                            {it.status === "completed" ? (
                              <Badge className="bg-success text-success-foreground hover:bg-success">
                                Bajarildi
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-warning text-warning">
                                Jarayonda
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yangi topshiriq</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
            <div className="space-y-1.5">
              <Label>Ishchi</Label>
              <Select value={workerId || undefined} onValueChange={setWorkerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Ishchini tanlang" />
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
              <Select value={productId || undefined} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Mahsulotni tanlang" />
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
              <Label>Rang</Label>
              {selectedProduct && selectedProduct.colors && selectedProduct.colors.length > 0 ? (
                <Select value={color || undefined} onValueChange={setColor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rangni tanlang">
                      {color && (
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-4 rounded-full border"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-mono text-xs">{color}</span>
                        </span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProduct.colors.map((c) => (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block size-4 rounded-full border"
                            style={{ backgroundColor: c }}
                          />
                          <span className="font-mono text-xs">{c}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-xs text-muted-foreground">
                  {selectedProduct ? "Mahsulotda rang variantlari yo'q" : "Avval mahsulot tanlang"}
                </div>
              )}
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
              <Label>Sana {!isAdmin && <span className="text-xs text-muted-foreground">(bugun)</span>}</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={!isAdmin}
                title={!isAdmin ? "Faqat administrator sanani o'zgartira oladi" : undefined}
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
            <p className="p-6 text-sm text-muted-foreground">Hozirgi davrda topshiriqlar yo'q.</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
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
                      const isEditing = editingId === a.id;
                      if (isEditing && isAdmin) {
                        return (
                          <tr key={a.id} className="border-b bg-muted/30">
                            <td className="px-4 py-2">
                              <Select value={eWorkerId || undefined} onValueChange={setEWorkerId}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {workers.map((w) => (
                                    <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-2">
                              <div className="space-y-1">
                                <Select value={eProductId || undefined} onValueChange={(v) => { setEProductId(v); setEColor(""); }}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {products.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {editingProduct?.colors && editingProduct.colors.length > 0 && (
                                  <Select value={eColor || undefined} onValueChange={setEColor}>
                                    <SelectTrigger><SelectValue placeholder="Rang" /></SelectTrigger>
                                    <SelectContent>
                                      {editingProduct.colors.map((c) => (
                                        <SelectItem key={c} value={c}>
                                          <span className="flex items-center gap-2">
                                            <span className="inline-block size-4 rounded-full border" style={{ backgroundColor: c }} />
                                            <span className="font-mono text-xs">{c}</span>
                                          </span>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Input type="number" min="1" value={eQty} onChange={(e) => setEQty(e.target.value)} className="text-right font-mono w-20 ml-auto" />
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-muted-foreground">—</td>
                            <td className="px-4 py-2" colSpan={2}>
                              <Input type="date" value={eStartDate} onChange={(e) => setEStartDate(e.target.value)} />
                            </td>
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => saveEdit(a.id)}>
                                  <Check className="size-4 text-primary" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                  <X className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={a.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium">{a.worker?.full_name ?? "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span>{a.product?.name ?? "—"}</span>
                              <ColorChip color={a.color} name={a.color_name} />
                            </div>
                          </td>
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
                              {isAdmin && (
                                <Button variant="ghost" size="sm" onClick={() => startEdit(a)}>
                                  <Pencil className="size-4" />
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

              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {items.map((a) => {
                  const salary = a.quantity * Number(a.unit_price);
                  const isEditing = editingId === a.id;
                  if (isEditing && isAdmin) {
                    return (
                      <div key={a.id} className="p-3 space-y-2 bg-muted/30">
                        <Select value={eWorkerId || undefined} onValueChange={setEWorkerId}>
                          <SelectTrigger><SelectValue placeholder="Ishchi" /></SelectTrigger>
                          <SelectContent>
                            {workers.map((w) => (
                              <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={eProductId || undefined} onValueChange={(v) => { setEProductId(v); setEColor(""); }}>
                          <SelectTrigger><SelectValue placeholder="Mahsulot" /></SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {editingProduct?.colors && editingProduct.colors.length > 0 && (
                          <Select value={eColor || undefined} onValueChange={setEColor}>
                            <SelectTrigger><SelectValue placeholder="Rang" /></SelectTrigger>
                            <SelectContent>
                              {editingProduct.colors.map((c) => (
                                <SelectItem key={c} value={c}>
                                  <span className="flex items-center gap-2">
                                    <span className="inline-block size-4 rounded-full border" style={{ backgroundColor: c }} />
                                    <span className="font-mono text-xs">{c}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <Input type="number" min="1" value={eQty} onChange={(e) => setEQty(e.target.value)} placeholder="Miqdor" />
                          <Input type="date" value={eStartDate} onChange={(e) => setEStartDate(e.target.value)} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={cancelEdit}>
                            <X className="size-4" /> Bekor
                          </Button>
                          <Button size="sm" onClick={() => saveEdit(a.id)}>
                            <Check className="size-4" /> Saqlash
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={a.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{a.worker?.full_name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                            <span>{a.product?.name ?? "—"}</span>
                            <ColorChip color={a.color} name={a.color_name} />
                          </div>
                        </div>
                        {a.status === "completed" ? (
                          <Badge className="bg-success text-success-foreground hover:bg-success shrink-0">Bajarildi</Badge>
                        ) : (
                          <Badge variant="outline" className="border-warning text-warning shrink-0">Jarayonda</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <div className="font-mono text-xs text-muted-foreground">
                          {a.quantity} dona · {fmtDate(a.started_at)}
                        </div>
                        <div className="font-mono font-semibold text-primary">{fmtMoney(salary)}</div>
                      </div>
                      <div className="flex justify-end gap-1 -mr-2">
                        {a.status === "in_progress" && (
                          <Button variant="ghost" size="sm" onClick={() => complete(a.id)}>
                            <CheckCircle2 className="size-4 text-success" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="sm" onClick={() => startEdit(a)}>
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
