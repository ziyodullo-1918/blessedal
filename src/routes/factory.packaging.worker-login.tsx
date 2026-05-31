import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Boxes } from "lucide-react";
import { toast } from "sonner";
import { packagingWorkerLogin } from "@/lib/factory/packaging";

export const Route = createFileRoute("/factory/packaging/worker-login")({
  component: Page,
});

function Page() {
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async () => {
    if (!code || !pin) return;
    setBusy(true);
    try {
      const row = await packagingWorkerLogin(code.trim(), pin.trim());
      if (!row) { toast.error("Kod yoki PIN noto'g'ri"); return; }
      toast.success(`Xush kelibsiz, ${row.full_name}`);
      nav({ to: "/factory/packaging/worker" });
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto size-14 rounded-full bg-primary/20 flex items-center justify-center mb-2">
            <Boxes className="size-7 text-primary" />
          </div>
          <CardTitle>Qadoq — Ishchi kirishi</CardTitle>
          <p className="text-xs text-muted-foreground">Ishchi kodi va PIN bilan kiring</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Ishchi kodi" value={code} onChange={(e) => setCode(e.target.value)} />
          <Input placeholder="PIN" type="password" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
          <Button className="w-full" disabled={busy} onClick={submit}>{busy ? "..." : "Kirish"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
