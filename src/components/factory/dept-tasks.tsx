import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEPT_LABEL, listStagesByDept, reportProgress, setStageStatus,
  type FactoryDept, type FactoryOrder, type FactoryStage,
} from "@/lib/factory/data";
import { reportLaserAux } from "@/lib/factory/laser";
import { MaterialRequirements } from "@/components/factory/material-requirements";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/factory/order-flow";
import { AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";

export function DeptTasks({ department }: { department: FactoryDept }) {
  const [rows, setRows] = useState<(FactoryStage & { order: FactoryOrder })[]>([]);

  useEffect(() => {
    const refresh = async () => setRows(await listStagesByDept(department));
    refresh();
    const ch = supabase.channel(`dept_${department}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_stages", filter: `department=eq.${department}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "factory_orders" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [department]);

  const refresh = async () => setRows(await listStagesByDept(department));
  const pending = rows.filter((r) => r.status !== "completed");
  const done = rows.filter((r) => r.status === "completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">{DEPT_LABEL[department]} — Topshiriqlar</h1>
        <p className="text-sm text-muted-foreground">Vazifalar avtomatik tarzda oldingi bosqichdan keladi</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Faol vazifalar ({pending.length})</h2>
        {pending.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Faol vazifalar yo'q.</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((r) => <TaskCard key={r.id} stage={r} onChanged={refresh} />)}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Tugatilgan ({done.length})</h2>
          <Card>
            <CardContent className="p-0 divide-y">
              {done.slice(0, 20).map((r) => (
                <Link key={r.id} to="/factory/orders/$id" params={{ id: r.order_id }}
                  className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-accent/40 text-sm">
                  <div>
                    <span className="font-mono text-xs text-muted-foreground">{r.order.order_number}</span>{" "}
                    <span>{r.order.product_name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.completed_quantity}/{r.planned_quantity}</span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}

function TaskCard({ stage, onChanged }: { stage: FactoryStage & { order: FactoryOrder }; onChanged: () => void }) {
  const [main, setMain] = useState("");
  const [astar, setAstar] = useState("");
  const [hak, setHak] = useState("");
  const [reason, setReason] = useState("");
  const [showIssue, setShowIssue] = useState(false);
  const [busy, setBusy] = useState(false);

  const isLaser = stage.department === "laser";
  const planned = stage.planned_quantity;
  const mainDone = stage.completed_quantity;
  const astarDone = Number(stage.aux_completed?.astar ?? 0);
  const hakDone = Number(stage.aux_completed?.hakandoz ?? 0);
  const pct = planned > 0 ? Math.round((mainDone / planned) * 100) : 0;
  const remaining = planned - mainDone;

  const submitMain = async () => {
    const d = Number(main) || 0;
    if (d <= 0) return;
    setBusy(true);
    try {
      await reportProgress(stage.id, d, 0);
      setMain("");
      toast.success("Asosiy qism qo'shildi");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const submitAux = async (part: "astar" | "hakandoz", val: string, setter: (s: string) => void) => {
    const d = Number(val) || 0;
    if (d <= 0) return;
    setBusy(true);
    try {
      await reportLaserAux(stage.id, part, d);
      setter("");
      toast.success(part === "astar" ? "Astar qo'shildi" : "Hakandoz qo'shildi");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const sendNext = async () => {
    if (!confirm("Bosqichni tugatib keyingi bo'limga yuborilsinmi?")) return;
    setBusy(true);
    try {
      await setStageStatus(stage.id, "completed", "sent_to_next");
      toast.success(isLaser ? "Tikuv bo'limiga yuborildi" : "Keyingi bo'limga yuborildi");
      onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  const flagIssue = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      await setStageStatus(stage.id, "waiting_material", reason.trim());
      toast.success("Muammo qayd etildi");
      setReason(""); setShowIssue(false); onChanged();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{stage.order.product_name}</CardTitle>
            <div className="text-xs text-muted-foreground truncate">
              <Link to="/factory/orders/$id" params={{ id: stage.order_id }} className="hover:text-foreground">
                {stage.order.order_number}
              </Link>
              {" · "}{stage.order.customer_name}
              {stage.order.color ? ` · ${stage.order.color}` : ""}
            </div>
          </div>
          <StatusBadge status={stage.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
        </div>

        {isLaser ? (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Asosiy: <b className="text-foreground">{mainDone}</b>/{planned} · Astar: <b className="text-foreground">{astarDone}</b>/{planned} · Hakandoz: <b className="text-foreground">{hakDone}</b>/{planned}
            </div>
            <PartRow label="Asosiy (kesildi)" value={main} setValue={setMain} onSubmit={submitMain} busy={busy} />
            <PartRow label="Astar" value={astar} setValue={setAstar} onSubmit={() => submitAux("astar", astar, setAstar)} busy={busy} />
            <PartRow label="Hakandoz / Stirka" value={hak} setValue={setHak} onSubmit={() => submitAux("hakandoz", hak, setHak)} busy={busy} />
          </div>
        ) : (
          <>
            <div className="text-xs text-muted-foreground">
              {mainDone} / {planned} · Qoldi: {remaining}
            </div>
            <PartRow label="+Bajarildi" value={main} setValue={setMain} onSubmit={submitMain} busy={busy} />
          </>
        )}

        {isLaser && stage.status === "waiting_material" && (
          <MaterialRequirements orderId={stage.order_id} onConsumed={onChanged} />
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="default" disabled={busy || stage.completed_quantity === 0} onClick={sendNext}>
            <Send className="size-3 mr-1" />
            {isLaser ? "Tikuvga yuborish" : "Keyingi bo'limga"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowIssue((v) => !v)}>
            <AlertTriangle className="size-3 mr-1" />Muammo
          </Button>
        </div>

        {showIssue && (
          <div className="flex gap-2">
            <Input placeholder="Muammo sababi" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button size="sm" variant="destructive" disabled={busy || !reason.trim()} onClick={flagIssue}>Saqlash</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PartRow({ label, value, setValue, onSubmit, busy }: { label: string; value: string; setValue: (s: string) => void; onSubmit: () => void; busy: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr_auto] items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input type="number" min={0} placeholder="+" value={value} onChange={(e) => setValue(e.target.value)} />
      <Button size="sm" disabled={busy} onClick={onSubmit}>OK</Button>
    </div>
  );
}
