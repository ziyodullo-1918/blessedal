import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/factory/packaging/settings")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Qadoq — Sozlamalar</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Tezkor havolalar</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Link className="underline" to="/factory/packaging/workers">Ishchilar boshqaruvi</Link>
          <Link className="underline" to="/factory/packaging/rates">Tariflar (donaboshi narx)</Link>
          <Link className="underline" to="/factory/packaging/worker-login">Ishchi kabineti (PIN login)</Link>
          <Link className="underline" to="/factory/payroll">Markaziy oylik davrlar</Link>
        </CardContent>
      </Card>
    </div>
  );
}
