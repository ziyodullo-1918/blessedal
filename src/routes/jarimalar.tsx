import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import {
  createFine,
  deleteFine,
  listFines,
  listWorkers,
  updateFine,
  type Fine,
  type Worker,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { fmtDate, fmtMoney } from "@/lib/format";
import { useConfirm } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/jarimalar")({
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
  const confirm = useConfirm();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [fines, setFines] = useState<Fine[]>([]);
  const [loading, setLoading] = useState(true);
  const [openWorker, setOpenWorker] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Add-fine dialog
  const [addFor, setAddFor] = useState<Worker | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayStr());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Edit dialog
  const [editing, setEditing] = useState<Fine | null>(null);
  const [eAmount, setEAmount] = useState("");
  const [eDate, setEDate] = useState("");
  const [eNote, setENote] = useState("");

  async function load() {
    setLoading(true);
    try {
      const [w, f] = await Promise.all([listWorkers(), listFines()]);
      setWorkers(w);
      setFines(f);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const byWorker = useMemo(() => {
    const map = new Map<string, Fine[]>();
    for (const f of fines) {
      const arr = map.get(f.worker_id) ?? [];
      arr.push(f);
      map.set(f.worker_id, arr);
    }
    return map;
  }, [fines]);

  const grandTotal = useMemo(
    () => fines.reduce((s, f) => s + Number(f.amount), 0),
    [fines],
  );

  const shownWorkers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workers;
    return workers.filter((w) => w.full_name.toLowerCase().includes(q));
  }, [workers, query]);

  const openAdd = (w: Worker) => {
    setAddFor(w);
    setAmount("");
    setDate(todayStr());
    setNote("");
  };

  const handleAdd = async () => {
    if (!addFor) return;
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Summani kiriting");
    if (!date) return toast.error("Sanani kiriting");
    setBusy(true);
    try {
      await createFine({
        worker_id: addFor.id,
        amount: amt,
        date,
        note: note.trim() || null,
      });
      toast.success("Jarima qo'shildi");
      setAddFor(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (f: Fine) => {
    setEditing(f);
    setEAmount(String(f.amount));
    setEDate(f.date);
    setENote(f.note ?? "");
  };

  const handleEdit = async () => {
    if (!editing) return;
    const amt = Number(eAmount);
    if (!amt || amt <= 0) return toast.error("Summani kiriting");
    if (!eDate) return toast.error("Sanani kiriting");
    setBusy(true);
    try {
      await updateFine(editing.id, {
        amount: amt,
        date: eDate,
        note: eNote.trim() || null,
      });
      toast.success("Jarima yangilandi");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Xatolik");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (f: Fine) => {
    const ok = await confirm({
      title: "Jarimani o'chirasizmi?",
      description: `${f.worker?.full_name ?? ""} — ${fmtMoney(f.amount)}`,
      confirmText: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteFine(f.id);
      toast.success("O'chirildi");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Xatolik");
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-primary sm:text-4xl">Jarimalar</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Jarimalar oylik hisobotda ishchi maoshidan ayrib hisoblanadi
            </p>
          </div>
          <Badge variant="outline" className="border-primary/30 font-mono text-sm text-primary">
            Jami: {fmtMoney(grandTotal)}
          </Badge>
        </div>
      </div>

      {/* Workers list */}
      <Card className="border-primary/20">
        <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="text-base">Ishchilar</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ishchi izlash..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Yuklanmoqda…</p>
          ) : workers.length === 0 ? (
            <div className="m-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-10 text-center text-sm text-muted-foreground">
              Ishchilar yo'q
            </div>
          ) : shownWorkers.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              "{query}" bo'yicha ishchi topilmadi
            </p>
          ) : (
            <div className="divide-y">
              {shownWorkers.map((w) => {
                const list = byWorker.get(w.id) ?? [];
                const total = list.reduce((s, f) => s + Number(f.amount), 0);
                const expanded = openWorker === w.id;
                return (
                  <div key={w.id}>
                    <div className="flex w-full items-center gap-3 px-4 py-3">
                      <button
                        onClick={() => setOpenWorker(expanded ? null : w.id)}
                        className="flex flex-1 items-center gap-3 text-left transition hover:opacity-80"
                      >
                        {expanded ? (
                          <ChevronDown className="size-4 text-primary" />
                        ) : (
                          <ChevronRight className="size-4 text-primary" />
                        )}
                        <div className="flex-1 font-medium">{w.full_name}</div>
                        <div className="hidden font-mono text-xs text-muted-foreground sm:block">
                          {list.length} ta jarima
                        </div>
                        <div className="w-32 text-right font-mono font-semibold text-destructive">
                          {total > 0 ? `-${fmtMoney(total)}` : "—"}
                        </div>
                      </button>
                      <Button size="sm" onClick={() => openAdd(w)}>
                        <Plus className="size-4" /> Jarima
                      </Button>
                    </div>
                    {expanded && (
                      <div className="bg-primary/5 px-4 pb-4">
                        {list.length === 0 ? (
                          <p className="rounded-md border border-dashed border-primary/30 bg-background p-4 text-center text-xs text-muted-foreground">
                            Jarimalar yo'q
                          </p>
                        ) : (
                          <div className="overflow-x-auto rounded-md border border-primary/20 bg-background">
                            <table className="w-full text-sm">
                              <thead className="bg-primary/10 text-left text-xs uppercase tracking-wider text-primary">
                                <tr>
                                  <th className="px-3 py-2">Sana</th>
                                  <th className="px-3 py-2">Izoh</th>
                                  <th className="px-3 py-2 text-right">Summa</th>
                                  <th className="px-3 py-2 text-right">Amallar</th>
                                </tr>
                              </thead>
                              <tbody>
                                {list.map((f) => (
                                  <tr key={f.id} className="border-b last:border-0">
                                    <td className="px-3 py-2 font-mono text-xs">
                                      {fmtDate(f.date)}
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">
                                      {f.note || "—"}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-semibold text-destructive">
                                      -{fmtMoney(f.amount)}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="flex justify-end gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => openEdit(f)}
                                        >
                                          <Pencil className="size-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleDelete(f)}
                                          className="text-destructive hover:text-destructive"
                                        >
                                          <Trash2 className="size-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add dialog */}
      <Dialog open={!!addFor} onOpenChange={(v) => !v && setAddFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CircleAlert className="size-5 text-destructive" />
              Jarima — {addFor?.full_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Summa (so'm)</Label>
              <Input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50000"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sana</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Izoh (ixtiyoriy)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Sabab..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setAddFor(null)}>
                Bekor qilish
              </Button>
              <Button onClick={handleAdd} disabled={busy}>
                Saqlash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Jarimani tahrirlash</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Summa (so'm)</Label>
              <Input
                type="number"
                min={0}
                value={eAmount}
                onChange={(e) => setEAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Sana</Label>
              <Input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Izoh</Label>
              <Input value={eNote} onChange={(e) => setENote(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Bekor qilish
              </Button>
              <Button onClick={handleEdit} disabled={busy}>
                Saqlash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
