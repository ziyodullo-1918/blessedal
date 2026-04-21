import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  createWorker,
  deleteWorker,
  listWorkers,
  updateWorker,
  type Worker,
} from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/ishchilar")({
  component: Page,
});

function Page() {
  const confirm = useConfirm();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const [items, setItems] = useState<Worker[]>([]);
  const [name, setName] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editWorkerId, setEditWorkerId] = useState("");

  async function load() {
    setItems(await listWorkers());
  }
  useEffect(() => {
    load().catch(console.error);
  }, []);

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
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Ishchilar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cex xodimlarini ro'yxatga olish</p>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Yangi ishchi</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={add} className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>F.I.O.</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Aliyev Aziz" />
              </div>
              <div className="space-y-1.5">
                <Label>ID</Label>
                <Input value={workerId} onChange={(e) => setWorkerId(e.target.value)} placeholder="masalan: 001" />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={busy}>
                  <Plus className="size-4" /> Qo'shish
                </Button>
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
            <p className="text-sm text-muted-foreground">Hali ishchilar yo'q.</p>
          ) : (
            <ul className="divide-y">
              {items.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 py-3">
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
                      <div>
                        <div className="font-medium">{w.full_name}</div>
                        {w.phone && (
                          <div className="text-xs text-muted-foreground">ID: {w.phone}</div>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => startEdit(w)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(w.id)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
