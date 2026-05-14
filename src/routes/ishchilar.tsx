import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  createWorker,
  deleteWorker,
  listWorkers,
  updateWorker,
  listAbsences,
  markAbsent,
  markPresent,
  type Worker,
  type AbsenceRow,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Pencil, Check, X, ChevronDown, Users } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/ishchilar")({
  component: Page,
});

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function Page() {
  const confirm = useConfirm();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [items, setItems] = useState<Worker[]>([]);
  const [date, setDate] = useState<string>(todayStr());
  const [absences, setAbsences] = useState<AbsenceRow[]>([]);
  const [name, setName] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editWorkerId, setEditWorkerId] = useState("");
  const [showRoster, setShowRoster] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  async function load() {
    setItems(await listWorkers());
  }
  async function loadAbsences(d: string) {
    setAbsences(await listAbsences(d));
  }
  useEffect(() => {
    load().catch(console.error);
  }, []);
  useEffect(() => {
    loadAbsences(date).catch(console.error);
  }, [date]);

  const absentSet = useMemo(() => new Set(absences.map((a) => a.worker_id)), [absences]);
  const activeCount = items.length - absentSet.size;

  async function toggle(workerId: string, present: boolean) {
    try {
      if (present) {
        await markPresent(workerId, date);
      } else {
        await markAbsent(workerId, date);
      }
      await loadAbsences(date);
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createWorker({
        full_name: name.trim(),
        phone: workerId.trim() || null,
      });
      setName("");
      setWorkerId("");
      await load();
      toast.success("Ishchi qo'shildi");
      setAddOpen(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(w: Worker) {
    setEditingId(w.id);
    setEditName(w.full_name);
    setEditWorkerId(w.phone ?? "");
  }
  function cancelEdit() {
    setEditingId(null);
    setEditName("");
    setEditWorkerId("");
  }
  async function saveEdit(id: string) {
    if (!editName.trim()) {
      toast.error("F.I.O. bo'sh bo'lmasligi kerak");
      return;
    }
    try {
      await updateWorker(id, {
        full_name: editName.trim(),
        phone: editWorkerId.trim() || null,
      });
      cancelEdit();
      await load();
      toast.success("Yangilandi");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function remove(id: string) {
    const ok = await confirm({
      title: "Ishchini o'chirasizmi?",
      description: "Uning topshiriqlari ham o'chiriladi. Bu amalni qaytarib bo'lmaydi.",
      confirmText: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteWorker(id);
      await load();
      toast.success("O'chirildi");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl">Ishchilar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Davomat va xodimlar ro'yxati</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Sana</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>
      </div>

      {/* Compact admin panels */}
      {isAdmin && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Collapsible open={addOpen} onOpenChange={setAddOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="inline-flex items-center gap-2">
                  <Plus className="size-4" /> Yangi ishchi qo'shish
                </span>
                <ChevronDown
                  className={`size-4 transition-transform ${addOpen ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Card>
                <CardContent className="pt-4">
                  <form onSubmit={add} className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">F.I.O.</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Aliyev Aziz"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">ID</Label>
                      <Input
                        value={workerId}
                        onChange={(e) => setWorkerId(e.target.value)}
                        placeholder="001"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full" disabled={busy}>
                        <Plus className="size-4" /> Qo'shish
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={showRoster} onOpenChange={setShowRoster}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span className="inline-flex items-center gap-2">
                  <Users className="size-4" /> Ro'yxat ({items.length}) — tahrirlash
                </span>
                <ChevronDown
                  className={`size-4 transition-transform ${showRoster ? "rotate-180" : ""}`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y">
                    {items.map((w) => (
                      <li key={w.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        {editingId === w.id ? (
                          <>
                            <div className="grid flex-1 gap-2 sm:grid-cols-2">
                              <Input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="F.I.O."
                              />
                              <Input
                                value={editWorkerId}
                                onChange={(e) => setEditWorkerId(e.target.value)}
                                placeholder="ID"
                              />
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => saveEdit(w.id)}>
                                <Check className="size-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                <X className="size-4" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm">
                              <div className="font-medium">{w.full_name}</div>
                              {w.phone && (
                                <div className="text-xs text-muted-foreground">ID: {w.phone}</div>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => startEdit(w)}>
                                <Pencil className="size-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => remove(w.id)}>
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      {/* Attendance — main view */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-base">Davomat — {date}</CardTitle>
          <div className="text-xs">
            <span className="text-muted-foreground">Jami {items.length} · </span>
            <span className="font-semibold text-primary">{activeCount} faol</span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-semibold text-destructive">{absentSet.size} kelmagan</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Hali ishchilar yo'q.</p>
          ) : (
            <ul className="divide-y">
              {items.map((w) => {
                const present = !absentSet.has(w.id);
                return (
                  <li
                    key={w.id}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{w.full_name}</div>
                      <div
                        className={`text-xs ${present ? "text-primary" : "text-destructive"}`}
                      >
                        {present ? "Faol" : "Kelmadi"}
                      </div>
                    </div>
                    <Switch
                      checked={present}
                      onCheckedChange={(v) => toggle(w.id, v)}
                      aria-label="Davomat"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
