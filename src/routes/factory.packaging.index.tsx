import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listStagesByDept } from "@/lib/factory/data";
import { packagingSalaryReport, type PackagingSalaryRow } from "@/lib/factory/packaging";
import { Boxes, Users, Coins, ClipboardList, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/factory/packaging/")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

function Page() {
  const [active, setActive] = useState(0);
  const [report, setReport] = useState<PackagingSalaryRow[]>([]);

  useEffect(() => {
    const today = new Date();
    const first = isoDay(new Date(today.getFullYear(), today.getMonth(), 1));
    const last = isoDay(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    (async () => {
      const stages = await listStagesByDept("packaging");
      setActive(stages.filter((s) => s.status !== "completed").length);
      setReport(await packagingSalaryReport(first, last));
    })();
  }, []);

  const monthTotal = report.reduce((a, r) => a + Number(r.total_amount), 0);
  const monthUnits = report.reduce((a, r) => a + Number(r.total_units), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight flex items-center gap-2"><Boxes className="size-7 text-primary" />Qadoq bo'limi</h1>
        <p className="text-sm text-muted-foreground">Karobka asosida ish — boshqaruv paneli</p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Faol topshiriqlar" value={active} icon={<ClipboardList className="size-5" />} />
        <Kpi label="Oyda qadoqlandi" value={`${monthUnits.toLocaleString()} juft`} icon={<Boxes className="size-5" />} />
        <Kpi label="Oylik xarajat" value={`${monthTotal.toLocaleString()} so'm`} icon={<Coins className="size-5" />} />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <NavCard to="/factory/packaging/workers" icon={<Users className="size-5" />} title="Ishchilar" desc="Bo'lim ishchilari" />
        <NavCard to="/factory/packaging/tasks" icon={<ClipboardList className="size-5" />} title="Topshiriqlar" desc="Karobka yozish" />
        <NavCard to="/factory/packaging/report" icon={<BarChart3 className="size-5" />} title="Oylik hisobot" desc="Har ishchi bo'yicha" />
      </div>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-5">
        <div>
          <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
          <div className="text-2xl font-display mt-1">{value}</div>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}

function NavCard({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link to={to}>
      <Card className="hover:bg-accent/40 transition-colors h-full">
        <CardHeader className="pb-2">
          <div className="text-muted-foreground">{icon}</div>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{desc}</CardContent>
      </Card>
    </Link>
  );
}
