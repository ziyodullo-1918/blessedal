import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { orderRequirements, consumeOrderMaterials, type MaterialRequirement } from "@/lib/factory/inventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, FlaskConical } from "lucide-react";
import { toast } from "sonner";

export function MaterialRequirements({ orderId, onConsumed }: { orderId: string; onConsumed?: () => void }) {
  const [reqs, setReqs] = useState<MaterialRequirement[] | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    try { setReqs(await orderRequirements(orderId)); }
    catch (e) { console.error(e); }
  };

  useEffect(() => {
    refresh();
    const ch = supabase.channel(`req_${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory_materials" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId]);

  if (reqs === null) return null;

  if (reqs.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 text-sm text-muted-foreground flex items-center gap-2">
          <FlaskConical className="size-4" />
          Bu mahsulot uchun formula belgilanmagan. <a href="/factory/formulas" className="underline">Formula qo'shish</a>
        </CardContent>
      </Card>
    );
  }

  const shortages = reqs.filter((r) => r.shortage > 0);
  const partialPossible = shortages.length > 0 && shortages.length < reqs.length;
  const ok = shortages.length === 0;

  const consume = async () => {
    if (!confirm("Materiallarni omborga chiqim qilishni tasdiqlaysizmi?")) return;
    setBusy(true);
    try {
      await consumeOrderMaterials(orderId);
      toast.success("Materiallar chiqim qilindi");
      onConsumed?.();
      refresh();
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.startsWith("insufficient_material")) toast.error("Material yetarli emas");
      else toast.error(msg);
    } finally { setBusy(false); }
  };

  return (
    <Card className={
      ok ? "border-emerald-500/40 bg-emerald-500/5"
      : partialPossible ? "border-amber-500/40 bg-amber-500/5"
      : "border-red-500/40 bg-red-500/5"
    }>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          {ok ? <CheckCircle2 className="size-4 text-emerald-400" /> : <AlertTriangle className="size-4 text-amber-400" />}
          Material talablari
        </CardTitle>
        {ok && (
          <Button size="sm" disabled={busy} onClick={consume}>
            {busy ? "..." : "Materiallarni chiqim qilish"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {!ok && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
            {partialPossible
              ? "⚠️ Material qisman yetishmaydi — qisman ishlab chiqarish mumkin."
              : "❌ Material yetarli emas — yetkazib berish kutilmoqda."}
          </div>
        )}
        <div className="divide-y">
          {reqs.map((r) => {
            const short = r.shortage > 0;
            return (
              <div key={r.material_id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.material_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Kerak: <span className="font-semibold text-foreground">{r.required_qty}{r.unit}</span>
                    {" · "}Bor: {r.available_qty}{r.unit}
                  </div>
                </div>
                {short ? (
                  <span className="rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-300">
                    Yetmaydi {r.shortage}{r.unit}
                  </span>
                ) : (
                  <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    Yetarli
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
