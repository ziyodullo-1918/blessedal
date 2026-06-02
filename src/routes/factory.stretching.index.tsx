import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listStagesByDept, listWorkers } from "@/lib/factory/data";
import { Wrench, Users, ClipboardList } from "lucide-react";

export const Route = createFileRoute("/factory/stretching/")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function Page() {
  const [active, setActive] = useState(0);
  const [workers, setWorkers] = useState(0);

  useEffect(() => {
    (async () => {
      const stages = await listStagesByDept("stretching");
      setActive(stages.filter((s) => s.status !== "completed").length);
      const w = await listWorkers("stretching");
      setWorkers(w.length);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight flex items-center gap-2">
          <Wrench className="size-7 text-sky-400" />Tortuv bo'limi
        </h1>
        <p className="text-sm text-muted-foreground">Tikuvdan keladigan vazifalar va tortuvchilar</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Kpi label="Faol topshiriqlar" value={active} icon={<ClipboardList className="size-5" />} />
        <Kpi label="Ishchilar" value={workers} icon={<Users className="size-5" />} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <NavCard to="/factory/stretching/workers" icon={<Users className="size-5" />} title="Ishchilar" desc="Tortuvchilarni boshqarish" />
        <NavCard to="/factory/stretching/tasks" icon={<ClipboardList className="size-5" />} title="Topshiriqlar" desc="Tikuvdan kelgan vazifalar" />
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
