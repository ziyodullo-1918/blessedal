import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { createCategory, deleteCategory, listCategories, type Category } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/kategoriyalar")({
  component: () => (
    <AuthProvider>
      <RequireAuth>
        <Page />
      </RequireAuth>
    </AuthProvider>
  ),
});

function Page() {
  const [items, setItems] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setItems(await listCategories());
  }
  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createCategory(name.trim());
      setName("");
      await load();
      toast.success("Kategoriya qo'shildi");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Kategoriyani o'chirishni tasdiqlaysizmi?")) return;
    try {
      await deleteCategory(id);
      await load();
      toast.success("O'chirildi");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Kategoriyalar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Mahsulot kategoriyalarini boshqarish</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yangi kategoriya</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={add} className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Masalan: Ko'ylaklar"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Button type="submit" disabled={busy}>
              <Plus className="size-4" /> Qo'shish
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ro'yxat ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hali kategoriyalar yo'q.</p>
          ) : (
            <ul className="divide-y">
              {items.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-3">
                  <span className="font-medium">{c.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
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
