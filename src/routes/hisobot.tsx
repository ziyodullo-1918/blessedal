import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import {
  reportByRange,
  reportByPeriod,
  listPayrollPeriods,
  createPayrollPeriod,
  closeAndStartNextPeriod,
  reopenPayrollPeriod,
  deletePayrollPeriod,
  type ReportRow,
  type PayrollPeriod,
} from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtMoney, fmtDate } from "@/lib/format";
import { ChevronDown, ChevronRight, Lock, Unlock, Trash2, Download, Share2, FileText, Play } from "lucide-react";
import { toast } from "sonner";
import { fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/hisobot")({
  component: () => (
    <AuthProvider>
      <RequireAuth>
        <Page />
      </RequireAuth>
    </AuthProvider>
  ),
});

type WorkerAgg = {
  workerId: string;
  workerName: string;
  totalQty: number;
  totalSalary: number;
  jobs: number;
  items: ReportRow[];
};

type ProductAgg = {
  productId: string;
  productName: string;
  totalQty: number;
  totalSalary: number;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function defaultPeriodLabel(start: string, end: string) {
  return `${start} — ${end}`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function Page() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedId, setSelectedId] = useState<string>("custom");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(todayISO());

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openWorker, setOpenWorker] = useState<string | null>(null);

  const hasOpenPeriod = useMemo(() => periods.some((p) => !p.closed_at), [periods]);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === selectedId) ?? null,
    [periods, selectedId],
  );

  const range = useMemo(() => {
    const s = selectedPeriod?.start_date ?? customStart;
    const e = selectedPeriod?.end_date ?? customEnd;
    // end exclusive: add 1 day
    const start = new Date(s + "T00:00:00Z").toISOString();
    const endDate = new Date(e + "T00:00:00Z");
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end = endDate.toISOString();
    return { start, end, sLabel: s, eLabel: e };
  }, [selectedPeriod, customStart, customEnd]);

  const loadPeriods = () => {
    listPayrollPeriods().then(setPeriods).catch(console.error);
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    setLoading(true);
    const promise = selectedPeriod
      ? reportByPeriod(selectedPeriod.id)
      : reportByRange(range.start, range.end);
    promise
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedPeriod, range.start, range.end]);

  const workers = useMemo<WorkerAgg[]>(() => {
    const map = new Map<string, WorkerAgg>();
    for (const a of rows) {
      const id = a.worker.id;
      const name = a.worker.full_name;
      const salary = a.quantity * Number(a.unit_price);
      const r = map.get(id) ?? {
        workerId: id,
        workerName: name,
        totalQty: 0,
        totalSalary: 0,
        jobs: 0,
        items: [],
      };
      r.totalQty += a.quantity;
      r.totalSalary += salary;
      r.jobs += 1;
      r.items.push(a);
      map.set(id, r);
    }
    return [...map.values()].sort((a, b) => b.totalSalary - a.totalSalary);
  }, [rows]);

  const products = useMemo<ProductAgg[]>(() => {
    const map = new Map<string, ProductAgg>();
    for (const a of rows) {
      const id = a.product?.id ?? "—";
      const name = a.product?.name ?? "—";
      const salary = a.quantity * Number(a.unit_price);
      const r = map.get(id) ?? { productId: id, productName: name, totalQty: 0, totalSalary: 0 };
      r.totalQty += a.quantity;
      r.totalSalary += salary;
      map.set(id, r);
    }
    return [...map.values()].sort((a, b) => b.totalQty - a.totalQty);
  }, [rows]);

  const grand = useMemo(() => rows.reduce((s, r) => s + r.quantity * Number(r.unit_price), 0), [rows]);

  const handleStartPeriod = async () => {
    const today = todayISO();
    const end = new Date();
    end.setDate(end.getDate() + 29);
    const endISO = end.toISOString().slice(0, 10);
    try {
      const p = await createPayrollPeriod({
        label: `${today} dan boshlangan davr`,
        start_date: today,
        end_date: endISO,
      });
      toast.success("Yangi davr boshlandi");
      loadPeriods();
      setSelectedId(p.id);
    } catch (e) {
      console.error(e);
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleCloseAndStart = async () => {
    if (!selectedPeriod) return;
    if (!confirm(`"${selectedPeriod.label}" davrini tugatasizmi? Yangi davr avtomatik boshlanadi va jarayondagi topshiriqlar yangi davrga ko'chiriladi.`)) return;
    try {
      const oldEnd = new Date(selectedPeriod.end_date + "T00:00:00Z");
      oldEnd.setUTCDate(oldEnd.getUTCDate() + 1);
      const nextLabel = `${oldEnd.toISOString().slice(0, 10)} dan boshlangan davr`;
      const newId = await closeAndStartNextPeriod(selectedPeriod.id, nextLabel);
      toast.success("Davr tugatildi, yangi davr ochildi");
      loadPeriods();
      setSelectedId(newId);
    } catch (e: any) {
      toast.error(e.message ?? "Xatolik");
    }
  };

  const handleReopen = async () => {
    if (!selectedPeriod) return;
    await reopenPayrollPeriod(selectedPeriod.id);
    toast.success("Davr qayta ochildi");
    loadPeriods();
  };

  const handleDelete = async () => {
    if (!selectedPeriod) return;
    if (!confirm("Bu davrni o'chirmoqchimisiz?")) return;
    await deletePayrollPeriod(selectedPeriod.id);
    toast.success("O'chirildi");
    setSelectedId("custom");
    loadPeriods();
  };

  const periodTitle = selectedPeriod
    ? selectedPeriod.label
    : `${range.sLabel} — ${range.eLabel}`;
  const fileBase = `hisobot_${(periodTitle || "davr").replace(/[^a-z0-9_-]+/gi, "_")}`;

  const exportCSV = () => {
    const header = ["Ishchi", "Sana (berilgan)", "Sana (bajarilgan)", "Mahsulot", "Miqdor", "Narx", "Summa"];
    const lines = [header.join(",")];
    for (const w of workers) {
      for (const it of w.items) {
        const sum = it.quantity * Number(it.unit_price);
        const row = [
          w.workerName,
          fmtDateTime(it.started_at),
          fmtDateTime(it.completed_at),
          it.product?.name ?? "",
          it.quantity,
          Number(it.unit_price),
          sum,
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
        lines.push(row.join(","));
      }
    }
    lines.push("");
    lines.push(`"JAMI","","","","","","${grand}"`);
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV yuklab olindi");
  };

  const buildHTML = () => {
    const rowsHtml = workers
      .map((w) => {
        // Aggregate by product for this worker
        const byProduct = new Map<string, { name: string; qty: number; sum: number }>();
        for (const it of w.items) {
          const pid = it.product?.id ?? "—";
          const pname = it.product?.name ?? "—";
          const sum = it.quantity * Number(it.unit_price);
          const cur = byProduct.get(pid) ?? { name: pname, qty: 0, sum: 0 };
          cur.qty += it.quantity;
          cur.sum += sum;
          byProduct.set(pid, cur);
        }
        const summaryRows = [...byProduct.values()]
          .sort((a, b) => b.qty - a.qty)
          .map(
            (p) => `<tr>
              <td style="border:1px solid #bbf7d0;padding:6px">${escapeHtml(p.name)}</td>
              <td style="border:1px solid #bbf7d0;padding:6px;text-align:right">${p.qty}</td>
              <td style="border:1px solid #bbf7d0;padding:6px;text-align:right"><b>${fmtMoney(p.sum)}</b></td>
            </tr>`,
          )
          .join("");

        return `
        <h3 style="margin:18px 0 6px;color:#166534">${escapeHtml(w.workerName)} — ${fmtMoney(w.totalSalary)}</h3>
        <div style="font-size:11px;color:#64748b;margin-bottom:6px">Mahsulotlar bo'yicha jamlanma:</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px">
          <thead><tr style="background:#dcfce7">
            <th style="border:1px solid #bbf7d0;padding:6px;text-align:left">Mahsulot</th>
            <th style="border:1px solid #bbf7d0;padding:6px;text-align:right">Umumiy miqdor</th>
            <th style="border:1px solid #bbf7d0;padding:6px;text-align:right">Jami summa</th>
          </tr></thead>
          <tbody>${summaryRows}</tbody>
        </table>
        <div style="font-size:11px;color:#64748b;margin:8px 0 4px">Topshiriqlar tafsiloti:</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#f1f5f9">
            <th style="border:1px solid #e5e7eb;padding:6px;text-align:left">Berilgan</th>
            <th style="border:1px solid #e5e7eb;padding:6px;text-align:left">Bajarilgan</th>
            <th style="border:1px solid #e5e7eb;padding:6px;text-align:left">Mahsulot</th>
            <th style="border:1px solid #e5e7eb;padding:6px;text-align:right">Miqdor</th>
            <th style="border:1px solid #e5e7eb;padding:6px;text-align:right">Narx</th>
            <th style="border:1px solid #e5e7eb;padding:6px;text-align:right">Summa</th>
          </tr></thead>
          <tbody>
          ${w.items
            .map(
              (it) => `<tr>
              <td style="border:1px solid #e5e7eb;padding:6px">${fmtDateTime(it.started_at)}</td>
              <td style="border:1px solid #e5e7eb;padding:6px">${fmtDateTime(it.completed_at)}</td>
              <td style="border:1px solid #e5e7eb;padding:6px">${escapeHtml(it.product?.name ?? "—")}</td>
              <td style="border:1px solid #e5e7eb;padding:6px;text-align:right">${it.quantity}</td>
              <td style="border:1px solid #e5e7eb;padding:6px;text-align:right">${fmtMoney(it.unit_price)}</td>
              <td style="border:1px solid #e5e7eb;padding:6px;text-align:right"><b>${fmtMoney(it.quantity * Number(it.unit_price))}</b></td>
            </tr>`,
            )
            .join("")}
          </tbody>
        </table>`;
      })
      .join("");

    return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>${escapeHtml(periodTitle)}</title>
      <style>body{font-family:Inter,system-ui,sans-serif;color:#0f172a;padding:24px;max-width:900px;margin:auto}
      h1{color:#15803d;margin:0 0 4px}.muted{color:#64748b;font-size:12px}
      .total{font-size:28px;color:#15803d;font-weight:700;margin:12px 0}</style></head>
      <body>
        <h1>Tikuv Cex — Oylik hisobot</h1>
        <div class="muted">Davr: ${escapeHtml(periodTitle)} · Chop: ${fmtDateTime(new Date())}</div>
        <div class="total">Umumiy: ${fmtMoney(grand)}</div>
        ${rowsHtml || '<p class="muted">Ma\'lumot yo\'q</p>'}
        <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
      </body></html>`;
  };

  const exportPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return toast.error("Pop-up bloklangan");
    w.document.write(buildHTML());
    w.document.close();
  };

  const buildProductsHTML = () => {
    const totalQty = products.reduce((s, p) => s + p.totalQty, 0);
    const rowsHtml = products
      .map(
        (p) => `<tr>
          <td style="border:1px solid #e5e7eb;padding:8px">${escapeHtml(p.productName)}</td>
          <td style="border:1px solid #e5e7eb;padding:8px;text-align:right">${p.totalQty}</td>
          <td style="border:1px solid #e5e7eb;padding:8px;text-align:right"><b>${fmtMoney(p.totalSalary)}</b></td>
        </tr>`,
      )
      .join("");
    return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Mahsulotlar — ${escapeHtml(periodTitle)}</title>
      <style>body{font-family:Inter,system-ui,sans-serif;color:#0f172a;padding:24px;max-width:900px;margin:auto}
      h1{color:#15803d;margin:0 0 4px}.muted{color:#64748b;font-size:12px}
      .total{font-size:24px;color:#15803d;font-weight:700;margin:12px 0}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
      th{background:#dcfce7;border:1px solid #bbf7d0;padding:8px;text-align:left}
      th.right{text-align:right}</style></head>
      <body>
        <h1>Tikuv Cex — Mahsulotlar hisoboti</h1>
        <div class="muted">Davr: ${escapeHtml(periodTitle)} · Chop: ${fmtDateTime(new Date())}</div>
        <div class="total">Jami mahsulot: ${totalQty} dona · Umumiy: ${fmtMoney(grand)}</div>
        <table>
          <thead><tr>
            <th>Mahsulot</th>
            <th class="right">Tayyorlangan miqdor</th>
            <th class="right">Jami summa</th>
          </tr></thead>
          <tbody>${rowsHtml || '<tr><td colspan="3" style="padding:12px;color:#64748b">Ma\'lumot yo\'q</td></tr>'}</tbody>
        </table>
        <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
      </body></html>`;
  };

  const exportProductsPDF = () => {
    const w = window.open("", "_blank");
    if (!w) return toast.error("Pop-up bloklangan");
    w.document.write(buildProductsHTML());
    w.document.close();
  };


  const sharePDF = async () => {
    const html = buildHTML().replace("setTimeout(()=>window.print(),300)", "");
    const blob = new Blob([html], { type: "text/html" });
    const file = new File([blob], `${fileBase}.html`, { type: "text/html" });
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void>; canShare?: (d: ShareData) => boolean };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ title: periodTitle, text: `Hisobot: ${periodTitle} — ${fmtMoney(grand)}`, files: [file] });
        return;
      } catch { /* cancelled */ }
    }
    if (nav.share) {
      try {
        await nav.share({ title: periodTitle, text: `Hisobot: ${periodTitle} — Umumiy: ${fmtMoney(grand)}` });
        return;
      } catch { /* cancelled */ }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fayl yuklab olindi");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-4xl">Oylik hisobot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          15 kunlik davrlarni boshqaring va to'liq tarixni ko'ring
        </p>
      </div>

      {/* Period selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hisobot davri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label>Saqlangan davr</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">— Maxsus oraliq —</SelectItem>
                  {periods.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label} {p.closed_at ? "🔒" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPeriod && (
              <div className="flex flex-wrap items-end gap-2">
                {selectedPeriod.closed_at ? (
                  <Button variant="outline" onClick={handleReopen}>
                    <Unlock className="size-4" /> Qayta ochish
                  </Button>
                ) : (
                  <Button onClick={handleCloseAndStart}>
                    <Lock className="size-4" /> Davrni tugatish
                  </Button>
                )}
                <Button variant="outline" size="icon" onClick={handleDelete}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </div>

          {!selectedPeriod && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Boshlanish</Label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tugash</Label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            </div>
          )}

          {selectedPeriod && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {selectedPeriod.start_date} — {selectedPeriod.end_date}
              </span>
              {selectedPeriod.closed_at ? (
                <Badge variant="secondary">Yopilgan: {fmtDate(selectedPeriod.closed_at)}</Badge>
              ) : (
                <Badge>Ochiq</Badge>
              )}
            </div>
          )}

          {!hasOpenPeriod && (
            <div className="rounded-md border bg-muted/30 p-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Hozirda ochiq davr yo'q</div>
                <div className="text-xs text-muted-foreground">Yangi davrni boshlang — bugundan boshlanadi</div>
              </div>
              <Button onClick={handleStartPeriod}>
                <Play className="size-4" /> Davrni boshlash
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Umumiy to'lov ({range.sLabel} — {range.eLabel})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="font-display text-4xl">{fmtMoney(grand)}</div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={exportPDF} disabled={rows.length === 0}>
              <FileText className="size-4" /> Ish haqi PDF
            </Button>
            <Button variant="outline" onClick={exportProductsPDF} disabled={products.length === 0}>
              <FileText className="size-4" /> Mahsulotlar PDF
            </Button>
            <Button variant="outline" onClick={exportCSV} disabled={rows.length === 0}>
              <Download className="size-4" /> CSV (Excel)
            </Button>
            <Button variant="outline" onClick={sharePDF} disabled={rows.length === 0}>
              <Share2 className="size-4" /> Ulashish
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products summary */}
      <Card>
        <CardHeader>
          <CardTitle>Mahsulotlar bo'yicha</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Yuklanmoqda…</p>
          ) : products.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Ma'lumot yo'q.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr className="border-b">
                    <th className="px-4 py-3">Mahsulot</th>
                    <th className="px-4 py-3 text-right">Tayyorlangan miqdor</th>
                    <th className="px-4 py-3 text-right">Jami summa</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.productId} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{p.productName}</td>
                      <td className="px-4 py-3 text-right font-mono">{p.totalQty}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-primary">
                        {fmtMoney(p.totalSalary)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Workers with expandable history */}
      <Card>
        <CardHeader>
          <CardTitle>Ishchilar bo'yicha (tarix bilan)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Yuklanmoqda…</p>
          ) : workers.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Bu davrda topshiriqlar yo'q.</p>
          ) : (
            <div className="divide-y">
              {workers.map((w) => {
                const expanded = openWorker === w.workerId;
                return (
                  <div key={w.workerId}>
                    <button
                      onClick={() => setOpenWorker(expanded ? null : w.workerId)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/50"
                    >
                      {expanded ? (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      )}
                      <div className="flex-1 font-medium">{w.workerName}</div>
                      <div className="hidden text-right font-mono text-sm text-muted-foreground sm:block">
                        {w.jobs} ta · {w.totalQty} dona
                      </div>
                      <div className="w-32 text-right font-mono font-semibold text-primary">
                        {fmtMoney(w.totalSalary)}
                      </div>
                    </button>
                    {expanded && (
                      <div className="bg-muted/30 px-4 pb-4">
                        <div className="overflow-x-auto rounded-md border bg-background">
                          <table className="w-full text-sm">
                            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                              <tr className="border-b">
                                <th className="px-3 py-2">Berilgan</th>
                                <th className="px-3 py-2">Bajarilgan</th>
                                <th className="px-3 py-2">Mahsulot</th>
                                <th className="px-3 py-2 text-right">Miqdor</th>
                                <th className="px-3 py-2 text-right">Narx</th>
                                <th className="px-3 py-2 text-right">Summa</th>
                              </tr>
                            </thead>
                            <tbody>
                              {w.items.map((it) => (
                                <tr key={it.id} className="border-b last:border-0">
                                  <td className="px-3 py-2 font-mono text-xs">
                                    {fmtDateTime(it.started_at)}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-xs">
                                    {fmtDateTime(it.completed_at)}
                                  </td>
                                  <td className="px-3 py-2">{it.product?.name ?? "—"}</td>
                                  <td className="px-3 py-2 text-right font-mono">{it.quantity}</td>
                                  <td className="px-3 py-2 text-right font-mono">
                                    {fmtMoney(it.unit_price)}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-semibold">
                                    {fmtMoney(it.quantity * Number(it.unit_price))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
