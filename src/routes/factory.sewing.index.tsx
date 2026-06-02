import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listStagesByDept, listWorkers } from "@/lib/factory/data";
import { Scissors, Users, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/factory/sewing/")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function Page() {
  const [active, setActive] = useState(0);
  const [workers, setWorkers] = useState(0);

  useEffect(() => {
    (async () => {
      const stages = await listStagesByDept("sewing");
      setActive(stages.filter((s) => s.status !== "completed").length);
      const w = await listWorkers("sewing");
      setWorkers(w.length);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight flex items-center gap-2">
          <Scissors className="size-7 text-pink-400" />Tikuv bo'limi
        </h1>
        <p className="text-sm text-muted-foreground">Lazerdan keladigan vazifalar va tikuvchilar</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Kpi label="Faol topshiriqlar" value={active} icon={<ClipboardList className="size-5" />} />
        <Kpi label="Ishchilar" value={workers} icon={<Users className="size-5" />} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <NavCard to="/factory/sewing/workers" icon={<Users className="size-5" />} title="Ishchilar" desc="Tikuvchilarni boshqarish" />
        <NavCard to="/factory/sewing/tasks" icon={<ClipboardList className="size-5" />} title="Topshiriqlar" desc="Lazerdan kelgan vazifalar" />
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
