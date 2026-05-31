import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DeptWorkers } from "@/components/factory/dept-workers";
import { getDefaultLaserRate, setDefaultLaserRate } from "@/lib/factory/laser";
import { toast } from "sonner";
import { Coins } from "lucide-react";

export const Route = createFileRoute("/factory/laser/workers")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function Page() {
  const [rate, setRate] = useState("");
  const [savedRate, setSavedRate] = useState(0);

  const refresh = async () => {
    const r = await getDefaultLaserRate();
    setSavedRate(r.rate);
    setRate(r.rate ? String(r.rate) : "");
  };
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    const n = Number(rate);
    if (!n || n <= 0) return toast.error("To'g'ri stavka kiriting");
    try {
      await setDefaultLaserRate(n);
      toast.success("Saqlandi"); refresh();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Coins className="size-5 text-amber-400" />Kunlik stavka (umumiy)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-[200px_auto_1fr]">
          <Input type="number" placeholder="So'm / kun" value={rate} onChange={(e) => setRate(e.target.value)} />
          <Button onClick={save}>Saqlash</Button>
          <div className="self-center text-sm text-muted-foreground">
            Joriy: <span className="font-semibold text-foreground">{savedRate.toLocaleString()} so'm</span> — davomatda har ishchiga shu narx qo'llaniladi
          </div>
        </CardContent>
      </Card>

      <DeptWorkers department="laser" title="Lazer — Ishchilar" hidePin />
    </div>
  );
}
