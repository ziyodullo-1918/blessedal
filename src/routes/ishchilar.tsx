import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { createWorker, deleteWorker, listWorkers, type Worker } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/ishchilar")({
  component: () => (
    <AuthProvider>
      <RequireAuth>
        <Page />
      </RequireAuth>
    </AuthProvider>
  ),
});

function Page() {
  const [items, setItems] = useState<Worker[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

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
      await createWorker({ full_name: name.trim(), phone: phone.trim() || null });
      setName("");
      setPhone("");
      await load();
      toast.success("Ishchi qo'shildi");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Ishchini o'chirishni tasdiqlaysizmi? Uning topshiriqlari ham o'chiriladi.")) return;
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
              <Label>Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998 90 123 45 67" />
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
            <p className="text-sm text-muted-foreground">Hali ishchilar yo'q.</p>
          ) : (
            <ul className="divide-y">
              {items.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium">{w.full_name}</div>
                    {w.phone && (
                      <div className="text-xs text-muted-foreground">{w.phone}</div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(w.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
