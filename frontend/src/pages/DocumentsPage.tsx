import { useMemo, useState } from "react";
import { MobileFormLayout, FormField } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { DatePickerField } from "@/components/DatePickerField";
import { ActionButton } from "@/components/ActionButton";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  FileDown,
} from "lucide-react";
import { format, endOfMonth, startOfMonth } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { productionApi } from "@/api/production.api";
import { dispatchApi } from "@/api/dispatch.api";
import { clientsApi } from "@/api/clients.api";
import { cashApi } from "@/api/cash.api";
import { expensesApi } from "@/api/expenses.api";
import { workersApi } from "@/api/workers.api";
import { stockApi } from "@/api/stock.api";
import { transportApi } from "@/api/transport.api";
import { settingsApi } from "@/api/settings.api";
import { reportsApi } from "@/api/reports.api";
import apiClient from "@/api/apiClient";

// ─── Sections ───────────────────────────────────────────────────────────────
// Each section declares a label and whether it's toggled on. "Executive
// Summary" is always included so the PDF has a useful first page.
type SectionKey =
  | "stock"
  | "production"
  | "dispatches"
  | "clients"
  | "orders"
  | "payments"
  | "returns"
  | "cash"
  | "expenses"
  | "workers"
  | "wages"
  | "attendance"
  | "transport"
  | "settings";

const SECTION_META: Record<SectionKey, { label: string; note: string }> = {
  stock: { label: "Stock Snapshot", note: "Current inventory by brick size + damaged totals" },
  production: { label: "Production Logs", note: "Every daily entry in the range" },
  dispatches: { label: "Dispatches", note: "All outgoing brick loads" },
  clients: { label: "Clients & Balances", note: "Master list with pending / advance totals" },
  orders: { label: "Client Orders", note: "Every order recorded" },
  payments: { label: "Payments & Advances", note: "Money received from clients" },
  returns: { label: "Brick Returns", note: "Client brick returns" },
  cash: { label: "Cash Entries", note: "Money IN and OUT in the Cash Book" },
  expenses: { label: "Expenses", note: "Detailed expense ledger" },
  workers: { label: "Workers Master", note: "Every worker with role + rates" },
  wages: { label: "Worker Wages", note: "Wage summary for the period" },
  attendance: { label: "Attendance", note: "Attendance records in the range" },
  transport: { label: "Transport Entries", note: "Vehicle trips + transport log" },
  settings: { label: "Settings", note: "Machines, brick types, raw materials" },
};

// Large-export warning threshold. Client-side PDF build breaks with too many rows.
const ROW_WARN_THRESHOLD = 20_000;

const DocumentsPage = () => {
  const [fromDate, setFromDate] = useState<Date>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date>(endOfMonth(new Date()));
  const [selected, setSelected] = useState<Set<SectionKey>>(
    new Set<SectionKey>(Object.keys(SECTION_META) as SectionKey[]),
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>("");

  const selectedCount = selected.size;
  const fromStr = format(fromDate, "yyyy-MM-dd");
  const toStr = format(toDate, "yyyy-MM-dd");
  const rangeLabel = useMemo(
    () => `${format(fromDate, "dd MMM yyyy")} — ${format(toDate, "dd MMM yyyy")}`,
    [fromDate, toDate],
  );

  const toggle = (k: SectionKey) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const toggleAll = (on: boolean) => {
    if (on) setSelected(new Set(Object.keys(SECTION_META) as SectionKey[]));
    else setSelected(new Set());
  };

  const generate = async () => {
    if (fromDate > toDate) {
      toast.error("From date must be before To date");
      return;
    }
    if (selected.size === 0) {
      toast.error("Select at least one section");
      return;
    }

    setIsGenerating(true);
    setProgress("Preparing…");

    try {
      // Parallel fetch every needed dataset. We always fetch clients + workers
      // because the summary page leans on them.
      const step = (msg: string) => setProgress(msg);

      step("Fetching data…");
      const [
        stockData,
        productionRes,
        dispatches,
        clients,
        orders,
        payments,
        returns,
        cashEntries,
        expenses,
        workers,
        wageReport,
        attendanceRecords,
        transportEntries,
        machines,
        brickTypes,
        rawMaterials,
      ] = await Promise.all([
        selected.has("stock") || true // stock always used for summary
          ? stockApi.getCurrent().catch(() => [])
          : Promise.resolve([]),
        selected.has("production") || true
          ? productionApi
              .getAll({ startDate: fromStr, endDate: toStr, limit: 9999 })
              .catch(() => ({ productions: [] as any[] }))
          : Promise.resolve({ productions: [] as any[] }),
        selected.has("dispatches")
          ? dispatchApi.getAll({ startDate: fromStr, endDate: toStr }).catch(() => [])
          : Promise.resolve([]),
        clientsApi.getAll().catch(() => []),
        selected.has("orders")
          ? clientsApi.getAllOrders({}).catch(() => [])
          : Promise.resolve([]),
        selected.has("payments")
          ? clientsApi.getAllPayments({ startDate: fromStr, endDate: toStr }).catch(() => [])
          : Promise.resolve([]),
        selected.has("returns")
          ? apiClient
              .get<any, { data: any[] }>("/brick-returns")
              .then((r: any) => r.data || [])
              .catch(() => [])
          : Promise.resolve([]),
        selected.has("cash")
          ? cashApi.getAll({ startDate: fromStr, endDate: toStr }).catch(() => [])
          : Promise.resolve([]),
        selected.has("expenses")
          ? expensesApi
              .getAll({ startDate: fromStr, endDate: toStr })
              .catch(() => [])
          : Promise.resolve([]),
        workersApi.getAll(true).catch(() => []),
        selected.has("wages")
          ? reportsApi.getWorkerReport(fromStr, toStr).catch(() => null)
          : Promise.resolve(null),
        selected.has("attendance")
          ? apiClient
              .get<any, { data: any[] }>(`/wages/attendance?startDate=${fromStr}&endDate=${toStr}`)
              .then((r: any) => r.data || [])
              .catch(() => [])
          : Promise.resolve([]),
        selected.has("transport")
          ? transportApi.getEntries({ startDate: fromStr, endDate: toStr }).catch(() => [])
          : Promise.resolve([]),
        selected.has("settings")
          ? settingsApi.getMachines(false).catch(() => [])
          : Promise.resolve([]),
        selected.has("settings") || selected.has("stock")
          ? settingsApi.getBrickTypes(false).catch(() => [])
          : Promise.resolve([]),
        selected.has("settings")
          ? settingsApi.getRawMaterials(false).catch(() => [])
          : Promise.resolve([]),
      ]);

      const productions = (productionRes as any)?.productions || [];

      // Warn — but still allow — when the dataset is huge.
      const rowTotal =
        productions.length +
        (dispatches as any[]).length +
        (payments as any[]).length +
        (cashEntries as any[]).length +
        (expenses as any[]).length +
        (attendanceRecords as any[]).length +
        (transportEntries as any[]).length;
      if (rowTotal > ROW_WARN_THRESHOLD) {
        toast.warning(
          `Large dataset (${rowTotal.toLocaleString()} rows). PDF may take a while…`,
        );
      }

      step("Building PDF…");

      const doc = new jsPDF({ orientation: "portrait", unit: "pt" });
      const pageW = doc.internal.pageSize.getWidth();

      // ── Cover page ────────────────────────────────────────────────────────
      doc.setFontSize(22);
      doc.text("RD Interlock — Full Documentation", pageW / 2, 80, { align: "center" });
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(`Date range: ${rangeLabel}`, pageW / 2, 105, { align: "center" });
      doc.text(
        `Generated: ${format(new Date(), "dd MMM yyyy HH:mm")}`,
        pageW / 2,
        122,
        { align: "center" },
      );
      doc.setTextColor(0);

      // ── Executive summary ────────────────────────────────────────────────
      const totalProduced = productions.reduce(
        (s: number, p: any) => s + (p.quantity || 0),
        0,
      );
      const totalDamaged = productions.reduce(
        (s: number, p: any) => s + (p.damagedBricks || 0),
        0,
      );
      const totalDispatched = (dispatches as any[]).reduce(
        (s: number, d: any) => s + (d.quantity || 0),
        0,
      );
      const totalStock = (stockData as any[]).reduce(
        (s: number, d: any) => s + (d.currentStock || 0),
        0,
      );
      const cashIn = (cashEntries as any[])
        .filter((e: any) => e.type === "CREDIT")
        .reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const cashOut = (cashEntries as any[])
        .filter((e: any) => e.type === "DEBIT")
        .reduce((s: number, e: any) => s + (e.amount || 0), 0);
      const totalExpense = (expenses as any[]).reduce(
        (s: number, e: any) => s + (e.amount || 0),
        0,
      );
      const totalCollected = (payments as any[]).reduce(
        (s: number, p: any) => s + (p.amount || 0),
        0,
      );

      autoTable(doc, {
        startY: 160,
        head: [["Metric", "Value"]],
        body: [
          ["Total Produced (bricks)", totalProduced.toLocaleString()],
          [
            "Damaged Bricks (wastage)",
            `${totalDamaged.toLocaleString()} (${totalProduced > 0 ? ((totalDamaged / totalProduced) * 100).toFixed(2) : "0.00"}%)`,
          ],
          ["Total Dispatched", totalDispatched.toLocaleString()],
          ["Current Stock (all sizes)", totalStock.toLocaleString()],
          ["Total Clients on record", (clients as any[]).length.toLocaleString()],
          ["Client Orders recorded", (orders as any[]).length.toLocaleString()],
          ["Client Payments received", `Rs. ${totalCollected.toLocaleString()}`],
          ["Cash IN (Money IN)", `Rs. ${cashIn.toLocaleString()}`],
          ["Cash OUT (Money OUT)", `Rs. ${cashOut.toLocaleString()}`],
          ["Net Cash", `Rs. ${(cashIn - cashOut).toLocaleString()}`],
          ["Expenses logged", `Rs. ${totalExpense.toLocaleString()}`],
          ["Workers active", (workers as any[]).filter((w: any) => w.isActive).length.toLocaleString()],
          [
            "Attendance records",
            (attendanceRecords as any[]).length.toLocaleString(),
          ],
          [
            "Transport entries",
            (transportEntries as any[]).length.toLocaleString(),
          ],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] },
        theme: "grid",
      });

      // Helper — add a titled table on a new page with consistent styling.
      const addSectionTable = (
        title: string,
        head: string[][],
        body: any[][],
        note?: string,
      ) => {
        if (!body.length) return; // skip empty sections cleanly
        doc.addPage();
        doc.setFontSize(16);
        doc.text(title, 40, 50);
        if (note) {
          doc.setFontSize(9);
          doc.setTextColor(120);
          doc.text(note, 40, 66);
          doc.setTextColor(0);
        }
        autoTable(doc, {
          startY: note ? 78 : 66,
          head,
          body,
          styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
          headStyles: { fillColor: [16, 185, 129] },
          theme: "grid",
          didDrawPage: (data) => {
            // Page footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
              `RD Interlock — Documents • ${rangeLabel}`,
              data.settings.margin.left,
              doc.internal.pageSize.getHeight() - 20,
            );
            doc.text(
              `Page ${pageCount}`,
              pageW - 40,
              doc.internal.pageSize.getHeight() - 20,
              { align: "right" },
            );
            doc.setTextColor(0);
          },
        });
      };

      // ── 1. Stock Snapshot ────────────────────────────────────────────────
      if (selected.has("stock") && (stockData as any[]).length) {
        addSectionTable(
          "Stock Snapshot (Current)",
          [["Brick Type", "Produced", "Damaged", "Dispatched", "Returned", "Current Stock"]],
          (stockData as any[]).map((s: any) => [
            s.brickType?.size || "-",
            (s.produced || 0).toLocaleString(),
            (s.damaged || 0).toLocaleString(),
            (s.dispatched || 0).toLocaleString(),
            (s.returned || 0).toLocaleString(),
            (s.currentStock || 0).toLocaleString(),
          ]),
          "Damaged bricks are tracked separately and do NOT reduce stock.",
        );
      }

      // ── 2. Production ────────────────────────────────────────────────────
      if (selected.has("production") && productions.length) {
        addSectionTable(
          "Production Logs",
          [["Date", "Machine", "Shift", "Brick Type", "Produced", "Damaged", "Available", "Notes"]],
          productions.map((p: any) => [
            format(new Date(p.date), "dd-MM-yyyy"),
            p.machine?.name || "-",
            p.shift || "-",
            p.brickType?.size || "-",
            (p.quantity || 0).toLocaleString(),
            (p.damagedBricks || 0).toLocaleString(),
            (p.availableBricks || 0).toLocaleString(),
            p.notes || "",
          ]),
          `${productions.length.toLocaleString()} production entries in range`,
        );
      }

      // ── 3. Dispatches ────────────────────────────────────────────────────
      if (selected.has("dispatches") && (dispatches as any[]).length) {
        addSectionTable(
          "Dispatches",
          [["Date", "Client", "Brick Type", "Quantity", "Location"]],
          (dispatches as any[]).map((d: any) => [
            format(new Date(d.date), "dd-MM-yyyy"),
            d.customer?.name || d.client?.name || "-",
            d.brickType?.size || "-",
            (d.quantity || 0).toLocaleString(),
            d.customer?.address || d.location || "-",
          ]),
        );
      }

      // ── 4. Clients & Balances ────────────────────────────────────────────
      if (selected.has("clients") && (clients as any[]).length) {
        addSectionTable(
          "Clients & Balances",
          [["Name", "Phone", "Address", "Orders (₹)", "Advance", "Paid", "Pending"]],
          (clients as any[]).map((c: any) => [
            c.name || "-",
            c.phone || "-",
            c.address || "-",
            (c.totalOrderAmount || 0).toLocaleString(),
            (c.advanceBalance || 0).toLocaleString(),
            (c.totalPaid || 0).toLocaleString(),
            (c.pendingAmount || 0).toLocaleString(),
          ]),
        );
      }

      // ── 5. Orders ────────────────────────────────────────────────────────
      if (selected.has("orders") && (orders as any[]).length) {
        addSectionTable(
          "Client Orders",
          [["Order Date", "Client", "Brick Type", "Qty", "Rate", "Total (₹)", "Status"]],
          (orders as any[]).map((o: any) => [
            o.orderDate ? format(new Date(o.orderDate), "dd-MM-yyyy") : "-",
            o.client?.name || "-",
            o.brickType?.size || "-",
            (o.quantity || 0).toLocaleString(),
            (o.rate || 0).toLocaleString(),
            (o.totalAmount || 0).toLocaleString(),
            o.status || "-",
          ]),
        );
      }

      // ── 6. Payments ──────────────────────────────────────────────────────
      if (selected.has("payments") && (payments as any[]).length) {
        addSectionTable(
          "Payments & Advances",
          [["Date", "Client", "Type", "Method", "Amount (₹)", "Notes"]],
          (payments as any[]).map((p: any) => [
            p.paymentDate ? format(new Date(p.paymentDate), "dd-MM-yyyy") : "-",
            p.client?.name || "-",
            p.type || "PAYMENT",
            p.paymentMethod || "-",
            (p.amount || 0).toLocaleString(),
            p.notes || "",
          ]),
        );
      }

      // ── 7. Returns ───────────────────────────────────────────────────────
      if (selected.has("returns") && (returns as any[]).length) {
        addSectionTable(
          "Brick Returns",
          [["Date", "Client", "Brick Type", "Returned Qty", "Notes"]],
          (returns as any[]).map((r: any) => [
            r.date ? format(new Date(r.date), "dd-MM-yyyy") : "-",
            r.client?.name || "-",
            r.brickType?.size || "-",
            (r.returnedQuantity || 0).toLocaleString(),
            r.notes || "",
          ]),
        );
      }

      // ── 8. Cash Entries ──────────────────────────────────────────────────
      if (selected.has("cash") && (cashEntries as any[]).length) {
        addSectionTable(
          "Cash Book Entries",
          [["Date", "Type", "Category", "Method", "Amount (₹)", "Description"]],
          (cashEntries as any[]).map((e: any) => [
            e.date ? format(new Date(e.date), "dd-MM-yyyy") : "-",
            e.type === "CREDIT" ? "IN" : "OUT",
            e.category || "-",
            e.paymentMode || "-",
            (e.amount || 0).toLocaleString(),
            e.description || "",
          ]),
          `IN: Rs. ${cashIn.toLocaleString()}  |  OUT: Rs. ${cashOut.toLocaleString()}  |  Net: Rs. ${(cashIn - cashOut).toLocaleString()}`,
        );
      }

      // ── 9. Expenses ──────────────────────────────────────────────────────
      if (selected.has("expenses") && (expenses as any[]).length) {
        addSectionTable(
          "Expenses",
          [["Date", "Category", "Amount (₹)", "Mode", "Worker/Material", "Notes"]],
          (expenses as any[]).map((e: any) => [
            e.date ? format(new Date(e.date), "dd-MM-yyyy") : "-",
            e.category || "-",
            (e.amount || 0).toLocaleString(),
            e.paymentMode || "-",
            e.worker?.name || e.material?.name || "-",
            e.notes || "",
          ]),
          `Total expenses: Rs. ${totalExpense.toLocaleString()}`,
        );
      }

      // ── 10. Workers Master ───────────────────────────────────────────────
      if (selected.has("workers") && (workers as any[]).length) {
        addSectionTable(
          "Workers Master List",
          [["Name", "Role", "Pay Type", "Rate (₹)", "Advance (₹)", "Active"]],
          (workers as any[]).map((w: any) => [
            w.name || "-",
            w.role || "-",
            w.paymentType || "-",
            (w.perBrickRate || w.rate6Inch || w.rate || 0).toLocaleString(),
            (w.advanceBalance || 0).toLocaleString(),
            w.isActive ? "Yes" : "No",
          ]),
        );
      }

      // ── 11. Wages ────────────────────────────────────────────────────────
      if (selected.has("wages") && (wageReport as any)) {
        const wageRows: any[] = (wageReport as any)?.workers || (wageReport as any) || [];
        if (Array.isArray(wageRows) && wageRows.length) {
          addSectionTable(
            "Worker Wages — Period Summary",
            [["Name", "Role", "Day Bricks", "Night Bricks", "Total", "Gross (₹)", "Advance", "Paid", "Pending"]],
            wageRows.map((w: any) => [
              w.workerName || w.name || "-",
              w.role || "-",
              (w.dayBricks || 0).toLocaleString(),
              (w.nightBricks || 0).toLocaleString(),
              (w.totalBricks || 0).toLocaleString(),
              (w.grossWage || 0).toLocaleString(),
              (w.advanceBalance || 0).toLocaleString(),
              (w.totalPaid || 0).toLocaleString(),
              (w.pendingAmount || 0).toLocaleString(),
            ]),
          );
        }
      }

      // ── 12. Attendance ───────────────────────────────────────────────────
      if (selected.has("attendance") && (attendanceRecords as any[]).length) {
        addSectionTable(
          "Attendance Records",
          [["Date", "Worker", "Status", "Notes"]],
          (attendanceRecords as any[]).map((a: any) => {
            const w = (workers as any[]).find((x: any) => x.id === a.workerId);
            return [
              a.date ? format(new Date(a.date), "dd-MM-yyyy") : "-",
              w?.name || a.workerId,
              a.present ? "Present" : "Absent",
              a.notes || "",
            ];
          }),
          `${(attendanceRecords as any[]).length.toLocaleString()} attendance entries`,
        );
      }

      // ── 13. Transport ────────────────────────────────────────────────────
      if (selected.has("transport") && (transportEntries as any[]).length) {
        addSectionTable(
          "Transport Entries",
          [["Date", "Vehicle", "Driver", "Route", "Brick Type", "Qty", "Amount (₹)"]],
          (transportEntries as any[]).map((t: any) => [
            t.date ? format(new Date(t.date), "dd-MM-yyyy") : "-",
            t.vehicle?.number || t.vehicleNumber || "-",
            t.driver?.name || t.driverName || "-",
            t.route || t.location || "-",
            t.brickType?.size || "-",
            (t.quantity || 0).toLocaleString(),
            (t.amount || 0).toLocaleString(),
          ]),
        );
      }

      // ── 14. Settings Snapshot ────────────────────────────────────────────
      if (selected.has("settings")) {
        if ((machines as any[]).length) {
          addSectionTable(
            "Machines",
            [["Name", "Active"]],
            (machines as any[]).map((m: any) => [m.name || "-", m.isActive ? "Yes" : "No"]),
          );
        }
        if ((brickTypes as any[]).length) {
          addSectionTable(
            "Brick Types",
            [["Size", "Active"]],
            (brickTypes as any[]).map((b: any) => [b.size || "-", b.isActive ? "Yes" : "No"]),
          );
        }
        if ((rawMaterials as any[]).length) {
          addSectionTable(
            "Raw Materials",
            [["Name", "Unit", "Active"]],
            (rawMaterials as any[]).map((r: any) => [
              r.name || "-",
              r.unit || "-",
              r.isActive ? "Yes" : "No",
            ]),
          );
        }
      }

      step("Saving…");
      const filename =
        "rdinterlock-full-documentation-" +
        format(fromDate, "yyyyMMdd") +
        "_to_" +
        format(toDate, "yyyyMMdd") +
        ".pdf";
      doc.save(filename);
      toast.success("Document generated", { description: filename });
    } catch (err: any) {
      console.error("Document build failed:", err);
      toast.error("Failed to generate document", {
        description: err?.message || "Unknown error",
      });
    } finally {
      setIsGenerating(false);
      setProgress("");
    }
  };

  return (
    <MobileFormLayout title="📄 Documents">
      <EntryCard title="Generate Full Documentation">
        <div className="space-y-5">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Build a single PDF document covering every record in the system for a
            chosen date range. Toggle sections to skip anything you don't need.
          </p>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From">
              <DatePickerField
                date={fromDate}
                onDateChange={(d) => {
                  setFromDate(d);
                  if (toDate < d) setToDate(d);
                }}
                label=""
              />
            </FormField>
            <FormField label="To">
              <DatePickerField
                date={toDate}
                onDateChange={(d) => {
                  if (d < fromDate) {
                    toast.error("End date cannot be before start date");
                    return;
                  }
                  setToDate(d);
                }}
                label=""
              />
            </FormField>
          </div>

          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[10px] font-black text-primary uppercase tracking-wider mb-0.5">
              Range
            </p>
            <p className="text-xs font-bold text-foreground">{rangeLabel}</p>
          </div>

          {/* Section toggles */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Sections ({selectedCount}/{Object.keys(SECTION_META).length})
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleAll(true)}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Select all
                </button>
                <span className="text-muted-foreground/40">|</span>
                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="text-[10px] font-bold text-muted-foreground hover:underline"
                >
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(SECTION_META) as SectionKey[]).map((k) => {
                const { label, note } = SECTION_META[k];
                const isOn = selected.has(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => toggle(k)}
                    className={`text-left p-3 rounded-xl border transition-all active:scale-[0.98] ${
                      isOn
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className={`mt-0.5 h-4 w-4 rounded border shrink-0 flex items-center justify-center ${
                          isOn ? "bg-primary border-primary" : "border-muted-foreground/40"
                        }`}
                      >
                        {isOn && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground">{label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                          {note}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warning + Action */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              A wide date range with all sections on can produce a large PDF and
              may take up to a minute to build. Prefer monthly exports for best
              results.
            </p>
          </div>

          <ActionButton
            label={
              isGenerating
                ? progress || "Generating…"
                : `Generate PDF (${selectedCount} section${selectedCount === 1 ? "" : "s"})`
            }
            icon={isGenerating ? Loader2 : FileDown}
            variant="primary"
            size="lg"
            onClick={generate}
            className="w-full shadow-lg"
            disabled={isGenerating || selectedCount === 0}
          />
        </div>
      </EntryCard>

      <EntryCard title="What's included">
        <div className="space-y-2">
          {(Object.keys(SECTION_META) as SectionKey[]).map((k) => (
            <div
              key={k}
              className="flex items-start gap-3 p-2.5 rounded-xl bg-secondary/20"
            >
              <FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">
                  {SECTION_META[k].label}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {SECTION_META[k].note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </EntryCard>
    </MobileFormLayout>
  );
};

export default DocumentsPage;
