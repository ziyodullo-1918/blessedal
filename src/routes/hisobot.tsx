import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import { monthlyReport } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fmtMoney, currentYearMonth } from "@/lib/format";

export const Route = createFileRoute("/hisobot")({
  component: () => (
    <AuthProvider>
      <RequireAuth>
        <Page />
      </RequireAuth>
    </AuthProvider>
  ),
});

type Row = { workerId: string; workerName: string; totalQty: number; totalSalary: number; jobs: number };

function Page() {
  const [month, setMonth] = useState(currentYearMonth());
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    monthlyReport(month)
      .then((data) => {
        const map = new Map<string, Row>();
        for (const a of data) {
          const id = a.worker?.id ?? a.worker_id;
          const name = a.worker?.full_name ?? "—";
          const salary = a.quantity * Number(a.unit_price);
          const r = map.get(id) ?? { workerId: id, workerName: name, totalQty: 0, totalSalary: 0, jobs: 0 };
          r.totalQty += a.quantity;
          r.totalSalary += salary;
          r.jobs += 1;
          map.set(id, r);
        }
        setRows([...map.values()].sort((a, b) => b.totalSalary - a.totalSalary));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month]);

  const grand = useMemo(
    () => rows.reduce((s, r) => s + r.totalSalary, 0),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Oylik hisobot</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Har bir ishchi uchun oylik bajarilgan ish va maosh
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="month">Oy</Label>
          <Input
            id="month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-48"
          />
        </div>
      </div>

      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Umumiy oylik to'lov
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-display text-4xl">{fmtMoney(grand)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ishchilar bo'yicha</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Yuklanmoqda…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Bu oy uchun bajarilgan topshiriqlar yo'q.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-4 py-3">Ishchi</th>
                    <th className="px-4 py-3 text-right">Topshiriqlar</th>
                    <th className="px-4 py-3 text-right">Jami miqdor</th>
                    <th className="px-4 py-3 text-right">Jami maosh</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.workerId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{r.workerName}</td>
                      <td className="px-4 py-3 text-right font-mono">{r.jobs}</td>
                      <td className="px-4 py-3 text-right font-mono">{r.totalQty}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-primary">
                        {fmtMoney(r.totalSalary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
