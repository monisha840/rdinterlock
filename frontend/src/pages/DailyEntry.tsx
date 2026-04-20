import { useState, useEffect } from "react";
import { MobileFormLayout, FormField, BigNumberInput } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { DatePickerField } from "@/components/DatePickerField";
import { PillSelector } from "@/components/PillSelector";
import { ConfirmModal } from "@/components/ConfirmModal";
import { toast } from "sonner";
import { Save, Plus, X, Fuel, UtensilsCrossed, PackageOpen, MoreHorizontal, Loader2, Receipt, Check, Pencil, Trash2, FileText, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings.api";
import { workersApi } from "@/api/workers.api";
import { productionApi } from "@/api/production.api";
import { expensesApi } from "@/api/expenses.api";
import { materialConfigApi } from "@/api/material-config.api";
import type { MaterialConfig } from "@/api/material-config.api";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const quickQuantities = [500, 800, 1000, 2000];

const DailyEntry = () => {
  const queryClient = useQueryClient();
  const [entryDate, setEntryDate] = useState(new Date());
  
  // Clear last result when date changes (actual day change)
  useEffect(() => {
    if (lastResult) setLastResult(null);
  }, [format(entryDate, 'yyyy-MM-dd')]);
  const [shift, setShift] = useState("MORNING");
  const [brickTypeId, setBrickTypeId] = useState("");
  const [brickRate, setBrickRate] = useState("");
  const [machineId, setMachineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [damagedQuantity, setDamagedQuantity] = useState("");
  const [workers, setWorkers] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");

  const [lastResult, setLastResult] = useState<any>(null);

  const [expenseDate, setExpenseDate] = useState(new Date());
  const [expenseCategory, setExpenseCategory] = useState("FUEL");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [materialQty, setMaterialQty] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");

  // Fetch Reference Data (Machines, Brick Types, Workers) - Optimized batched call
  const {
    data: metadata,
    isLoading: isMetaLoading,
    isError: isMetaError
  } = useQuery({
    queryKey: ['form-metadata'],
    queryFn: settingsApi.getFormMetadata,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 30 * 60 * 1000,   // 30 minutes garbage collection
  });

  const machines = metadata?.machines || [];
  const brickTypes = metadata?.brickTypes || [];
  const workerList = metadata?.workers || [];
  const rawMaterials = metadata?.rawMaterials || [];

  // Material Config — for live consumption preview
  const { data: materialConfigs = [] } = useQuery<MaterialConfig[]>({
    queryKey: ['material-configs'],
    queryFn: materialConfigApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const { data: todayProductions = [], isLoading: isSummaryLoading } = useQuery({
    queryKey: ['productions', 'today', format(entryDate, 'yyyy-MM-dd')],
    queryFn: () => productionApi.getAll({ date: format(entryDate, 'yyyy-MM-dd') }),
    select: (data) => data.productions,
  });

  // Mutations
  const createProductionMutation = useMutation({
    mutationFn: productionApi.create,
    onSuccess: (data) => {
      toast.success("✅ Production Saved Successfully");
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setLastResult(data);
      setQuantity("");
      setDamagedQuantity("");
      setBrickRate("");
      setWorkers([""]);
      setNotes("");
    },
    onError: (error: any) => {
      toast.error("❌ Failed to save production", {
        description: error.response?.data?.message || error.message,
      });
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      toast.success("✅ Expense Saved Successfully");
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-recent'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setExpenseAmount("");
      setExpenseNotes("");
      setMaterialId("");
      setMaterialQty("");
      setPricePerUnit("");
    },
    onError: (error: any) => {
      toast.error("❌ Failed to save expense", {
        description: error.response?.data?.message || error.message,
      });
    },
  });

  // Labour edit/delete state
  const [deleteLabourTarget, setDeleteLabourTarget] = useState<{ productionIds: string[] } | null>(null);
  const [editLabour, setEditLabour] = useState<{ workerId: string; name: string; bricks: number; rate: number; productionWorkerEntries: { productionId: string; workerId: string; quantity: number }[] } | null>(null);
  const [editBricks, setEditBricks] = useState("");
  const [editRate, setEditRate] = useState("");

  const deleteProductionMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await productionApi.delete(id);
      }
    },
    onSuccess: () => {
      toast.success("✅ Labour entry deleted successfully");
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error: any) => {
      toast.error("❌ Failed to delete labour entry", {
        description: error.response?.data?.message || error.message,
      });
    },
  });

  const updateProductionMutation = useMutation({
    mutationFn: async ({ entries, newQuantity }: { entries: { productionId: string; workerId: string; quantity: number }[]; newQuantity: number }) => {
      // Distribute the new total quantity proportionally across production records
      const oldTotal = entries.reduce((s, e) => s + e.quantity, 0);
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const production = await productionApi.getById(entry.productionId);
        const proportion = oldTotal > 0 ? entry.quantity / oldTotal : 1 / entries.length;
        const newWorkerQty = i === entries.length - 1
          ? newQuantity - entries.slice(0, -1).reduce((s, e, idx) => s + Math.round(newQuantity * (oldTotal > 0 ? e.quantity / oldTotal : 1 / entries.length)), 0)
          : Math.round(newQuantity * proportion);

        const updatedWorkers = (production.workers || []).map((pw: any) => ({
          workerId: pw.workerId || pw.worker?.id,
          quantity: pw.workerId === entry.workerId || pw.worker?.id === entry.workerId ? Math.max(1, newWorkerQty) : pw.quantity,
        }));

        // Recalculate total quantity for this production
        const totalWorkerQty = updatedWorkers.reduce((s: number, w: any) => s + w.quantity, 0);

        await productionApi.update(entry.productionId, {
          quantity: totalWorkerQty + (production.damagedBricks || 0),
          damagedBricks: production.damagedBricks || 0,
          workers: updatedWorkers,
        });
      }
    },
    onSuccess: () => {
      toast.success("✅ Labour entry updated successfully");
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setEditLabour(null);
    },
    onError: (error: any) => {
      toast.error("❌ Failed to update labour entry", {
        description: error.response?.data?.message || error.message,
      });
    },
  });

  // Set initial selections when data loads
  useEffect(() => {
    if (machines.length > 0 && !machineId) setMachineId(machines[0].id);
    if (brickTypes.length > 0 && !brickTypeId) setBrickTypeId(brickTypes[0].id);
  }, [machines, brickTypes]);

  // Auto-set default brick rate when brick type or shift changes
  useEffect(() => {
    if (brickTypeId) {
      const defaultRate = shift === "NIGHT" ? "3" : "2.5";
      setBrickRate(defaultRate);
    }
  }, [brickTypeId, shift]);

  // Production workers — Operators + Loaders (both involved in brick production)
  const productionWorkerList = workerList.filter((w: any) => {
    const role = w.role?.toUpperCase();
    return role === 'OPERATOR' || role === 'PRODUCTION_WORKER' || role === 'LOADER';
  });

  const addWorker = () => setWorkers(prev => [...prev, ""]);
  const removeWorker = (i: number) => setWorkers(prev => prev.filter((_, idx) => idx !== i));
  const updateWorker = (i: number, v: string) => { const u = [...workers]; u[i] = v; setWorkers(u); };
  const calcTotal = () => {
    return parseInt(quantity) || 0;
  };

  const calcAvailable = () => {
    const total = calcTotal();
    const damaged = parseInt(damagedQuantity) || 0;
    return Math.max(0, total - damaged);
  };

  const saveProduction = () => {
    const totalQty = calcTotal();
    const damagedQty = parseInt(damagedQuantity) || 0;

    if (totalQty <= 0) {
      toast.error("Please enter a valid quantity of bricks produced");
      return;
    }
    if (damagedQty < 0) {
      toast.error("Damaged bricks cannot be negative");
      return;
    }
    if (damagedQty > totalQty) {
      toast.error("Damaged bricks cannot be greater than produced bricks");
      return;
    }
    if (!machineId || !brickTypeId) {
      toast.error("Please select a machine and brick size");
      return;
    }

    const availableQty = calcAvailable();

    // All selected workers share bricks equally
    const selectedWorkerIds = workers.filter(w => w !== "");

    const workerPayload = selectedWorkerIds.map((workerId, index) => {
      const baseQty = Math.floor(availableQty / selectedWorkerIds.length);
      const remainder = availableQty % selectedWorkerIds.length;
      return {
        workerId,
        quantity: index === 0 ? baseQty + remainder : baseQty,
      };
    });

    const payload = {
      date: format(entryDate, 'yyyy-MM-dd'),
      machineId,
      shift: shift as any,
      brickTypeId,
      quantity: totalQty,
      damagedBricks: damagedQty,
      notes,
      workers: workerPayload,
    };

    createProductionMutation.mutate(payload);
  };

  const saveExpense = () => {
    if (!expenseAmount || isNaN(parseFloat(expenseAmount))) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (expenseCategory === 'MATERIAL' && !materialId) {
      toast.error("Please select a material type");
      return;
    }

    createExpenseMutation.mutate({
      date: format(expenseDate, 'yyyy-MM-dd'),
      category: expenseCategory as any,
      amount: parseFloat(expenseAmount),
      notes: expenseNotes,
      paymentMode: 'CASH',
      materialId: expenseCategory === 'MATERIAL' ? materialId : undefined,
      quantity: expenseCategory === 'MATERIAL' && materialQty ? parseFloat(materialQty) : undefined,
      pricePerUnit: expenseCategory === 'MATERIAL' && pricePerUnit ? parseFloat(pricePerUnit) : undefined,
    });
  };

  // Total produced today — full quantity, NOT reduced by damaged bricks.
  // Damaged is tracked as a separate wastage metric (see totalDamagedToday below).
  const totalToday = todayProductions.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const totalDamagedToday = todayProductions.reduce((sum, p) => sum + (p.damagedBricks || 0), 0);

  // Build labour summary from today's productions (track production IDs for edit/delete)
  const labourSummary = (() => {
    const workerMap: Record<string, { name: string; role: string; machine: string; brickType: string; bricks: number; rate: number; total: number; advanceBalance: number; workerId: string; productionIds: string[]; productionWorkerEntries: { productionId: string; workerId: string; quantity: number }[] }> = {};
    todayProductions.forEach((p: any) => {
      (p.workers || []).forEach((pw: any) => {
        const w = pw.worker;
        if (!w) return;
        const key = `${w.id}-${p.machine?.name}-${p.brickType?.size}`;
        const isMason = w.role?.toUpperCase() === 'MASON';
        const rate = isMason ? (w.rate6Inch || w.rate || 9) : (w.perBrickRate || w.rate || 2.5);
        if (!workerMap[key]) {
          workerMap[key] = { name: w.name, role: w.role, machine: p.machine?.name || '-', brickType: p.brickType?.size || '-', bricks: 0, rate, total: 0, advanceBalance: w.advanceBalance || 0, workerId: w.id, productionIds: [], productionWorkerEntries: [] };
        }
        workerMap[key].bricks += pw.quantity;
        workerMap[key].total = workerMap[key].bricks * workerMap[key].rate;
        if (!workerMap[key].productionIds.includes(p.id)) {
          workerMap[key].productionIds.push(p.id);
        }
        workerMap[key].productionWorkerEntries.push({ productionId: p.id, workerId: w.id, quantity: pw.quantity });
      });
    });
    return Object.values(workerMap);
  })();

  const machineOptions = machines.map(m => ({ label: m.name, value: m.id }));
  const brickTypeOptions = brickTypes.map(bt => ({ label: bt.size, value: bt.id }));

  // ─── Monthly Export Helpers ──────────────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false);

  const fetchMonthData = async () => {
    const monthStart = format(startOfMonth(entryDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(entryDate), 'yyyy-MM-dd');
    const res = await productionApi.getAll({ startDate: monthStart, endDate: monthEnd, limit: 9999 });
    return res.productions;
  };

  const buildMonthlyRows = (productions: any[]) => {
    // Sort by date ascending
    const sorted = [...productions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const prodRows: any[][] = [];
    const labourRows: any[][] = [];

    sorted.forEach((p: any) => {
      const dateStr = format(new Date(p.date), 'dd-MM-yyyy');

      // Production row
      prodRows.push([
        dateStr,
        p.machine?.name || "-",
        p.shift || "-",
        p.brickType?.size || "-",
        p.quantity || 0,
        p.damagedBricks || 0,
        p.availableBricks || 0,
      ]);

      // Labour rows from this production's workers
      (p.workers || []).forEach((pw: any) => {
        const w = pw.worker;
        if (!w) return;
        const isMason = w.role?.toUpperCase() === 'MASON';
        const rate = isMason ? (w.rate6Inch || w.rate || 9) : (w.perBrickRate || w.rate || 2.5);
        labourRows.push([
          dateStr,
          w.name || "-",
          w.role || "-",
          p.machine?.name || "-",
          p.brickType?.size || "-",
          pw.quantity || 0,
          rate,
          (pw.quantity || 0) * rate,
        ]);
      });
    });

    return { prodRows, labourRows, sorted };
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const productions = await fetchMonthData();
      if (productions.length === 0) { toast.error("No production data for " + format(entryDate, "MMMM yyyy")); setIsExporting(false); return; }

      const { prodRows, labourRows, sorted } = buildMonthlyRows(productions);
      const monthLabel = format(entryDate, "MMMM yyyy");

      const totalQty = prodRows.reduce((s, r) => s + (r[4] || 0), 0);
      const totalDamaged = prodRows.reduce((s, r) => s + (r[5] || 0), 0);
      const totalAvailable = prodRows.reduce((s, r) => s + (r[6] || 0), 0);
      const totalLabourCost = labourRows.reduce((s, r) => s + (r[7] || 0), 0);

      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text("RD Interlock - Monthly Production Report", 14, 15);
      doc.setFontSize(10);
      doc.text("Month: " + monthLabel + "  |  Total Entries: " + prodRows.length, 14, 22);

      // Production Table
      doc.setFontSize(12);
      doc.text("Production Summary (Date-wise)", 14, 30);

      autoTable(doc, {
        head: [["Date", "Machine", "Shift", "Brick Type", "Total Qty", "Damaged", "Available"]],
        body: prodRows,
        startY: 34,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      const afterProd = (doc as any).lastAutoTable?.finalY || 100;
      doc.setFontSize(9);
      doc.text("Totals  |  Produced: " + totalQty.toLocaleString() + "  |  Damaged: " + totalDamaged.toLocaleString() + "  |  Available: " + totalAvailable.toLocaleString(), 14, afterProd + 6);

      // Labour Table — new page if needed
      if (labourRows.length > 0) {
        doc.addPage();
        doc.setFontSize(16);
        doc.text("RD Interlock - Monthly Labour Report", 14, 15);
        doc.setFontSize(10);
        doc.text("Month: " + monthLabel, 14, 22);
        doc.setFontSize(12);
        doc.text("Labour Summary (Date-wise)", 14, 30);

        autoTable(doc, {
          head: [["Date", "Worker", "Role", "Machine", "Brick Type", "Bricks", "Rate", "Earned"]],
          body: labourRows.map(r => [
            r[0], r[1], r[2], r[3], r[4],
            (r[5] || 0).toLocaleString(),
            "Rs." + r[6],
            "Rs." + (r[7] || 0).toLocaleString(),
          ]),
          startY: 34,
          styles: { fontSize: 7 },
          headStyles: { fillColor: [147, 51, 234] },
        });

        const afterLabour = (doc as any).lastAutoTable?.finalY || 100;
        doc.setFontSize(9);
        doc.text("Total Labour Cost: Rs." + totalLabourCost.toLocaleString() + "  |  Total Workers Entries: " + labourRows.length, 14, afterLabour + 6);
      }

      doc.save("production-report-" + format(entryDate, "MMM-yyyy") + ".pdf");
      toast.success("Monthly PDF exported — " + monthLabel);
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error("PDF export failed", { description: err.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const productions = await fetchMonthData();
      if (productions.length === 0) { toast.error("No production data for " + format(entryDate, "MMMM yyyy")); setIsExporting(false); return; }

      const { prodRows, labourRows } = buildMonthlyRows(productions);
      const monthLabel = format(entryDate, "MMMM yyyy");

      const wb = XLSX.utils.book_new();

      // Production sheet
      const prodCols = ["Date", "Machine", "Shift", "Brick Type", "Total Qty", "Damaged", "Available"];
      const ws1 = XLSX.utils.aoa_to_sheet([prodCols, ...prodRows]);
      ws1["!cols"] = prodCols.map((_, i) => ({ wch: i === 0 ? 12 : 14 }));
      XLSX.utils.book_append_sheet(wb, ws1, "Production");

      // Labour sheet
      if (labourRows.length > 0) {
        const labCols = ["Date", "Worker", "Role", "Machine", "Brick Type", "Bricks", "Rate", "Earned"];
        const ws2 = XLSX.utils.aoa_to_sheet([labCols, ...labourRows]);
        ws2["!cols"] = labCols.map((_, i) => ({ wch: i <= 1 ? 12 : 14 }));
        XLSX.utils.book_append_sheet(wb, ws2, "Labour");
      }

      XLSX.writeFile(wb, "production-report-" + format(entryDate, "MMM-yyyy") + ".xlsx");
      toast.success("Monthly Excel exported — " + monthLabel);
    } catch (err: any) {
      console.error("Excel export error:", err);
      toast.error("Excel export failed", { description: err.message });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <MobileFormLayout title="📖 Daily Entry">
      {/* Monthly Export */}
      <div className="space-y-1.5 mb-4">
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-1">
          Export {format(entryDate, "MMMM yyyy")} — All entries date-wise
        </p>
        <div className="flex gap-2">
          <button onClick={handleExportPDF} disabled={isExporting} className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50">
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />} PDF
          </button>
          <button onClick={handleExportExcel} disabled={isExporting} className="flex-1 h-9 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-all active:scale-[0.98] shadow-sm disabled:opacity-50">
            {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Excel
          </button>
        </div>
      </div>

      {lastResult && (
        <EntryCard title="✅ Production Summary" className="border-green-500/30 bg-green-500/5">
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-green-500/10 pb-3">
              <div>
                <p className="text-[10px] font-bold text-green-600 uppercase">Produced Quantity</p>
                <p className="text-3xl font-black text-green-700">{lastResult.quantity?.toLocaleString()}</p>
                {(lastResult.damagedBricks || 0) > 0 && (
                  <p className="text-[10px] font-semibold text-muted-foreground mt-1">
                    Available for dispatch: {lastResult.availableBricks?.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Damaged</p>
                <p className={`text-sm font-bold ${lastResult.wastagePercentage > 5 ? 'text-red-500' : 'text-orange-500'}`}>
                  {lastResult.damagedBricks || 0} ({lastResult.wastagePercentage}%)
                </p>
              </div>
            </div>

            {lastResult.materialConsumption ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase px-1">Material Consumption</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/50 p-3 rounded-2xl border border-green-500/10 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Cement</p>
                    <p className="text-sm font-black text-foreground">{lastResult.materialConsumption.cementUsed} KG</p>
                  </div>
                  <div className="bg-white/50 p-3 rounded-2xl border border-green-500/10 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Fly Ash</p>
                    <p className="text-sm font-black text-foreground">{lastResult.materialConsumption.flyAshUsed} KG</p>
                  </div>
                  <div className="bg-white/50 p-3 rounded-2xl border border-green-500/10 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Powder</p>
                    <p className="text-sm font-black text-foreground">{lastResult.materialConsumption.powderUsed} KG</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground italic bg-secondary/20 p-2 rounded-lg text-center">
                Material config not found for this brick type.
              </p>
            )}

            <button 
              onClick={() => setLastResult(null)}
              className="w-full py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
            >
              Dismiss Summary
            </button>
          </div>
        </EntryCard>
      )}

      <EntryCard title="🧱 Production Entry">
        <div className="space-y-5">
          <DatePickerField date={entryDate} onDateChange={setEntryDate} />

          <FormField label="Machine">
            {isMetaLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm italic">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading machines...
              </div>
            ) : isMetaError ? (
              <div className="text-sm text-destructive italic">Failed to load machines.</div>
            ) : machines.length > 0 ? (
              <PillSelector
                options={machineOptions}
                value={machineId}
                onChange={setMachineId}
              />
            ) : (
              <div className="text-sm text-muted-foreground italic">No active machines found in settings.</div>
            )}
          </FormField>

          <FormField label="Shift">
            <div className="grid grid-cols-2 gap-2">
              <ActionButton label="☀️ Morning" variant="outline" active={shift === "MORNING"} onClick={() => setShift("MORNING")} />
              <ActionButton label="🌙 Night" variant="outline" active={shift === "NIGHT"} onClick={() => setShift("NIGHT")} />
            </div>
          </FormField>

          <FormField label="Brick Size">
            {isMetaLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm italic">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading sizes...
              </div>
            ) : isMetaError ? (
              <div className="text-sm text-destructive italic">Failed to load brick sizes.</div>
            ) : brickTypes.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {brickTypeOptions.map(opt => (
                  <ActionButton
                    key={opt.value}
                    label={opt.label}
                    variant="outline"
                    active={brickTypeId === opt.value}
                    onClick={() => setBrickTypeId(opt.value)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">No active brick sizes found.</div>
            )}
          </FormField>

          {/* Rate per Brick */}
          <FormField label="Rate per Brick (₹)">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold text-sm">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={brickRate}
                  onChange={(e) => setBrickRate(e.target.value)}
                  placeholder="0"
                  className="w-full h-12 pl-8 pr-3 text-lg font-bold bg-primary/5 border border-primary/20 rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
              <div className="text-right shrink-0">
                <p className="text-[9px] text-muted-foreground uppercase font-bold">per brick</p>
                {quantity && brickRate && (
                  <p className="text-sm font-black text-primary">
                    = ₹{((parseInt(quantity) || 0) * (parseFloat(brickRate) || 0)).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              {[
                { label: "₹2.5 (Day)", value: "2.5" },
                { label: "₹3 (Night)", value: "3" },
                { label: "₹9 (Mason)", value: "9" },
              ].map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setBrickRate(chip.value)}
                  className={`px-3 h-8 rounded-full text-[10px] font-bold border transition-all active:scale-95 ${
                    brickRate === chip.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Quantity Produced" required>
            <BigNumberInput
              value={quantity}
              onChange={setQuantity}
              placeholder="Enter number of bricks"
            />
            {/* Quick Quantity Chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {quickQuantities.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q.toString())}
                  className="px-5 h-10 rounded-full border border-border bg-card text-foreground text-xs font-black uppercase tracking-tight hover:border-primary/40 hover:bg-primary/4 transition-all active:scale-95 shadow-sm"
                >
                  {q.toLocaleString()}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Damaged Bricks">
            <BigNumberInput
              value={damagedQuantity}
              onChange={setDamagedQuantity}
              placeholder="Enter number of damaged bricks"
              min={0}
            />
          </FormField>

          <div className={`p-4 rounded-2xl border-2 transition-all ${parseInt(damagedQuantity) > calcTotal() ? 'bg-destructive/10 border-destructive shadow-destructive/10' : 'bg-primary/10 border-primary shadow-primary/10'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Produced Bricks</p>
                <p className={`text-2xl font-black ${parseInt(damagedQuantity) > calcTotal() ? 'text-destructive' : 'text-primary'}`}>
                  {calcTotal().toLocaleString()}
                </p>
                {(parseInt(damagedQuantity) || 0) > 0 && parseInt(damagedQuantity) <= calcTotal() && (
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] font-semibold">
                    <span className="text-destructive">
                      Damaged: {(parseInt(damagedQuantity) || 0).toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">
                      Payable to workers: {calcAvailable().toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right">
                {brickRate && calcTotal() > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Total Cost</p>
                    <p className="text-lg font-black text-primary">₹{(calcTotal() * (parseFloat(brickRate) || 0)).toLocaleString()}</p>
                  </div>
                )}
                {(!brickRate || calcTotal() <= 0) && (
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${parseInt(damagedQuantity) > calcTotal() ? 'bg-destructive/20' : 'bg-primary/20'}`}>
                    {parseInt(damagedQuantity) > calcTotal() ? <X className="h-5 w-5 text-destructive" /> : <Check className="h-5 w-5 text-primary" />}
                  </div>
                )}
              </div>
            </div>
            {parseInt(damagedQuantity) > calcTotal() && (
              <p className="text-[10px] text-destructive font-bold mt-2">
                ⚠️ Damaged bricks cannot be greater than produced bricks
              </p>
            )}
          </div>

          {/* Live Material Consumption Preview */}
          {(() => {
            const qty = parseInt(quantity) || 0;
            if (qty <= 0 || !brickTypeId) return null;

            const config = materialConfigs.find((c: MaterialConfig) => c.brickTypeId === brickTypeId);
            if (!config) return (
              <div className="p-3 bg-secondary/20 rounded-xl text-center">
                <p className="text-[10px] text-muted-foreground italic">Material config not set for this brick type. Configure in Settings.</p>
              </div>
            );

            const factor = qty / 1000;
            const cementUsed = parseFloat((factor * config.cementPer1000).toFixed(2));
            const flyAshUsed = parseFloat((factor * config.flyAshPer1000).toFixed(2));
            const powderUsed = parseFloat((factor * config.powderPer1000).toFixed(2));
            const selectedSize = brickTypes.find((bt: any) => bt.id === brickTypeId)?.size || "";

            return (
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl animate-in fade-in duration-200">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-amber-500 flex items-center justify-center">
                    <PackageOpen className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Material Consumption</p>
                    <p className="text-[10px] text-muted-foreground">For {qty.toLocaleString()} bricks ({selectedSize})</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/50 p-3 rounded-xl border border-amber-500/10 text-center">
                    <p className="text-[9px] font-bold text-amber-700 uppercase mb-0.5">Cement</p>
                    <p className="text-base font-black text-foreground">{cementUsed}</p>
                    <p className="text-[9px] text-muted-foreground">BAGS</p>
                  </div>
                  <div className="bg-white/50 p-3 rounded-xl border border-amber-500/10 text-center">
                    <p className="text-[9px] font-bold text-amber-700 uppercase mb-0.5">Fly Ash</p>
                    <p className="text-base font-black text-foreground">{flyAshUsed}</p>
                    <p className="text-[9px] text-muted-foreground">KG</p>
                  </div>
                  <div className="bg-white/50 p-3 rounded-xl border border-amber-500/10 text-center">
                    <p className="text-[9px] font-bold text-amber-700 uppercase mb-0.5">Powder</p>
                    <p className="text-base font-black text-foreground">{powderUsed}</p>
                    <p className="text-[9px] text-muted-foreground">KG</p>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground mt-2 text-center italic">
                  Based on config: {config.cementPer1000} bags / {config.flyAshPer1000} KG / {config.powderPer1000} KG per 1000 bricks
                </p>
              </div>
            );
          })()}

          {/* Select Workers */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Workers</span>
                <p className="text-[10px] text-primary font-medium">Operators + Loaders — bricks split equally among all selected workers</p>
              </div>
              <button type="button" onClick={addWorker} className="inline-flex items-center gap-1 text-sm text-primary font-semibold touch-target">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {workers.map((w, i) => (
                <div key={i} className="flex gap-2">
                  <select
                    value={w}
                    onChange={(e) => updateWorker(i, e.target.value)}
                    disabled={isMetaLoading}
                    className="flex-1 h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                  >
                    <option value="">{isMetaLoading ? "Loading workers..." : "Select worker..."}</option>
                    {productionWorkerList.length > 0
                      ? productionWorkerList.map((worker: any) => <option key={worker.id} value={worker.id}>{worker.name} ({worker.role})</option>)
                      : workerList.filter((wk: any) => !['MASON', 'MANAGER', 'DRIVER', 'TELECALLER'].includes(wk.role?.toUpperCase())).map((worker: any) => <option key={worker.id} value={worker.id}>{worker.name} ({worker.role})</option>)
                    }
                  </select>
                  {workers.length > 1 && (
                    <button onClick={() => removeWorker(i)} className="text-muted-foreground hover:text-destructive touch-target px-2 transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {workers.filter(w => w !== "").length > 1 && (
              <p className="text-[10px] text-muted-foreground mt-2 italic">
                {calcAvailable().toLocaleString()} bricks ÷ {workers.filter(w => w !== "").length} workers = {Math.floor(calcAvailable() / workers.filter(w => w !== "").length).toLocaleString()} bricks each
              </p>
            )}
          </div>

          {/* Sticky-style Save */}
          <div className="sticky bottom-20 md:bottom-4 z-10 pt-2">
            <ActionButton
              label={createProductionMutation.isPending ? "Saving..." : "Save Production"}
              icon={createProductionMutation.isPending ? Loader2 : Save}
              variant="success"
              size="lg"
              onClick={saveProduction}
              className={`w-full shadow-lg ${createProductionMutation.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={createProductionMutation.isPending}
            />
          </div>

        </div>
      </EntryCard>

      {/* Today's Production Summary */}
      <EntryCard title="📊 Today's Summary">
        <div className="space-y-2">
          {todayProductions.length > 0 ? (
            todayProductions.map((p, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{p.machine.name} ({p.shift.toLowerCase()})</span>
                <span className="text-right">
                  <span className="block text-sm font-bold text-foreground">{(p.quantity || 0).toLocaleString()} bricks</span>
                  {(p.damagedBricks || 0) > 0 && (
                    <span className="block text-[10px] font-semibold text-destructive">
                      {p.damagedBricks.toLocaleString()} damaged
                    </span>
                  )}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center italic">No entries for this date</p>
          )}
          <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20">
            <div>
              <span className="text-sm font-bold text-foreground">Total Produced</span>
              {totalDamagedToday > 0 && (
                <p className="text-[10px] font-bold text-destructive mt-0.5">
                  Damaged: {totalDamagedToday.toLocaleString()} (tracked separately)
                </p>
              )}
            </div>
            <span className="text-lg font-bold text-primary">{totalToday.toLocaleString()} bricks</span>
          </div>
        </div>
      </EntryCard>

      {/* Labour Summary */}
      {labourSummary.length > 0 && (
        <EntryCard title="👷 Labour Summary">
          <div className="space-y-2">
            {labourSummary.map((l, i) => (
              <div key={i} className="p-3 bg-secondary/30 rounded-xl border border-border/50">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${l.role === 'MASON' ? 'bg-purple-500' : 'bg-blue-500'}`}>
                      {l.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{l.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{l.role} • {l.machine} • {l.brickType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-primary mr-1">₹{l.total.toLocaleString()}</span>
                    <button
                      onClick={() => {
                        setEditLabour({ workerId: l.workerId, name: l.name, bricks: l.bricks, rate: l.rate, productionWorkerEntries: l.productionWorkerEntries });
                        setEditBricks(l.bricks.toString());
                        setEditRate(l.rate.toString());
                      }}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all active:scale-90"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteLabourTarget({ productionIds: l.productionIds })}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all active:scale-90"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-muted-foreground mt-2 pt-2 border-t border-border/30">
                  <div className="text-center">
                    <p className="uppercase text-[8px]">Bricks</p>
                    <p className="text-foreground">{l.bricks.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="uppercase text-[8px]">Rate</p>
                    <p className="text-foreground">₹{l.rate}</p>
                  </div>
                  <div className="text-center">
                    <p className="uppercase text-[8px]">Earned</p>
                    <p className="text-foreground">₹{l.total.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="uppercase text-[8px]">Advance</p>
                    <p className={l.advanceBalance > 0 ? "text-amber-600" : "text-foreground"}>₹{l.advanceBalance.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20">
              <span className="text-sm font-bold text-foreground">Total Labour Cost</span>
              <span className="text-lg font-bold text-primary">₹{labourSummary.reduce((s, l) => s + l.total, 0).toLocaleString()}</span>
            </div>
          </div>
        </EntryCard>
      )}

      {/* Labour Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteLabourTarget}
        onClose={() => setDeleteLabourTarget(null)}
        onConfirm={() => {
          if (deleteLabourTarget) {
            deleteProductionMutation.mutate(deleteLabourTarget.productionIds);
            setDeleteLabourTarget(null);
          }
        }}
        title="Delete Labour Entry?"
        description="This will delete the production record(s) associated with this worker. This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />

      {/* Labour Edit Modal */}
      {editLabour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setEditLabour(null)}>
          <div className="bg-card rounded-3xl border border-border shadow-2xl w-full max-w-[400px] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-primary/10">
                <Pencil className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Edit Labour Entry</h3>
                <p className="text-xs text-muted-foreground">{editLabour.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <FormField label="Bricks Produced" required>
                <input
                  type="number"
                  inputMode="numeric"
                  value={editBricks}
                  onChange={(e) => setEditBricks(e.target.value)}
                  className="w-full h-12 px-4 text-lg font-bold bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </FormField>

              <FormField label="Rate per Brick (₹)">
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={editRate}
                  onChange={(e) => setEditRate(e.target.value)}
                  className="w-full h-12 px-4 text-lg font-bold bg-secondary/50 border border-border rounded-xl focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </FormField>

              <div className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Total Earning</span>
                  <span className="text-lg font-black text-primary">
                    ₹{((parseFloat(editBricks) || 0) * (parseFloat(editRate) || 0)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEditLabour(null)}
                className="flex-1 h-12 rounded-2xl bg-secondary/50 text-foreground font-bold hover:bg-secondary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const newQty = parseInt(editBricks);
                  if (!newQty || newQty <= 0) {
                    toast.error("Please enter a valid quantity");
                    return;
                  }
                  updateProductionMutation.mutate({
                    entries: editLabour.productionWorkerEntries,
                    newQuantity: newQty,
                  });
                }}
                disabled={updateProductionMutation.isPending}
                className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
              >
                {updateProductionMutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

    </MobileFormLayout >
  );
};

export default DailyEntry;
