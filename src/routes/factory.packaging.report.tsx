import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { packagingSalaryReport, type PackagingSalaryRow } from "@/lib/factory/packaging";

export const Route = createFileRoute("/factory/packaging/report")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

function Page() {
  const today = new Date();
  const [from, setFrom] = useState(isoDay(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(isoDay(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
  const [rows, setRows] = useState<PackagingSalaryRow[]>([]);

  useEffect(() => { (async () => setRows(await packagingSalaryReport(from, to)))(); }, [from, to]);
  const total = rows.reduce((a, r) => a + Number(r.total_amount), 0);
  const units = rows.reduce((a, r) => a + Number(r.total_units), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display tracking-tight">Qadoq — Oylik hisobot</h1>
        <p className="text-sm text-muted-foreground">Har ishchining qadoqlangan mahsulotlari va daromadi</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2">
          <CardTitle>Hisobot</CardTitle>
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
            <div className="text-sm font-semibold ml-2">{units.toLocaleString()} dona · {total.toLocaleString()} so'm</div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Ma'lumot yo'q.</div>
          ) : (
            <div className="divide-y">
              {rows.map((r) => (
                <div key={r.worker_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{r.worker_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{Number(r.total_units).toLocaleString()} dona</div>
                  </div>
                  <div className="font-semibold">{Number(r.total_amount).toLocaleString()} so'm</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
