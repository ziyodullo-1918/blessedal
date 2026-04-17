import { createFileRoute } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useMemo, useState } from "react";
import {
  reportByRange,
  listPayrollPeriods,
  createPayrollPeriod,
  closePayrollPeriod,
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
import { ChevronDown, ChevronRight, Lock, Unlock, Trash2, Plus, Download, Share2, FileText } from "lucide-react";
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

  // New period form
  const [newLabel, setNewLabel] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

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
    reportByRange(range.start, range.end)
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [range.start, range.end]);

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

  const handleCreatePeriod = async () => {
    if (!newStart || !newEnd) return toast.error("Sana kiriting");
    if (newStart > newEnd) return toast.error("Boshlanish sanasi tugashdan keyin");
    try {
      const p = await createPayrollPeriod({
        label: newLabel.trim() || defaultPeriodLabel(newStart, newEnd),
        start_date: newStart,
        end_date: newEnd,
      });
      toast.success("Davr yaratildi");
      setNewLabel("");
      setNewStart("");
      setNewEnd("");
      loadPeriods();
      setSelectedId(p.id);
    } catch (e) {
      console.error(e);
      toast.error("Xatolik yuz berdi");
    }
  };

  const handleClose = async () => {
    if (!selectedPeriod) return;
    await closePayrollPeriod(selectedPeriod.id);
    toast.success("Davr yopildi");
    loadPeriods();
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
      .map(
        (w) => `
        <h3 style="margin:18px 0 6px;color:#166534">${escapeHtml(w.workerName)} — ${fmtMoney(w.totalSalary)}</h3>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:#dcfce7">
            <th style="border:1px solid #bbf7d0;padding:6px;text-align:left">Berilgan</th>
            <th style="border:1px solid #bbf7d0;padding:6px;text-align:left">Bajarilgan</th>
            <th style="border:1px solid #bbf7d0;padding:6px;text-align:left">Mahsulot</th>
            <th style="border:1px solid #bbf7d0;padding:6px;text-align:right">Miqdor</th>
            <th style="border:1px solid #bbf7d0;padding:6px;text-align:right">Narx</th>
            <th style="border:1px solid #bbf7d0;padding:6px;text-align:right">Summa</th>
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
        </table>`,
      )
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
              <div className="flex items-end gap-2">
                {selectedPeriod.closed_at ? (
                  <Button variant="outline" onClick={handleReopen}>
                    <Unlock className="size-4" /> Qayta ochish
                  </Button>
                ) : (
                  <Button onClick={handleClose}>
                    <Lock className="size-4" /> Davrni yopish
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

          <div className="rounded-md border bg-muted/30 p-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Yangi davr yaratish (15 kunlik)
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Nom</Label>
                <Input
                  placeholder="Aprel 1-yarmi"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Boshlanish</Label>
                <Input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tugash</Label>
                <Input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreatePeriod} className="w-full">
                  <Plus className="size-4" /> Qo'shish
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
            Umumiy to'lov ({range.sLabel} — {range.eLabel})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="font-display text-4xl">{fmtMoney(grand)}</div>
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
