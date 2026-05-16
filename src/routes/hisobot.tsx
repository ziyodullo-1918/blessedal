import { createFileRoute } from "@tanstack/react-router";
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
  updatePayrollPeriod,
  autoPeriodLabel,
  type ReportRow,
  type PayrollPeriod,
} from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fmtMoney, fmtDate, fmtDateTime } from "@/lib/format";
import {
  ChevronDown,
  ChevronRight,
  Lock,
  Unlock,
  Trash2,
  Download,
  Share2,
  FileText,
  Play,
  History,
  Filter,
  CalendarDays,
  Users,
  Package,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ConfirmDialog";
import { ColorChip } from "@/components/ColorChip";

export const Route = createFileRoute("/hisobot")({
  component: () => (
    <RequireAuth>
      <Page />
    </RequireAuth>
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

function escapeHtml(s: string) {
  return s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function Page() {
  const confirm = useConfirm();
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedId, setSelectedId] = useState<string>("current");
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [workerFilter, setWorkerFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [openWorker, setOpenWorker] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Period start/close dialogs
  const [startOpen, setStartOpen] = useState(false);
  const [startDate, setStartDate] = useState(todayISO());
  const [startLabel, setStartLabel] = useState(autoPeriodLabel(todayISO()));
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeDate, setCloseDate] = useState(todayISO());
  const [nextStart, setNextStart] = useState(todayISO());
  const [nextLabel, setNextLabel] = useState(autoPeriodLabel(todayISO()));
  const [currentStart, setCurrentStart] = useState(todayISO());

  // Edit period dialog
  const [editPeriod, setEditPeriod] = useState<PayrollPeriod | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const openEditDialog = (p: PayrollPeriod) => {
    setEditPeriod(p);
    setEditLabel(p.label);
    setEditStart(p.start_date);
    setEditEnd(p.end_date);
  };

  const handleSaveEdit = async () => {
    if (!editPeriod) return;
    if (!editStart || !editEnd) return toast.error("Sanalarni kiriting");
    if (editEnd < editStart) return toast.error("Tugash sanasi boshlanishdan keyin bo'lishi kerak");
    try {
      await updatePayrollPeriod(editPeriod.id, {
        label: editLabel.trim() || editPeriod.label,
        start_date: editStart,
        end_date: editEnd,
      });
      toast.success("Davr yangilandi");
      setEditPeriod(null);
      loadPeriods();
    } catch (e: any) {
      toast.error(e?.message ?? "Xatolik");
    }
  };

  const openPeriod = useMemo(() => periods.find((p) => !p.closed_at) ?? null, [periods]);
  const closedPeriods = useMemo(() => periods.filter((p) => p.closed_at), [periods]);

  const selectedPeriod = useMemo(() => {
    if (selectedId === "current") return openPeriod;
    if (selectedId === "custom") return null;
    return periods.find((p) => p.id === selectedId) ?? null;
  }, [periods, selectedId, openPeriod]);

  const isCustom = selectedId === "custom";

  const range = useMemo(() => {
    const s = selectedPeriod?.start_date ?? customStart;
    const e = selectedPeriod?.end_date ?? customEnd;
    // Use LOCAL midnight (not UTC) so completed_at timestamps in the user's
    // timezone fall within the expected day range.
    const [sy, sm, sd] = s.split("-").map(Number);
    const [ey, em, ed] = e.split("-").map(Number);
    const startLocal = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    const endLocal = new Date(ey, em - 1, ed + 1, 0, 0, 0, 0); // exclusive next day
    return {
      start: startLocal.toISOString(),
      end: endLocal.toISOString(),
      sLabel: s,
      eLabel: e,
    };
  }, [selectedPeriod, customStart, customEnd]);

  const loadPeriods = () => {
    listPayrollPeriods().then(setPeriods).catch(console.error);
  };

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const promise = selectedPeriod
      ? reportByPeriod(selectedPeriod.id)
      : reportByRange(range.start, range.end);
    promise
      .then((r) => {
        if (!cancelled) setRows(r);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPeriod?.id, range.start, range.end]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (workerFilter !== "all" && r.worker.id !== workerFilter) return false;
      if (q) {
        const hay = `${r.worker.full_name} ${r.product?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, workerFilter, search]);

  const workers = useMemo<WorkerAgg[]>(() => {
    const map = new Map<string, WorkerAgg>();
    for (const a of filteredRows) {
      const id = a.worker.id;
      const salary = a.quantity * Number(a.unit_price);
      const r = map.get(id) ?? {
        workerId: id,
        workerName: a.worker.full_name,
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
  }, [filteredRows]);

  const products = useMemo<ProductAgg[]>(() => {
    const map = new Map<string, ProductAgg>();
    for (const a of filteredRows) {
      const id = a.product?.id ?? "—";
      const name = a.product?.name ?? "—";
      const salary = a.quantity * Number(a.unit_price);
      const r = map.get(id) ?? { productId: id, productName: name, totalQty: 0, totalSalary: 0 };
      r.totalQty += a.quantity;
      r.totalSalary += salary;
      map.set(id, r);
    }
    return [...map.values()].sort((a, b) => b.totalQty - a.totalQty);
  }, [filteredRows]);

  const allWorkersForFilter = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of rows) m.set(r.worker.id, r.worker.full_name);
    return [...m.entries()].map(([id, name]) => ({ id, name }));
  }, [rows]);

  const grand = useMemo(
    () => filteredRows.reduce((s, r) => s + r.quantity * Number(r.unit_price), 0),
    [filteredRows],
  );
  const totalQty = useMemo(() => filteredRows.reduce((s, r) => s + r.quantity, 0), [filteredRows]);

  const openStartDialog = () => {
    const t = todayISO();
    setStartDate(t);
    setStartLabel(autoPeriodLabel(t));
    setStartOpen(true);
  };

  const handleStartPeriod = async () => {
    const end = new Date(startDate);
    end.setDate(end.getDate() + 29);
    try {
      await createPayrollPeriod({
        label: startLabel.trim() || autoPeriodLabel(startDate),
        start_date: startDate,
        end_date: end.toISOString().slice(0, 10),
      });
      toast.success("Yangi davr boshlandi");
      loadPeriods();
      setSelectedId("current");
      setStartOpen(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Xatolik yuz berdi");
    }
  };

  const openCloseDialog = () => {
    if (!openPeriod) {
      toast.error("Ochiq davr yo'q");
      return;
    }
    const t = todayISO();
    setCloseDate(t);
    setCurrentStart(openPeriod.start_date);
    // Next period starts day after close
    const next = new Date(t);
    next.setDate(next.getDate() + 1);
    const nISO = next.toISOString().slice(0, 10);
    setNextStart(nISO);
    setNextLabel(autoPeriodLabel(nISO));
    setCloseOpen(true);
  };

  const handleCloseAndStart = async () => {
    if (!openPeriod) return;
    try {
      if (currentStart && currentStart !== openPeriod.start_date) {
        await updatePayrollPeriod(openPeriod.id, { start_date: currentStart });
      }
      await closeAndStartNextPeriod(
        openPeriod.id,
        nextLabel.trim() || autoPeriodLabel(nextStart),
        { closeDate, newStartDate: nextStart },
      );
      toast.success("Davr tugatildi, yangi davr ochildi");
      loadPeriods();
      setSelectedId("current");
      setCloseOpen(false);
    } catch (e: any) {
      toast.error(e.message ?? "Xatolik");
    }
  };

  const handleReopen = async (id: string) => {
    await reopenPayrollPeriod(id);
    toast.success("Davr qayta ochildi");
    loadPeriods();
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Davrni o'chirasizmi?",
      description: "Bu amalni qaytarib bo'lmaydi.",
      confirmText: "O'chirish",
      destructive: true,
    });
    if (!ok) return;
    await deletePayrollPeriod(id);
    toast.success("O'chirildi");
    if (selectedId === id) setSelectedId("current");
    loadPeriods();
  };

  const periodTitle = selectedPeriod
    ? selectedPeriod.label
    : `${range.sLabel} — ${range.eLabel}`;
  const fileBase = `hisobot_${(periodTitle || "davr").replace(/[^a-z0-9_-]+/gi, "_")}`;

  const exportCSV = () => {
    const header = [
      "Ishchi",
      "Sana (berilgan)",
      "Sana (bajarilgan)",
      "Mahsulot",
      "Rang",
      "Miqdor",
      "Narx",
      "Summa",
    ];
    const lines = [header.join(",")];
    for (const w of workers) {
      for (const it of w.items) {
        const sum = it.quantity * Number(it.unit_price);
        const colorCell = it.color_name && it.color
          ? `${it.color_name} (${it.color})`
          : it.color_name || it.color || "";
        const row = [
          w.workerName,
          fmtDateTime(it.started_at),
          fmtDateTime(it.completed_at),
          it.product?.name ?? "",
          colorCell,
          it.quantity,
          Number(it.unit_price),
          sum,
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
        lines.push(row.join(","));
      }
    }
    lines.push("");
    lines.push(`"JAMI","","","","","","","${grand}"`);
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileBase}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV yuklab olindi");
  };

  const buildHTML = () => {
    const workerBlocks = workers
      .map((w, idx) => {
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
              <td>${escapeHtml(p.name)}</td>
              <td class="r">${p.qty}</td>
              <td class="r"><b>${fmtMoney(p.sum)}</b></td>
            </tr>`,
          )
          .join("");
        const detailRows = w.items
          .map(
            (it) => `<tr>
              <td>${fmtDateTime(it.started_at)}</td>
              <td>${fmtDateTime(it.completed_at)}</td>
              <td>${(() => {
                const c = it.color || "";
                const isHex = /^#[0-9a-fA-F]{6}$/.test(c);
                const label = it.color_name || (isHex ? "" : c);
                const dot = c
                  ? `<span class="dot" style="${isHex ? `background:${escapeHtml(c)};` : ""}"></span>`
                  : "";
                const labelHtml = label ? ` <span class="muted">(${escapeHtml(label)})</span>` : "";
                return `${dot}${escapeHtml(it.product?.name ?? "—")}${labelHtml}`;
              })()}</td>
              <td class="r">${it.quantity}</td>
              <td class="r">${fmtMoney(it.unit_price)}</td>
              <td class="r"><b>${fmtMoney(it.quantity * Number(it.unit_price))}</b></td>
            </tr>`,
          )
          .join("");

        return `
        <section class="half">
          <div class="hdr">
            <div>
              <div class="title">Blessed Al — Oylik hisobot</div>
              <div class="muted">${escapeHtml(periodTitle)}</div>
            </div>
            <div class="total">${fmtMoney(w.totalSalary)}</div>
          </div>
          <h3 class="wname">${escapeHtml(w.workerName)}</h3>
          <table class="t">
            <thead><tr><th>Mahsulot</th><th class="r">Miqdor</th><th class="r">Summa</th></tr></thead>
            <tbody>${summaryRows}</tbody>
          </table>
          <div class="muted small">Topshiriqlar:</div>
          <table class="t">
            <thead><tr><th>Berilgan</th><th>Bajarilgan</th><th>Mahsulot</th><th class="r">Mq</th><th class="r">Narx</th><th class="r">Summa</th></tr></thead>
            <tbody>${detailRows}</tbody>
          </table>
        </section>`;
      })
      .join("");

    // Group workers in pairs (2 per page) — side by side (left/right halves of A4 landscape)
    const sections = workerBlocks.split("</section>").filter((s) => s.trim()).map((s) => s + "</section>");
    const pagesHtml: string[] = [];
    for (let i = 0; i < sections.length; i += 2) {
      const a = sections[i] ?? "";
      const b = sections[i + 1] ?? '<section class="half empty"></section>';
      pagesHtml.push(`<div class="page">${a}<div class="vcut"></div>${b}</div>`);
    }
    const finalBlocks = pagesHtml.join("");

    return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>${escapeHtml(periodTitle)}</title>
      <style>
      @page { size: A4 landscape; margin: 5mm; }
      *{box-sizing:border-box}
      body{font-family:Inter,system-ui,sans-serif;color:#0f172a;margin:0;padding:0;background:#fff;font-size:7.5px;line-height:1.15}
      .page{display:flex;flex-direction:row;gap:0;width:100%;height:200mm;page-break-after:always;page-break-inside:avoid}
      .page:last-child{page-break-after:auto}
      .half{flex:1 1 50%;width:50%;max-width:50%;padding:2mm 3mm;overflow:hidden;display:flex;flex-direction:column}
      .vcut{width:0;border-left:1px dashed #94a3b8;margin:0 1mm}
      .hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1.5px solid #15803d;padding-bottom:1mm;margin-bottom:1mm}
      .title{color:#15803d;font-weight:700;font-size:9.5px}
      .muted{color:#64748b;font-size:7px}
      .small{font-size:7px;margin:0.5mm 0}
      .total{font-size:11px;color:#15803d;font-weight:700;white-space:nowrap}
      .wname{margin:0.5mm 0 1mm;color:#15803d;font-size:10px;font-weight:600}
      table.t{width:100%;border-collapse:collapse;font-size:6.8px;margin-bottom:0.5mm;table-layout:fixed}
      table.t th{background:#dcfce7;border:1px solid #bbf7d0;padding:0.6px 2px;text-align:left;font-weight:600;line-height:1.05}
      table.t td{border:1px solid #dcfce7;padding:0.6px 2px;word-wrap:break-word;overflow-wrap:break-word;line-height:1.05}
      table.t .r{text-align:right}
      .dot{display:inline-block;width:5px;height:5px;border-radius:50%;border:1px solid #cbd5e1;vertical-align:middle;margin-right:1px}
      </style></head>
      <body>
        ${finalBlocks || '<p class="muted" style="padding:24px">Ma\'lumot yo\'q</p>'}
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
    const tQty = products.reduce((s, p) => s + p.totalQty, 0);
    const rowsHtml = products
      .map(
        (p) => `<tr>
          <td style="border:1px solid #dcfce7;padding:8px">${escapeHtml(p.productName)}</td>
          <td style="border:1px solid #dcfce7;padding:8px;text-align:right">${p.totalQty}</td>
          <td style="border:1px solid #dcfce7;padding:8px;text-align:right"><b>${fmtMoney(p.totalSalary)}</b></td>
        </tr>`,
      )
      .join("");
    return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Mahsulotlar — ${escapeHtml(periodTitle)}</title>
      <style>body{font-family:Inter,system-ui,sans-serif;color:#0f172a;padding:24px;max-width:900px;margin:auto;background:#f0fdf4}
      h1{color:#15803d;margin:0 0 4px}.muted{color:#64748b;font-size:12px}
      .total{font-size:24px;color:#15803d;font-weight:700;margin:12px 0}
      table{width:100%;border-collapse:collapse;font-size:13px;margin-top:12px}
      th{background:#dcfce7;border:1px solid #bbf7d0;padding:8px;text-align:left}
      th.right{text-align:right}</style></head>
      <body>
        <h1>Blessed Al — Mahsulotlar hisoboti</h1>
        <div class="muted">Davr: ${escapeHtml(periodTitle)} · Chop: ${fmtDateTime(new Date())}</div>
        <div class="total">Jami mahsulot: ${tQty} dona · Umumiy: ${fmtMoney(grand)}</div>
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
    const nav = navigator as Navigator & {
      share?: (d: ShareData) => Promise<void>;
      canShare?: (d: ShareData) => boolean;
    };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({
          title: periodTitle,
          text: `Hisobot: ${periodTitle} — ${fmtMoney(grand)}`,
          files: [file],
        });
        return;
      } catch {
        /* cancelled */
      }
    }
    if (nav.share) {
      try {
        await nav.share({
          title: periodTitle,
          text: `Hisobot: ${periodTitle} — Umumiy: ${fmtMoney(grand)}`,
        });
        return;
      } catch {
        /* cancelled */
      }
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
    <div className="space-y-5">
      {/* Header bar */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-background p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-primary sm:text-4xl">Hisobotlar</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-mono text-muted-foreground">
                {range.sLabel} → {range.eLabel}
              </span>
              {openPeriod && (
                <Badge className="bg-primary/15 text-primary hover:bg-primary/20">
                  <CalendarDays className="mr-1 size-3" />
                  {openPeriod.label} · boshlangan: {fmtDate(openPeriod.start_date)}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
                  <History className="size-4" /> Davrlar tarixi
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Davrlar tarixi</DialogTitle>
                </DialogHeader>
                <PeriodHistory
                  periods={periods}
                  closedPeriods={closedPeriods}
                  openPeriod={openPeriod}
                  onView={(id) => {
                    setSelectedId(id);
                    setHistoryOpen(false);
                  }}
                  onReopen={handleReopen}
                  onDelete={handleDelete}
                  onEdit={(p) => {
                    openEditDialog(p);
                    setHistoryOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>

            {openPeriod ? (
              <Button
                onClick={openCloseDialog}
                variant="outline"
                className="border-primary/30 text-primary hover:bg-primary/10"
              >
                <Lock className="size-4" /> Davrni tugatish
              </Button>
            ) : (
              <Button onClick={openStartDialog}>
                <Play className="size-4" /> Davrni boshlash
              </Button>
            )}

            <Button onClick={exportPDF} disabled={rows.length === 0}>
              <Download className="size-4" /> Maoshlar
            </Button>

            <Button
              variant="outline"
              onClick={exportProductsPDF}
              disabled={products.length === 0}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              <FileText className="size-4" /> Mahsulotlar hisoboti
            </Button>
          </div>
        </div>
      </div>

      {/* Start period dialog */}
      <Dialog open={startOpen} onOpenChange={setStartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi davrni boshlash</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Boshlanish sanasi</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setStartLabel(autoPeriodLabel(e.target.value));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Davr nomi (avtomatik)</Label>
              <Input
                value={startLabel}
                onChange={(e) => setStartLabel(e.target.value)}
                placeholder="Aprel boshi"
              />
              <p className="text-xs text-muted-foreground">
                Tahrirlashingiz mumkin yoki avtomatik nom bilan davom eting.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStartOpen(false)}>
                Bekor qilish
              </Button>
              <Button onClick={handleStartPeriod}>
                <Play className="size-4" /> Boshlash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close period dialog */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Davrni tugatish</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Joriy davr yopiladi va yangi davr avtomatik ochiladi. Jarayondagi
              (bajarilmagan) topshiriqlar yangi davrga ko'chiriladi.
            </p>
            {openPeriod && (
              <div className="rounded-md border border-primary/30 bg-primary/10 p-3 text-sm">
                <div className="font-medium text-primary">{openPeriod.label}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  Boshlangan: {fmtDate(openPeriod.start_date)} → tugash: {fmtDate(closeDate)}
                </div>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Yopilish sanasi</Label>
                <Input
                  type="date"
                  value={closeDate}
                  onChange={(e) => {
                    setCloseDate(e.target.value);
                    const next = new Date(e.target.value);
                    next.setDate(next.getDate() + 1);
                    const nISO = next.toISOString().slice(0, 10);
                    setNextStart(nISO);
                    setNextLabel(autoPeriodLabel(nISO));
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Yangi davr boshlanish</Label>
                <Input
                  type="date"
                  value={nextStart}
                  onChange={(e) => {
                    setNextStart(e.target.value);
                    setNextLabel(autoPeriodLabel(e.target.value));
                  }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Yangi davr nomi (avtomatik)</Label>
              <Input
                value={nextLabel}
                onChange={(e) => setNextLabel(e.target.value)}
                placeholder="Aprel ohiri"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCloseOpen(false)}>
                Bekor qilish
              </Button>
              <Button
                onClick={handleCloseAndStart}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Lock className="size-4" /> Tugatish va yangisini boshlash
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit period dialog */}
      <Dialog open={!!editPeriod} onOpenChange={(v) => !v && setEditPeriod(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Davrni tahrirlash</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Davr nomi</Label>
              <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Boshlanish sanasi</Label>
                <Input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tugash sanasi</Label>
                <Input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditPeriod(null)}>Bekor qilish</Button>
              <Button onClick={handleSaveEdit}>Saqlash</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="grid gap-3 p-4 md:grid-cols-5">
          <div className="space-y-1">
            <Label className="text-xs">Davr tanlash</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Joriy davr</SelectItem>
                <SelectItem value="custom">Maxsus oraliq</SelectItem>
                {closedPeriods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    🔒 {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Boshlanish</Label>
            <Input
              type="date"
              disabled={!isCustom}
              value={isCustom ? customStart : (selectedPeriod?.start_date ?? customStart)}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tugash</Label>
            <Input
              type="date"
              disabled={!isCustom}
              value={isCustom ? customEnd : (selectedPeriod?.end_date ?? customEnd)}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-background"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ishchi</Label>
            <Select value={workerFilter} onValueChange={setWorkerFilter}>
              <SelectTrigger className="bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Hammasi</SelectItem>
                {allWorkersForFilter.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Qidirish</Label>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-background pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Umumiy summa"
          value={fmtMoney(grand)}
          tone="primary"
        />
        <StatCard
          label="Umumiy ishlab chiqarish"
          value={`${totalQty} dona`}
          tone="primary"
          icon={<Package className="size-5 text-primary/70" />}
        />
        <StatCard
          label="Ishchilar"
          value={`${workers.length}`}
          tone="warning"
          icon={<Users className="size-5 text-warning/80" />}
        />
      </div>

      {/* Workers report */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Ishchilar oylik hisoboti</CardTitle>
          <span className="font-mono text-xs text-muted-foreground">
            {range.sLabel} → {range.eLabel}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Yuklanmoqda…</p>
          ) : workers.length === 0 ? (
            <div className="m-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-10 text-center text-sm text-muted-foreground">
              Ma'lumot yo'q
            </div>
          ) : (
            <div className="divide-y">
              {workers.map((w) => {
                const expanded = openWorker === w.workerId;
                return (
                  <div key={w.workerId}>
                    <button
                      onClick={() => setOpenWorker(expanded ? null : w.workerId)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-primary/5"
                    >
                      {expanded ? (
                        <ChevronDown className="size-4 text-primary" />
                      ) : (
                        <ChevronRight className="size-4 text-primary" />
                      )}
                      <div className="flex-1 font-medium">{w.workerName}</div>
                      <div className="hidden text-right font-mono text-xs text-muted-foreground sm:block">
                        {w.jobs} ta · {w.totalQty} dona
                      </div>
                      <div className="w-32 text-right font-mono font-semibold text-primary">
                        {fmtMoney(w.totalSalary)}
                      </div>
                    </button>
                    {expanded && (
                      <div className="bg-primary/5 px-4 pb-4">
                        <div className="overflow-x-auto rounded-md border border-primary/20 bg-background">
                          <table className="w-full text-sm">
                            <thead className="bg-primary/10 text-left text-xs uppercase tracking-wider text-primary">
                              <tr>
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
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span>{it.product?.name ?? "—"}</span>
                                      <ColorChip color={it.color} name={it.color_name} />
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">
                                    {it.quantity}
                                  </td>
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

      {/* Products report */}
      <Card className="border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Mahsulot bo'yicha ishlab chiqarish</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={exportProductsPDF}
            disabled={products.length === 0}
            className="border-primary/30 text-primary hover:bg-primary/10"
          >
            <FileText className="size-4" /> PDF
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-sm text-muted-foreground">Yuklanmoqda…</p>
          ) : products.length === 0 ? (
            <div className="m-4 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-10 text-center text-sm text-muted-foreground">
              Ma'lumot yo'q
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-primary/10 text-left text-xs uppercase tracking-wider text-primary">
                  <tr>
                    <th className="px-4 py-3">Mahsulot</th>
                    <th className="px-4 py-3 text-right">Miqdor</th>
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

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportCSV} disabled={rows.length === 0}>
          <Download className="size-4" /> CSV (Excel)
        </Button>
        <Button variant="outline" onClick={sharePDF} disabled={rows.length === 0}>
          <Share2 className="size-4" /> Ulashish
        </Button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "primary" | "warning";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "primary"
      ? "border-primary/25 bg-gradient-to-br from-primary/10 to-primary/5"
      : "border-warning/40 bg-gradient-to-br from-warning/15 to-warning/5";
  const valueClass = tone === "primary" ? "text-primary" : "text-warning";
  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {icon}
      </div>
      <div className={`mt-1 font-display text-3xl ${valueClass}`}>{value}</div>
    </div>
  );
}

function PeriodHistory({
  periods,
  closedPeriods,
  openPeriod,
  onView,
  onReopen,
  onDelete,
  onEdit,
}: {
  periods: PayrollPeriod[];
  closedPeriods: PayrollPeriod[];
  openPeriod: PayrollPeriod | null;
  onView: (id: string) => void;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (p: PayrollPeriod) => void;
}) {
  void periods;
  return (
    <div className="max-h-[60vh] space-y-2 overflow-y-auto">
      {openPeriod && (
        <div className="rounded-lg border-2 border-primary/40 bg-primary/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="font-medium text-primary">{openPeriod.label}</div>
              <div className="text-xs text-muted-foreground">
                {openPeriod.start_date} — {openPeriod.end_date}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={() => onEdit(openPeriod)}>
                <Pencil className="size-4" /> Tahrirlash
              </Button>
              <Badge className="bg-primary text-primary-foreground">Ochiq</Badge>
            </div>
          </div>
        </div>
      )}
      {closedPeriods.length === 0 && !openPeriod && (
        <div className="py-8 text-center text-sm text-muted-foreground">
          Hali davrlar yo'q
        </div>
      )}
      {closedPeriods.map((p) => (
        <div
          key={p.id}
          className="rounded-lg border border-primary/15 bg-background p-3 transition hover:border-primary/30 hover:bg-primary/5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-medium">{p.label}</div>
              <div className="text-xs text-muted-foreground">
                {p.start_date} — {p.end_date} · Yopilgan: {fmtDate(p.closed_at)}
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" onClick={() => onView(p.id)}>
                Ko'rish
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onEdit(p)} title="Tahrirlash">
                <Pencil className="size-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onReopen(p.id)}>
                <Unlock className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(p.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

