import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, Users, Scissors } from "lucide-react";
import {
  laserSalaryReport, laserCutSummary,
  type LaserSalaryRow, type LaserCutRow,
} from "@/lib/factory/laser";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/factory/laser/report")({
  component: () => <RequireAuth><Page /></RequireAuth>,
});

function isoDay(d: Date) { return d.toISOString().slice(0, 10); }

function Page() {
  const today = new Date();
  const [from, setFrom] = useState(isoDay(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(isoDay(new Date(today.getFullYear(), today.getMonth() + 1, 0)));
  const [salary, setSalary] = useState<LaserSalaryRow[]>([]);
  const [cuts, setCuts] = useState<LaserCutRow[]>([]);

  useEffect(() => {
    (async () => {
      const [s, c] = await Promise.all([laserSalaryReport(from, to), laserCutSummary(from, to)]);
      setSalary(s); setCuts(c);
    })();
  }, [from, to]);

  const salaryTotal = salary.reduce((a, r) => a + Number(r.total_amount), 0);
  const cutTotal = cuts.reduce((a, r) => a + Number(r.total_quantity), 0);
  const rejectedTotal = cuts.reduce((a, r) => a + Number(r.total_rejected), 0);

  const exportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();
    doc.setFillColor(234, 88, 12); doc.rect(0, 0, w, 70, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(20);
    doc.text("LAZER BO'LIMI — OYLIK HISOBOT", 32, 38);
    doc.setFontSize(11); doc.text(`Davr: ${from} — ${to}`, 32, 58);

    doc.setTextColor(20, 20, 20); doc.setFontSize(13);
    doc.text("Ishchi maoshlari va davomati", 32, 100);
    autoTable(doc, {
      startY: 108,
      head: [["#", "Ishchi", "Ish kunlari", "Jami so'm"]],
      body: salary.map((r, i) => [
        i + 1, r.worker_name ?? "—", String(r.total_days),
        Number(r.total_amount).toLocaleString() + " so'm",
      ]),
      foot: [["", "Jami", "", salaryTotal.toLocaleString() + " so'm"]],
      headStyles: { fillColor: [234, 88, 12], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 6 },
    });

    const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24;
    doc.setFontSize(13); doc.text("Kesilgan mahsulotlar (turlari bo'yicha)", 32, y2);
    autoTable(doc, {
      startY: y2 + 8,
      head: [["#", "Buyurtma", "Mahsulot", "Rang", "Soni", "Brak"]],
      body: cuts.map((r, i) => [
        i + 1, r.order_number, r.product_name, r.color ?? "—",
        String(r.total_quantity), String(r.total_rejected),
      ]),
      foot: [["", "Jami", "", "", String(cutTotal), String(rejectedTotal)]],
      headStyles: { fillColor: [234, 88, 12], textColor: 255 },
      footStyles: { fillColor: [240, 240, 240], textColor: 20, fontStyle: "bold" },
      styles: { fontSize: 10, cellPadding: 6 },
    });

    doc.save(`lazer-hisobot-${from}_${to}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-display tracking-tight flex items-center gap-2">
            <BarChart3 className="size-7 text-orange-400" />Lazer — Oylik hisobot
          </h1>
          <p className="text-sm text-muted-foreground">Davr bo'yicha maosh, davomat va kesilgan ishlar</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px]" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px]" />
          <Button onClick={exportPdf}><Download className="size-4 mr-1" />PDF</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Kpi label="Jami maosh" value={`${salaryTotal.toLocaleString()} so'm`} />
        <Kpi label="Kesilgan mahsulot" value={cutTotal.toLocaleString()} />
        <Kpi label="Brak" value={rejectedTotal.toLocaleString()} />
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="size-5" />Ishchi maoshlari va davomati</CardTitle></CardHeader>
        <CardContent className="p-0">
          {salary.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Ma'lumot yo'q.</div>
          ) : (
            <div className="divide-y">
              {salary.map((r) => (
                <div key={r.worker_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{r.worker_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{Number(r.total_days)} ish kuni</div>
                  </div>
                  <div className="font-semibold">{Number(r.total_amount).toLocaleString()} so'm</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="size-5" />Kesilgan ishlar (turlari va soni)</CardTitle></CardHeader>
        <CardContent className="p-0">
          {cuts.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Davr ichida kesilgan ish yo'q.</div>
          ) : (
            <div className="divide-y">
              {cuts.map((r) => (
                <div key={r.order_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{r.product_name} {r.color ? <span className="text-muted-foreground">· {r.color}</span> : null}</div>
                    <div className="text-xs text-muted-foreground">Buyurtma: {r.order_number}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{Number(r.total_quantity).toLocaleString()} dona</div>
                    {Number(r.total_rejected) > 0 && <div className="text-xs text-red-400">Brak: {r.total_rejected}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card><CardContent className="py-5">
      <div className="text-xs uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="text-2xl font-display mt-1">{value}</div>
    </CardContent></Card>
  );
}
