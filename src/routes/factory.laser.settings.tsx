import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/factory/laser/settings")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Lazer — Sozlamalar</h1>
        <p className="text-sm text-muted-foreground">Bo'lim sozlamalari</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Tezkor havolalar</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Link className="underline" to="/factory/laser/workers">Ishchilar boshqaruvi</Link>
          <Link className="underline" to="/factory/laser/rates">Kunlik stavkalar</Link>
          <Link className="underline" to="/factory/laser/attendance">Davomat</Link>
          <Link className="underline" to="/factory/payroll">Markaziy oylik davrlar</Link>
        </CardContent>
      </Card>
    </div>
  );
}
