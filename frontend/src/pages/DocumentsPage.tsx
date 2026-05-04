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
import { materialConfigApi } from "@/api/material-config.api";
import apiClient from "@/api/apiClient";

// Helpers — kept lightweight so PDF generation stays under control.

// jsPDF's default Helvetica is built around Adobe Standard Encoding and
// silently mangles whole strings when it hits a glyph it cannot encode
// (e.g. the rupee sign). Replace the known offenders with ASCII fallbacks
// before passing user-typed text into autoTable cells.
const pdfSafe = (v: any): string => {
  if (v == null) return "";
  return String(v)
    .replace(/₹/g, "Rs.")
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/[→⇒]/g, "->")
    .replace(/[←⇐]/g, "<-");
};

const fmtDate = (iso: string | Date | null | undefined) => {
  if (!iso) return "-";
  try {
    return format(new Date(iso), "dd-MM-yyyy");
  } catch {
    return "-";
  }
};
const fmtNum = (n: number | null | undefined) =>
  n == null ? "-" : Number(n).toLocaleString();
const fmtRs = (n: number | null | undefined) =>
  n == null ? "-" : `Rs.${Number(n).toLocaleString()}`;

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
  | "settings"
  | "clientStatements"
  | "mason";

const SECTION_META: Record<SectionKey, { label: string; note: string }> = {
  stock: { label: "Stock Snapshot", note: "Current inventory by brick size + damaged totals" },
  production: { label: "Production Logs", note: "Every daily entry in the range" },
  dispatches: { label: "Dispatches", note: "All outgoing brick loads (with Trip #)" },
  clients: { label: "Clients & Balances", note: "Master list with pending / advance totals" },
  orders: { label: "Client Orders", note: "Every order recorded" },
  payments: { label: "Payments & Advances", note: "Money received from clients" },
  returns: { label: "Brick Returns", note: "Client brick returns" },
  cash: { label: "Cash Entries", note: "Money IN and OUT in the Cash Book" },
  expenses: { label: "Expenses", note: "Detailed expense ledger" },
  workers: { label: "Workers Master", note: "Every worker with role + rates" },
  wages: { label: "Worker Wages", note: "Wage summary for the period" },
  mason: {
    label: "Mason Work",
    note: "Site-wise mason entries: bricks laid, rates, totals, material used",
  },
  attendance: { label: "Attendance", note: "Attendance records in the range" },
  transport: { label: "Transport Entries", note: "Vehicle trips + transport log" },
  settings: { label: "Settings", note: "Machines, brick types, raw materials" },
  clientStatements: {
    label: "Per-Client Statements",
    note: "Running ledger: orders, dispatches, payments, returns with running balance per client",
  },
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
        materialConfigs,
        transportVehicles,
        transportVendors,
        masonEntries,
      ] = await Promise.all([
        selected.has("stock") || true // stock always used for summary
          ? stockApi.getCurrent().catch(() => [])
          : Promise.resolve([]),
        selected.has("production") || true
          ? productionApi
              .getAll({ startDate: fromStr, endDate: toStr, limit: 9999 })
              .catch(() => ({ productions: [] as any[] }))
          : Promise.resolve({ productions: [] as any[] }),
        // Per-client statements re-uses the dispatch/order/payment/return data,
        // so any of those toggles OR clientStatements forces the fetch.
        selected.has("dispatches") || selected.has("clientStatements")
          ? dispatchApi.getAll({ startDate: fromStr, endDate: toStr }).catch(() => [])
          : Promise.resolve([]),
        clientsApi.getAll().catch(() => []),
        selected.has("orders") || selected.has("clientStatements")
          ? clientsApi.getAllOrders({}).catch(() => [])
          : Promise.resolve([]),
        selected.has("payments") || selected.has("clientStatements")
          ? clientsApi.getAllPayments({ startDate: fromStr, endDate: toStr }).catch(() => [])
          : Promise.resolve([]),
        selected.has("returns") || selected.has("clientStatements")
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
        selected.has("settings") || selected.has("production")
          ? materialConfigApi.getAll().catch(() => [])
          : Promise.resolve([]),
        selected.has("transport")
          ? transportApi.getVehicles().catch(() => [])
          : Promise.resolve([]),
        selected.has("transport") || selected.has("settings")
          ? transportApi.getVendors().catch(() => [])
          : Promise.resolve([]),
        selected.has("mason")
          ? apiClient
              .get<any, { data: any[] }>(`/reports/mason-ledger?startDate=${fromStr}&endDate=${toStr}`)
              .then((r: any) => r.data || [])
              .catch(() => [])
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
        (transportEntries as any[]).length +
        (masonEntries as any[]).length;
      if (rowTotal > ROW_WARN_THRESHOLD) {
        toast.warning(
          `Large dataset (${rowTotal.toLocaleString()} rows). PDF may take a while…`,
        );
      }

      step("Building PDF…");

      // Landscape A4 — wider tables fit comfortably without aggressive wrapping.
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
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

      // Executive summary only renders when EVERY section is included.
      // For partial selections it's misleading (e.g. ticking only Cash but
      // still seeing production totals on page 1), so skip it instead.
      const allSectionsSelected = selected.size === Object.keys(SECTION_META).length;
      if (allSectionsSelected) {
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
            ["Attendance records", (attendanceRecords as any[]).length.toLocaleString()],
            ["Transport entries", (transportEntries as any[]).length.toLocaleString()],
            ["Mason work entries", (masonEntries as any[]).length.toLocaleString()],
          ],
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
          theme: "grid",
        });
      } else {
        // Light hint on the cover page so the user knows why no metrics block appears.
        doc.setFontSize(9);
        doc.setTextColor(120);
        doc.text(
          `${selected.size} of ${Object.keys(SECTION_META).length} sections selected — executive summary appears only when all sections are included.`,
          pageW / 2,
          160,
          { align: "center" },
        );
        doc.setTextColor(0);
      }

      // Helper — add a titled table on a new page with consistent styling.
      // `foot` renders a totals/summary row at the bottom of the table styled
      // distinctly from regular rows.
      // When `append: true`, the table is drawn directly under the previous
      // table on the same page (no addPage, smaller subheading) — useful for
      // grouping related views like Attendance Summary + Records.
      const addSectionTable = (
        title: string,
        head: string[][],
        body: any[][],
        note?: string,
        foot?: any[][],
        opts?: { append?: boolean },
      ) => {
        if (!body.length) return; // skip empty sections cleanly
        // Defensive: scrub user-typed strings so a stray rupee sign in a
        // client name or note doesn't garble the entire row.
        const safeHead = head.map((row) => row.map(pdfSafe));
        const safeBody = body.map((row) => row.map(pdfSafe));
        const safeFoot = foot ? foot.map((row) => row.map(pdfSafe)) : undefined;

        let titleY: number;
        let noteY: number;
        let tableStartY: number;
        if (opts?.append) {
          // Continue on the same page just below the previous table.
          const lastY = (doc as any).lastAutoTable?.finalY || 60;
          titleY = lastY + 28;
          noteY = titleY + 14;
          tableStartY = note ? noteY + 12 : titleY + 12;
          doc.setFontSize(13);
        } else {
          doc.addPage();
          titleY = 50;
          noteY = 66;
          tableStartY = note ? 78 : 66;
          doc.setFontSize(16);
        }
        doc.text(pdfSafe(title), 40, titleY);
        if (note) {
          doc.setFontSize(9);
          doc.setTextColor(120);
          doc.text(pdfSafe(note), 40, noteY);
          doc.setTextColor(0);
        }
        autoTable(doc, {
          startY: tableStartY,
          head: safeHead,
          body: safeBody,
          foot: safeFoot,
          showFoot: safeFoot ? "lastPage" : "never",
          footStyles: {
            fillColor: [243, 244, 246],
            textColor: [17, 24, 39],
            fontStyle: "bold",
            fontSize: 8,
          },
          // Auto-shrink font when there are many columns so wide tables fit on
          // landscape A4 without truncation.
          styles: {
            fontSize: head[0]?.length > 12 ? 6.5 : head[0]?.length > 8 ? 7.5 : 8,
            cellPadding: 2.5,
            overflow: "linebreak",
            valign: "top",
          },
          headStyles: { fillColor: [16, 185, 129], fontStyle: "bold", fontSize: 7.5 },
          theme: "grid",
          tableWidth: "auto",
          margin: { left: 24, right: 24 },
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
        const stockRows = (stockData as any[]).map((s: any) => {
          const produced = s.produced || 0;
          const damaged = s.damaged || 0;
          const stock = s.currentStock || 0;
          const wastagePct = produced > 0 ? ((damaged / produced) * 100).toFixed(2) : "0.00";
          const status = stock < 0 ? "DEFICIT" : stock < 1000 ? "LOW" : "OK";
          return [
            s.brickType?.size || "-",
            fmtNum(produced),
            fmtNum(damaged),
            `${wastagePct}%`,
            fmtNum(s.dispatched || 0),
            fmtNum(s.returned || 0),
            fmtNum(stock),
            status,
          ];
        });
        const sumProd = (stockData as any[]).reduce((s, x: any) => s + (x.produced || 0), 0);
        const sumDam = (stockData as any[]).reduce((s, x: any) => s + (x.damaged || 0), 0);
        const sumDisp = (stockData as any[]).reduce((s, x: any) => s + (x.dispatched || 0), 0);
        const sumRet = (stockData as any[]).reduce((s, x: any) => s + (x.returned || 0), 0);
        const sumStock = (stockData as any[]).reduce((s, x: any) => s + (x.currentStock || 0), 0);
        const overallWastage = sumProd > 0 ? ((sumDam / sumProd) * 100).toFixed(2) : "0.00";
        addSectionTable(
          "Stock Snapshot (Current)",
          [["Brick Type", "Produced", "Damaged", "Wastage %", "Dispatched", "Returned", "Current Stock", "Status"]],
          stockRows,
          "Damaged bricks are tracked separately and do NOT reduce stock. Status flags stock < 1,000 as LOW and < 0 as DEFICIT.",
          [["TOTAL", fmtNum(sumProd), fmtNum(sumDam), `${overallWastage}%`, fmtNum(sumDisp), fmtNum(sumRet), fmtNum(sumStock), ""]],
        );
      }

      // ── 2. Production ────────────────────────────────────────────────────
      if (selected.has("production") && productions.length) {
        // Build a brickTypeId → MaterialConfig map so we can compute the
        // material consumed per row (cement bags, fly ash kg, powder kg).
        const cfgByBrickType = new Map<string, any>();
        (materialConfigs as any[]).forEach((c: any) => {
          if (c.brickTypeId) cfgByBrickType.set(c.brickTypeId, c);
        });

        let totQty = 0, totDam = 0, totAvail = 0, totCement = 0, totFlyAsh = 0, totPowder = 0;
        const prodRows = productions.map((p: any) => {
          const qty = p.quantity || 0;
          const damaged = p.damagedBricks || 0;
          const avail = p.availableBricks || 0;
          const wastagePct = qty > 0 ? ((damaged / qty) * 100).toFixed(2) : "0.00";
          const cfg = cfgByBrickType.get(p.brickTypeId);
          const factor = qty / 1000;
          const cementVal = cfg ? factor * cfg.cementPer1000 : 0;
          const flyAshVal = cfg ? factor * cfg.flyAshPer1000 : 0;
          const powderVal = cfg ? factor * cfg.powderPer1000 : 0;
          totQty += qty; totDam += damaged; totAvail += avail;
          totCement += cementVal; totFlyAsh += flyAshVal; totPowder += powderVal;
          const workersStr = (p.workers || [])
            .map((pw: any) => `${pw.worker?.name || "?"} (${(pw.quantity || 0).toLocaleString()})`)
            .join(", ") || "-";
          return [
            fmtDate(p.date),
            p.machine?.name || "-",
            p.shift || "-",
            p.brickType?.size || "-",
            p.siteName || "-",
            fmtNum(qty),
            fmtNum(damaged),
            `${wastagePct}%`,
            fmtNum(avail),
            workersStr,
            cfg ? cementVal.toFixed(2) : "-",
            cfg ? flyAshVal.toFixed(2) : "-",
            cfg ? powderVal.toFixed(2) : "-",
            p.notes || "",
          ];
        });
        const overallProdWastage = totQty > 0 ? ((totDam / totQty) * 100).toFixed(2) : "0.00";
        addSectionTable(
          "Production Logs",
          [[
            "Date",
            "Machine",
            "Shift",
            "Brick Type",
            "Site",
            "Produced",
            "Damaged",
            "Wastage %",
            "Available",
            "Workers (qty each)",
            "Cement (bags)",
            "Fly Ash (kg)",
            "Powder (kg)",
            "Notes",
          ]],
          prodRows,
          `${productions.length.toLocaleString()} production entries. Material columns are computed from brick-type config (per 1,000 bricks).`,
          [[
            "TOTAL",
            "",
            "",
            "",
            `${productions.length} entries`,
            fmtNum(totQty),
            fmtNum(totDam),
            `${overallProdWastage}%`,
            fmtNum(totAvail),
            "",
            totCement.toFixed(2),
            totFlyAsh.toFixed(2),
            totPowder.toFixed(2),
            "",
          ]],
        );
      }

      // ── 3. Dispatches ────────────────────────────────────────────────────
      if (selected.has("dispatches") && (dispatches as any[]).length) {
        let dQty = 0, dTransport = 0, dLoading = 0, dTotal = 0, dPaid = 0, dBalance = 0;
        const dispatchRows = (dispatches as any[]).map((d: any) => {
          const total = d.totalAmount || 0;
          const paid = d.paidAmount || 0;
          const balance = Math.max(0, total - paid);
          dQty += d.quantity || 0;
          dTransport += d.transportCost || 0;
          dLoading += d.loadingCost || 0;
          dTotal += total;
          dPaid += paid;
          dBalance += balance;
          return [
            fmtDate(d.date),
            d.tripNumber != null ? `(${d.tripNumber})` : "-",
            d.customer?.name || d.client?.name || "-",
            d.customer?.phone || "-",
            d.brickType?.size || "-",
            fmtNum(d.quantity || 0),
            d.vehicleType || "-",
            d.vehicleNumber || "-",
            d.driver?.name || "-",
            d.distanceKm != null ? String(d.distanceKm) : "-",
            fmtNum(d.transportCost || 0),
            fmtNum(d.loadingCost || 0),
            fmtNum(total),
            fmtNum(paid),
            fmtNum(balance),
            d.paymentStatus || "-",
            d.status || "-",
            d.constructionType || "-",
            d.customer?.address || d.location || "-",
            d.notes || "",
          ];
        });
        addSectionTable(
          "Dispatches",
          [[
            "Date",
            "Trip #",
            "Client",
            "Phone",
            "Brick Type",
            "Qty",
            "Vehicle Type",
            "Vehicle #",
            "Driver",
            "Distance (km)",
            "Transport (Rs)",
            "Loading (Rs)",
            "Total (Rs)",
            "Paid (Rs)",
            "Balance (Rs)",
            "Pay Status",
            "Status",
            "Construction",
            "Location",
            "Notes",
          ]],
          dispatchRows,
          "Trip # mirrors the (1)/(2) notation in the original handwritten ledger.",
          [[
            "TOTAL",
            "",
            `${(dispatches as any[]).length} dispatches`,
            "",
            "",
            fmtNum(dQty),
            "",
            "",
            "",
            "",
            fmtNum(dTransport),
            fmtNum(dLoading),
            fmtNum(dTotal),
            fmtNum(dPaid),
            fmtNum(dBalance),
            "",
            "",
            "",
            "",
            "",
          ]],
        );
      }

      // ── 4. Clients & Balances ────────────────────────────────────────────
      if (selected.has("clients") && (clients as any[]).length) {
        const cTotalOrders = (clients as any[]).reduce((s, c: any) => s + (c.totalOrderAmount || 0), 0);
        const cTotalPaid = (clients as any[]).reduce((s, c: any) => s + (c.totalPaid || 0), 0);
        const cTotalAdv = (clients as any[]).reduce((s, c: any) => s + (c.advanceBalance || 0), 0);
        const cTotalPending = (clients as any[]).reduce((s, c: any) => s + (c.pendingAmount || 0), 0);
        addSectionTable(
          "Clients & Balances",
          [[
            "Name",
            "Phone",
            "Address",
            "Active",
            "Total Orders (Rs)",
            "Total Paid (Rs)",
            "Advance (Rs)",
            "Pending (Rs)",
            "Notes",
          ]],
          (clients as any[]).map((c: any) => [
            c.name || "-",
            c.phone || "-",
            c.address || "-",
            c.isActive === false ? "No" : "Yes",
            fmtNum(c.totalOrderAmount || 0),
            fmtNum(c.totalPaid || 0),
            fmtNum(c.advanceBalance || 0),
            fmtNum(c.pendingAmount || 0),
            c.notes || "",
          ]),
          `${(clients as any[]).length.toLocaleString()} clients on record.`,
          [["TOTAL", "", "", `${(clients as any[]).length} clients`, fmtNum(cTotalOrders), fmtNum(cTotalPaid), fmtNum(cTotalAdv), fmtNum(cTotalPending), ""]],
        );
      }

      // ── 5. Orders ────────────────────────────────────────────────────────
      if (selected.has("orders") && (orders as any[]).length) {
        addSectionTable(
          "Client Orders",
          [[
            "Order Date",
            "Client",
            "Location",
            "Brick Type",
            "Qty Ordered",
            "Dispatched",
            "Remaining",
            "Rate (Rs)",
            "Total (Rs)",
            "Status",
            "Expected Dispatch",
            "Construction",
            "Driver",
            "Vehicle",
            "Extra Items",
            "Notes",
          ]],
          (() => {
            return (orders as any[]).map((o: any) => {
              const dispatchedQty = (o.dispatches || []).reduce(
                (s: number, d: any) => s + (d.quantity || 0),
                0,
              );
              const remaining = Math.max(0, (o.quantity || 0) - dispatchedQty);
              const extras = Array.isArray(o.extraItems) && o.extraItems.length
                ? o.extraItems
                    .map((x: any) => `${x.name}: Rs.${(x.price || 0).toLocaleString()}`)
                    .join("; ")
                : "-";
              return [
                fmtDate(o.orderDate),
                o.client?.name || "-",
                o.client?.address || "-",
                o.brickType?.size || "-",
                fmtNum(o.quantity || 0),
                fmtNum(dispatchedQty),
                fmtNum(remaining),
                fmtNum(o.rate || 0),
                fmtNum(o.totalAmount || 0),
                o.status || "-",
                fmtDate(o.expectedDispatchDate),
                o.constructionType || "-",
                o.driver?.name || "-",
                o.vehicleNumber || "-",
                extras,
                o.notes || "",
              ];
            });
          })(),
          `${(orders as any[]).length.toLocaleString()} orders. Dispatched / Remaining computed from linked dispatch rows.`,
          (() => {
            const oQty = (orders as any[]).reduce((s, o: any) => s + (o.quantity || 0), 0);
            const oDisp = (orders as any[]).reduce(
              (s, o: any) => s + (o.dispatches || []).reduce((ss: number, d: any) => ss + (d.quantity || 0), 0),
              0,
            );
            const oRemaining = Math.max(0, oQty - oDisp);
            const oTotal = (orders as any[]).reduce((s, o: any) => s + (o.totalAmount || 0), 0);
            return [["TOTAL", `${(orders as any[]).length} orders`, "", "", fmtNum(oQty), fmtNum(oDisp), fmtNum(oRemaining), "", fmtNum(oTotal), "", "", "", "", "", "", ""]];
          })(),
        );
      }

      // ── 6. Payments ──────────────────────────────────────────────────────
      if (selected.has("payments") && (payments as any[]).length) {
        addSectionTable(
          "Payments & Advances",
          [[
            "Date",
            "Client",
            "Phone",
            "Location",
            "Type",
            "Method",
            "Amount (Rs)",
            "Linked Order",
            "Recorded",
            "Notes",
          ]],
          (payments as any[]).map((p: any) => {
            const orderRef = p.orderId
              ? (orders as any[]).find((o: any) => o.id === p.orderId)
              : null;
            const orderLabel = orderRef
              ? `${orderRef.brickType?.size || "?"} × ${(orderRef.quantity || 0).toLocaleString()}`
              : "-";
            return [
              fmtDate(p.paymentDate),
              p.client?.name || "-",
              p.client?.phone || "-",
              p.client?.address || "-",
              p.type || "PAYMENT",
              p.paymentMethod || "-",
              fmtNum(p.amount || 0),
              orderLabel,
              fmtDate(p.createdAt),
              p.notes || "",
            ];
          }),
          `${(payments as any[]).length.toLocaleString()} payment / advance entries.`,
          [["TOTAL", "", "", "", `${(payments as any[]).length} entries`, "", fmtNum(totalCollected), "", "", ""]],
        );
      }

      // ── 7. Returns ───────────────────────────────────────────────────────
      if (selected.has("returns") && (returns as any[]).length) {
        addSectionTable(
          "Brick Returns",
          [[
            "Date",
            "Client",
            "Location",
            "Brick Type",
            "Returned Qty",
            "Rate (Rs)",
            "Refund (Rs)",
            "Linked Dispatch",
            "Reason",
            "Notes",
          ]],
          (returns as any[]).map((r: any) => {
            const refund = (r.returnedQuantity || 0) * (r.rate || 0);
            const dispatchRef = r.dispatchId
              ? (dispatches as any[]).find((d: any) => d.id === r.dispatchId)
              : null;
            const dispatchLabel = dispatchRef
              ? `${fmtDate(dispatchRef.date)} ${dispatchRef.tripNumber ? `(Trip #${dispatchRef.tripNumber})` : ""}`.trim()
              : "-";
            return [
              fmtDate(r.date),
              r.client?.name || "-",
              r.client?.address || "-",
              r.brickType?.size || "-",
              fmtNum(r.returnedQuantity || 0),
              r.rate ? fmtNum(r.rate) : "-",
              refund ? fmtNum(refund) : "-",
              dispatchLabel,
              r.reason || "-",
              r.notes || "",
            ];
          }),
          `${(returns as any[]).length.toLocaleString()} returns recorded.`,
          (() => {
            const rQty = (returns as any[]).reduce((s, r: any) => s + (r.returnedQuantity || 0), 0);
            const rRefund = (returns as any[]).reduce((s, r: any) => s + ((r.returnedQuantity || 0) * (r.rate || 0)), 0);
            return [["TOTAL", "", "", `${(returns as any[]).length} returns`, fmtNum(rQty), "", fmtNum(rRefund), "", "", ""]];
          })(),
        );
      }

      // ── 8. Cash Entries ──────────────────────────────────────────────────
      if (selected.has("cash") && (cashEntries as any[]).length) {
        addSectionTable(
          "Cash Book Entries",
          [[
            "Date",
            "Type",
            "Category",
            "Method",
            "Amount (Rs)",
            "Related Party",
            "Location",
            "Vendor",
            "Description",
          ]],
          (cashEntries as any[]).map((e: any) => [
            fmtDate(e.date),
            e.type === "CREDIT" ? "IN" : "OUT",
            e.category || "-",
            e.paymentMode || "-",
            fmtNum(e.amount || 0),
            e.customer?.name || e.worker?.name || e.material?.name || "-",
            e.customer?.address || "-",
            e.vendorName || "-",
            e.description || "",
          ]),
          `IN: Rs.${cashIn.toLocaleString()}  |  OUT: Rs.${cashOut.toLocaleString()}  |  Net: Rs.${(cashIn - cashOut).toLocaleString()}.`,
          [
            ["TOTAL IN", "", "", "", fmtNum(cashIn), "", "", "", ""],
            ["TOTAL OUT", "", "", "", fmtNum(cashOut), "", "", "", ""],
            ["NET CASH", "", "", "", fmtNum(cashIn - cashOut), "", "", "", ""],
          ],
        );
      }

      // ── 9. Expenses ──────────────────────────────────────────────────────
      if (selected.has("expenses") && (expenses as any[]).length) {
        addSectionTable(
          "Expenses",
          [[
            "Date",
            "Category",
            "Amount (Rs)",
            "Mode",
            "Worker",
            "Material",
            "Qty",
            "Unit",
            "Price/Unit (Rs)",
            "Notes",
          ]],
          (expenses as any[]).map((e: any) => {
            // Material expenses can have a linked MaterialUsage with qty + price/unit.
            const usage = (e.materials || [])[0] || null;
            return [
              fmtDate(e.date),
              e.category || "-",
              fmtNum(e.amount || 0),
              e.paymentMode || "-",
              e.worker?.name || "-",
              e.material?.name || "-",
              usage?.quantity != null ? fmtNum(usage.quantity) : "-",
              e.material?.unit || "-",
              usage?.pricePerUnit != null ? fmtNum(usage.pricePerUnit) : "-",
              e.notes || "",
            ];
          }),
          `${(expenses as any[]).length} expense entries.`,
          [["TOTAL", "", fmtNum(totalExpense), "", "", "", "", "", "", ""]],
        );
      }

      // ── 10. Workers Master ───────────────────────────────────────────────
      if (selected.has("workers") && (workers as any[]).length) {
        addSectionTable(
          "Workers Master List",
          [[
            "Name",
            "Role",
            "Type",
            "Pay Type",
            "Monthly Salary (Rs)",
            "Weekly Wage (Rs)",
            "Per-Brick (Rs)",
            "Mason 6\" (Rs)",
            "Mason 8\" (Rs)",
            "Advance Balance (Rs)",
            "Active",
            "Joined",
          ]],
          (workers as any[]).map((w: any) => [
            w.name || "-",
            w.role || "-",
            w.employeeType || "-",
            w.paymentType || "-",
            fmtNum(w.monthlySalary || 0),
            fmtNum(w.weeklyWage || 0),
            fmtNum(w.perBrickRate || 0),
            w.rate6Inch != null ? fmtNum(w.rate6Inch) : "-",
            w.rate8Inch != null ? fmtNum(w.rate8Inch) : "-",
            fmtNum(w.advanceBalance || 0),
            w.isActive ? "Yes" : "No",
            fmtDate(w.createdAt),
          ]),
          `${(workers as any[]).length.toLocaleString()} worker records (active and inactive).`,
          (() => {
            const wMonthly = (workers as any[]).reduce((s, w: any) => s + (w.monthlySalary || 0), 0);
            const wWeekly = (workers as any[]).reduce((s, w: any) => s + (w.weeklyWage || 0), 0);
            const wAdv = (workers as any[]).reduce((s, w: any) => s + (w.advanceBalance || 0), 0);
            const wActive = (workers as any[]).filter((w: any) => w.isActive).length;
            return [["TOTAL", `${wActive} active`, "", "", fmtNum(wMonthly), fmtNum(wWeekly), "", "", "", fmtNum(wAdv), `${(workers as any[]).length}`, ""]];
          })(),
        );
      }

      // ── 11. Wages ────────────────────────────────────────────────────────
      if (selected.has("wages") && (wageReport as any)) {
        const wageRows: any[] = (wageReport as any)?.workers || (wageReport as any) || [];
        if (Array.isArray(wageRows) && wageRows.length) {
          let sumGross = 0, sumAdv = 0, sumPaid = 0, sumPending = 0, sumNet = 0;
          const rows = wageRows.map((w: any) => {
            const gross = w.grossWage || 0;
            const adv = w.advanceBalance || 0;
            const paid = w.totalPaid || 0;
            const pending = w.pendingAmount || 0;
            const netPayable = Math.max(0, gross - adv);
            sumGross += gross; sumAdv += adv; sumPaid += paid; sumPending += pending; sumNet += netPayable;
            return [
              w.workerName || w.name || "-",
              w.role || "-",
              fmtNum(w.dayBricks || 0),
              fmtNum(w.nightBricks || 0),
              fmtNum(w.totalBricks || 0),
              fmtNum(gross),
              fmtNum(adv),
              fmtNum(netPayable),
              fmtNum(paid),
              fmtNum(pending),
            ];
          });
          addSectionTable(
            "Worker Wages - Period Summary",
            [[
              "Name",
              "Role",
              "Day Bricks",
              "Night Bricks",
              "Total Bricks",
              "Gross (Rs)",
              "Advance (Rs)",
              "Net Payable (Rs)",
              "Paid (Rs)",
              "Pending (Rs)",
            ]],
            rows,
            `Period: ${rangeLabel}.`,
            [["TOTAL", `${rows.length} workers`, "", "", "", fmtNum(sumGross), fmtNum(sumAdv), fmtNum(sumNet), fmtNum(sumPaid), fmtNum(sumPending)]],
          );
        }
      }

      // ── 11b. Mason Work ──────────────────────────────────────────────────
      // Single consolidated mason section: every site entry rendered in one
      // table grouped by mason, with a subtotal row after each mason's block
      // and a grand-total at the end. One addSectionTable call → one section
      // page (autoTable will paginate further only if the dataset is huge).
      if (selected.has("mason") && (masonEntries as any[]).length) {
        // Group by mason.
        const grouped = new Map<string, any[]>();
        (masonEntries as any[]).forEach((m: any) => {
          const id = m.masonId || m.masonName || "unknown";
          if (!grouped.has(id)) grouped.set(id, []);
          grouped.get(id)!.push(m);
        });

        // Sort masons by descending total earnings; sort each mason's entries
        // chronologically so the daybook reads naturally top-to-bottom.
        const masonOrder = Array.from(grouped.entries())
          .map(([id, rows]) => ({
            id,
            rows: rows.slice().sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
            ),
            total: rows.reduce((s, r) => s + (r.totalAmount || 0), 0),
          }))
          .sort((a, b) => b.total - a.total);

        const body: any[][] = [];
        let grandBricks = 0;
        let grandTotal = 0;
        const masonAdvances: Record<string, number> = {};

        masonOrder.forEach(({ rows }) => {
          let bricksSum = 0;
          let amountSum = 0;
          rows.forEach((m: any) => {
            const bricks = m.bricks || 0;
            const amt = m.totalAmount || 0;
            bricksSum += bricks;
            amountSum += amt;
            body.push([
              fmtDate(m.date),
              m.masonName || "-",
              m.siteName || "-",
              m.machine || "-",
              m.shift || "-",
              m.brickType || "-",
              fmtNum(bricks),
              fmtNum(m.ratePerBrick || 0),
              fmtNum(amt),
              m.cement != null ? Number(m.cement).toFixed(2) : "-",
              m.flyAsh != null ? Number(m.flyAsh).toFixed(2) : "-",
              m.powder != null ? Number(m.powder).toFixed(2) : "-",
            ]);
          });
          const masonName = rows[0]?.masonName || "";
          const advance = rows[rows.length - 1]?.advanceBalance || 0;
          masonAdvances[masonName] = advance;
          // Subtotal row (per mason). Italicised by spelling out totals in
          // the cells; jspdf-autotable styles it as a regular row.
          body.push([
            "",
            `Subtotal — ${masonName}`,
            "",
            "",
            "",
            `${rows.length} entries`,
            fmtNum(bricksSum),
            "",
            fmtNum(amountSum),
            "",
            "",
            "",
          ]);
          grandBricks += bricksSum;
          grandTotal += amountSum;
        });

        const advanceSummary = Object.entries(masonAdvances)
          .map(([name, adv]) => `${name}: Adv Rs.${(adv || 0).toLocaleString()}`)
          .join("  |  ");

        addSectionTable(
          "Mason Work",
          [[
            "Date",
            "Mason",
            "Site",
            "Machine",
            "Shift",
            "Brick Type",
            "Bricks",
            "Rate (Rs)",
            "Total (Rs)",
            "Cement (bags)",
            "Fly Ash (kg)",
            "Powder (kg)",
          ]],
          body,
          `Period: ${rangeLabel}. Grouped by mason with per-mason subtotals; grand total in footer.\n` +
            `Mason rates are size-specific (6"/8"). Material columns reflect what was consumed on the same production batch.` +
            (advanceSummary ? `\nCurrent advances - ${advanceSummary}` : ""),
          [[
            "GRAND TOTAL",
            `${masonOrder.length} masons`,
            "",
            "",
            "",
            `${(masonEntries as any[]).length} entries`,
            fmtNum(grandBricks),
            "",
            fmtNum(grandTotal),
            "",
            "",
            "",
          ]],
        );
      }

      // ── 12. Attendance ───────────────────────────────────────────────────
      if (selected.has("attendance") && (attendanceRecords as any[]).length) {
        // Per-worker attendance summary first, then the row-by-row log.
        const byWorker = new Map<string, { present: number; absent: number; total: number; name: string; role: string }>();
        (attendanceRecords as any[]).forEach((a: any) => {
          const w = (workers as any[]).find((x: any) => x.id === a.workerId);
          const key = a.workerId;
          if (!byWorker.has(key)) {
            byWorker.set(key, {
              present: 0,
              absent: 0,
              total: 0,
              name: w?.name || a.workerId,
              role: w?.role || "-",
            });
          }
          const entry = byWorker.get(key)!;
          entry.total += 1;
          if (a.present) entry.present += 1;
          else entry.absent += 1;
        });

        const summaryArr = Array.from(byWorker.values());
        const totPresent = summaryArr.reduce((s, x) => s + x.present, 0);
        const totAbsent = summaryArr.reduce((s, x) => s + x.absent, 0);
        const totDays = summaryArr.reduce((s, x) => s + x.total, 0);
        addSectionTable(
          "Attendance Summary (by Worker)",
          [["Worker", "Role", "Days Present", "Days Absent", "Total Days", "Attendance %"]],
          summaryArr.map((s) => [
            s.name,
            s.role,
            String(s.present),
            String(s.absent),
            String(s.total),
            s.total > 0 ? `${((s.present / s.total) * 100).toFixed(1)}%` : "-",
          ]),
          undefined,
          [["TOTAL", `${summaryArr.length} workers`, String(totPresent), String(totAbsent), String(totDays), totDays > 0 ? `${((totPresent / totDays) * 100).toFixed(1)}%` : "-"]],
        );

        // Render the chronological log directly under the summary on the
        // SAME page (append: true). Both views share one Attendance section.
        addSectionTable(
          "Attendance Records (chronological)",
          [["Date", "Worker", "Role", "Status", "Notes"]],
          (attendanceRecords as any[])
            .slice()
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map((a: any) => {
              const w = (workers as any[]).find((x: any) => x.id === a.workerId);
              return [
                fmtDate(a.date),
                w?.name || a.workerId,
                w?.role || "-",
                a.present ? "Present" : "Absent",
                a.notes || "",
              ];
            }),
          `${(attendanceRecords as any[]).length.toLocaleString()} entries.`,
          undefined,
          { append: true },
        );
      }

      // ── 13. Transport ────────────────────────────────────────────────────
      if (selected.has("transport") && (transportEntries as any[]).length) {
        addSectionTable(
          "Transport Entries",
          [[
            "Date",
            "Transport Type",
            "Transaction",
            "Vehicle #",
            "Vehicle Type",
            "Driver",
            "Route / Location",
            "Brick Type",
            "Qty",
            "Loads",
            "Amount (Rs)",
            "Vendor",
            "Linked Dispatch",
            "Notes",
          ]],
          (transportEntries as any[]).map((t: any) => {
            const veh = t.vehicle || (transportVehicles as any[]).find((v: any) => v.id === t.vehicleId);
            const ven = t.vendor || (transportVendors as any[]).find((v: any) => v.id === t.vendorId);
            const dispatchRef = t.dispatchId
              ? (dispatches as any[]).find((d: any) => d.id === t.dispatchId)
              : null;
            return [
              fmtDate(t.date),
              t.transportType || "-",
              t.transactionType || "-",
              veh?.vehicleNumber || veh?.number || t.vehicleNumber || "-",
              veh?.vehicleType || t.vehicleType || "-",
              t.driver?.name || t.driverName || veh?.driverName || "-",
              t.route || t.location || "-",
              t.brickType?.size || "-",
              fmtNum(t.quantity || 0),
              fmtNum(t.loads || 0),
              fmtNum(t.amount || 0),
              ven?.name || t.vendorName || "-",
              dispatchRef
                ? `${fmtDate(dispatchRef.date)} ${dispatchRef.tripNumber != null ? `(Trip #${dispatchRef.tripNumber})` : ""}`.trim()
                : "-",
              t.notes || "",
            ];
          }),
          `${(transportEntries as any[]).length.toLocaleString()} transport entries.`,
          (() => {
            const tQty = (transportEntries as any[]).reduce((s, t: any) => s + (t.quantity || 0), 0);
            const tLoads = (transportEntries as any[]).reduce((s, t: any) => s + (t.loads || 0), 0);
            const tIncome = (transportEntries as any[])
              .filter((t: any) => t.transactionType === "INCOME")
              .reduce((s, t: any) => s + (t.amount || 0), 0);
            const tExpense = (transportEntries as any[])
              .filter((t: any) => t.transactionType === "EXPENSE")
              .reduce((s, t: any) => s + (t.amount || 0), 0);
            const tNet = tIncome - tExpense;
            return [
              ["TOTAL", "", "", "", "", "", "", `${(transportEntries as any[]).length} entries`, fmtNum(tQty), fmtNum(tLoads), `In: ${fmtNum(tIncome)}`, "", "", ""],
              ["", "", "", "", "", "", "", "", "", "", `Out: ${fmtNum(tExpense)}`, "", "", ""],
              ["", "", "", "", "", "", "", "", "", "", `Net: ${fmtNum(tNet)}`, "", "", ""],
            ];
          })(),
        );
      }

      // ── 13b. Per-Client Statements (running ledger per client) ──────────
      // For each client, walk every transaction in chronological order (orders
      // → dispatches → payments → advances → returns) and show a running
      // balance. Mirrors the multi-column "B / S / P" layout in the
      // handwritten daybooks. Skips clients with no activity in the range.
      if (selected.has("clientStatements") && (clients as any[]).length) {
        const fromTime = fromDate.getTime();
        const toTime = toDate.getTime() + 24 * 60 * 60 * 1000 - 1; // end of day inclusive

        const inRange = (iso?: string) => {
          if (!iso) return false;
          const t = new Date(iso).getTime();
          return t >= fromTime && t <= toTime;
        };

        // Index data by clientId for fast lookup
        const ordersByClient = new Map<string, any[]>();
        (orders as any[]).forEach((o) => {
          const cid = o.clientId || o.client?.id;
          if (!cid) return;
          if (!ordersByClient.has(cid)) ordersByClient.set(cid, []);
          ordersByClient.get(cid)!.push(o);
        });
        const dispatchesByClient = new Map<string, any[]>();
        (dispatches as any[]).forEach((d) => {
          const cid = d.customerId || d.customer?.id || d.client?.id;
          if (!cid) return;
          if (!dispatchesByClient.has(cid)) dispatchesByClient.set(cid, []);
          dispatchesByClient.get(cid)!.push(d);
        });
        const paymentsByClient = new Map<string, any[]>();
        (payments as any[]).forEach((p) => {
          const cid = p.clientId || p.client?.id;
          if (!cid) return;
          if (!paymentsByClient.has(cid)) paymentsByClient.set(cid, []);
          paymentsByClient.get(cid)!.push(p);
        });
        const returnsByClient = new Map<string, any[]>();
        (returns as any[]).forEach((r) => {
          const cid = r.clientId || r.client?.id;
          if (!cid) return;
          if (!returnsByClient.has(cid)) returnsByClient.set(cid, []);
          returnsByClient.get(cid)!.push(r);
        });

        let renderedAny = false;
        (clients as any[]).forEach((c: any) => {
          // Build chronological event list for this client.
          type Evt = { date: string; type: string; particulars: string; debit: number; credit: number };
          const events: Evt[] = [];

          (ordersByClient.get(c.id) || []).forEach((o: any) => {
            if (!inRange(o.orderDate)) return;
            const total = o.totalAmount || (o.quantity || 0) * (o.rate || 0);
            events.push({
              date: o.orderDate,
              type: "Order",
              particulars: `${o.brickType?.size || ""} x ${(o.quantity || 0).toLocaleString()}${o.rate ? ` @ Rs.${o.rate}` : ""}`,
              debit: total, // increases what client owes
              credit: 0,
            });
          });

          (dispatchesByClient.get(c.id) || []).forEach((d: any) => {
            if (!inRange(d.date)) return;
            const tripLabel = d.tripNumber != null ? ` (Trip #${d.tripNumber})` : "";
            events.push({
              date: d.date,
              type: "Dispatch",
              particulars: `${d.brickType?.size || ""} x ${(d.quantity || 0).toLocaleString()}${tripLabel}${d.location ? ` -> ${d.location}` : ""}`,
              debit: 0,
              credit: 0,
            });
            if ((d.paidAmount || 0) > 0) {
              events.push({
                date: d.date,
                type: "Payment",
                particulars: `Cash on dispatch`,
                debit: 0,
                credit: d.paidAmount,
              });
            }
          });

          (paymentsByClient.get(c.id) || []).forEach((p: any) => {
            if (!inRange(p.paymentDate)) return;
            const isAdvance = (p.type || "PAYMENT") === "ADVANCE";
            events.push({
              date: p.paymentDate,
              type: isAdvance ? "Advance" : "Payment",
              particulars: `${p.paymentMethod || "-"}${p.notes ? ` - ${p.notes}` : ""}`,
              debit: 0,
              credit: p.amount || 0,
            });
          });

          (returnsByClient.get(c.id) || []).forEach((r: any) => {
            if (!inRange(r.date)) return;
            const refund = (r.returnedQuantity || 0) * (r.rate || 0);
            events.push({
              date: r.date,
              type: "Return",
              particulars: `${r.brickType?.size || ""} x ${(r.returnedQuantity || 0).toLocaleString()}${refund ? ` refund Rs.${refund.toLocaleString()}` : ""}`,
              debit: 0,
              credit: refund,
            });
          });

          if (events.length === 0) return; // skip clients with no activity in range
          renderedAny = true;

          events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          // Compute running balance. Positive = client owes RD Interlock.
          let running = 0;
          const rows = events.map((e) => {
            running += e.debit - e.credit;
            return [
              format(new Date(e.date), "dd-MM-yyyy"),
              e.type,
              e.particulars,
              e.debit > 0 ? e.debit.toLocaleString() : "-",
              e.credit > 0 ? e.credit.toLocaleString() : "-",
              `${running >= 0 ? "" : "-"}${Math.abs(running).toLocaleString()}`,
            ];
          });

          const totalDebit = events.reduce((s, e) => s + e.debit, 0);
          const totalCredit = events.reduce((s, e) => s + e.credit, 0);
          const closing = totalDebit - totalCredit;

          addSectionTable(
            `Statement - ${c.name || "Unknown Client"}`,
            [["Date", "Type", "Particulars", "Debit (Rs)", "Credit (Rs)", "Balance (Rs)"]],
            rows,
            `Phone: ${c.phone || "-"} | Address: ${c.address || "-"}    |    ` +
              `Debit: Rs.${totalDebit.toLocaleString()}  |  Credit: Rs.${totalCredit.toLocaleString()}  |  ` +
              `Closing: ${closing >= 0 ? "Rs." : "-Rs."}${Math.abs(closing).toLocaleString()} ${closing > 0 ? "(client owes)" : closing < 0 ? "(advance with us)" : ""}`,
          );
        });

        if (!renderedAny) {
          // Add a single page noting nothing happened in the range, so the user
          // doesn't think the section silently failed.
          doc.addPage();
          doc.setFontSize(16);
          doc.text("Per-Client Statements", 40, 50);
          doc.setFontSize(10);
          doc.setTextColor(120);
          doc.text(
            "No client activity (orders, dispatches, payments, or returns) found in the selected date range.",
            40,
            72,
          );
          doc.setTextColor(0);
        }
      }

      // ── 14. Settings Snapshot ────────────────────────────────────────────
      if (selected.has("settings")) {
        if ((machines as any[]).length) {
          addSectionTable(
            "Machines",
            [["Name", "Status", "Created"]],
            (machines as any[]).map((m: any) => [
              m.name || "-",
              m.isActive ? "Active" : "Inactive",
              fmtDate(m.createdAt),
            ]),
          );
        }
        if ((brickTypes as any[]).length) {
          // Cross-reference material configs to show per-1000 consumption rates
          // for each brick size — gives an at-a-glance recipe per product.
          const cfgByBrick = new Map<string, any>();
          (materialConfigs as any[]).forEach((c: any) => {
            if (c.brickTypeId) cfgByBrick.set(c.brickTypeId, c);
          });
          addSectionTable(
            "Brick Types & Material Recipe (per 1,000 bricks)",
            [["Size", "Status", "Cement (bags)", "Fly Ash (kg)", "Powder (kg)"]],
            (brickTypes as any[]).map((b: any) => {
              const c = cfgByBrick.get(b.id);
              return [
                b.size || "-",
                b.isActive ? "Active" : "Inactive",
                c ? String(c.cementPer1000) : "-",
                c ? String(c.flyAshPer1000) : "-",
                c ? String(c.powderPer1000) : "-",
              ];
            }),
          );
        }
        if ((rawMaterials as any[]).length) {
          addSectionTable(
            "Raw Materials",
            [["Name", "Unit", "Description", "Status"]],
            (rawMaterials as any[]).map((r: any) => [
              r.name || "-",
              r.unit || "-",
              r.description || "-",
              r.isActive ? "Active" : "Inactive",
            ]),
          );
        }
        if ((transportVendors as any[]).length) {
          addSectionTable(
            "Transport Vendors",
            [["Name", "Phone", "Vehicle Numbers", "Notes"]],
            (transportVendors as any[]).map((v: any) => [
              v.name || "-",
              v.phone || "-",
              v.vehicleNumbers || (Array.isArray(v.vehicles) ? v.vehicles.map((x: any) => x.vehicleNumber).join(", ") : "-") || "-",
              v.notes || "",
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
