import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Plus, Trash2, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import {
  createCategory,
  deleteCategory,
  listCategories,
  type Category,
} from "@/lib/data";

export function CategoriesManager({ onChange }: { onChange?: () => void }) {
  const confirm = useConfirm();
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
      onChange?.();
      toast.success("Kategoriya qo'shildi");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, label: string) {
    const ok = await confirm({
      title: `"${label}" o'chirilsinmi?`,
      description: "Bu kategoriyaga biriktirilgan mahsulotlar kategoriyasiz qoladi.",
      confirmText: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteCategory(id);
      await load();
      onChange?.();
      toast.success("O'chirildi");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderTree className="size-4" /> Kategoriyalar
        </CardTitle>
        <CardDescription>
          Mahsulotlarni guruhlash uchun (masalan: Bahor, Yoz, Kuz, Qish)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={add} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Masalan: Yoz mahsulotlari"
          />
          <Button type="submit" disabled={busy} className="shrink-0">
            <Plus className="size-4" /> Qo'shish
          </Button>
        </form>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Hali kategoriyalar yo'q.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {items.map((c) => (
              <span
                key={c.id}
                className="inline-flex items-center gap-1.5 rounded-full border bg-muted/50 py-1 pl-3 pr-1 text-sm"
              >
                {c.name}
                <button
                  type="button"
                  onClick={() => remove(c.id, c.name)}
                  className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="O'chirish"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
