import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients.api";
import { materialConfigApi } from "@/api/material-config.api";
import type { MaterialConfig } from "@/api/material-config.api";
import apiClient from "@/api/apiClient";
import { format } from "date-fns";
import { Loader2, TrendingUp, TrendingDown, IndianRupee, Truck, Hammer, Package, Factory, FileText, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

interface ProfitAnalysisProps {
  startDate: Date;
  endDate: Date;
}

export const ProfitAnalysis = ({ startDate, endDate }: ProfitAnalysisProps) => {
  const startStr = format(startDate, "yyyy-MM-dd");
  const endStr = format(endDate, "yyyy-MM-dd");

  // Fetch ALL orders (not just dispatched — include all statuses for full picture)
  const { data: allOrders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ["profit-orders"],
    queryFn: () => clientsApi.getAllOrders({}),
  });

  // Fetch all clients
  const { data: allClients = [], isLoading: isClientsLoading } = useQuery({
    queryKey: ["profit-clients"],
    queryFn: () => clientsApi.getAll(),
  });

  // Fetch material configs
  const { data: materialConfigs = [] } = useQuery<MaterialConfig[]>({
    queryKey: ["material-configs"],
    queryFn: materialConfigApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch worker wages for the period (to get production cost)
  const { data: workerWages = [] } = useQuery<any[]>({
    queryKey: ["profit-wages", startStr, endStr],
    queryFn: async () => {
      const res = await apiClient.get(`/reports/workers?startDate=${startStr}&endDate=${endStr}`);
      return (res as any).data || [];
    },
  });

  // Fetch transport expenses for the period
  const { data: transportEntries = [] } = useQuery<any[]>({
    queryKey: ["profit-transport", startStr, endStr],
    queryFn: async () => {
      const res = await apiClient.get(`/transport/entries?startDate=${startStr}&endDate=${endStr}`);
      return (res as any).data || [];
    },
  });

  const isLoading = isOrdersLoading || isClientsLoading;

  // Build client map
  const clientMap = useMemo(() => {
    const map: Record<string, any> = {};
    (allClients as any[]).forEach((c: any) => { map[c.id] = c; });
    return map;
  }, [allClients]);

  // Build material cost lookup
  // Estimated market prices: Cement ~₹400/bag (50kg), Fly Ash ~₹2/KG, Powder ~₹1.5/KG
  const materialCostPerBrick = useMemo(() => {
    const map: Record<string, number> = {};
    materialConfigs.forEach((mc) => {
      const cementCostPer1000 = (mc.cementPer1000 || 0) * 400;
      const flyAshCostPer1000 = (mc.flyAshPer1000 || 0) * 2;
      const powderCostPer1000 = (mc.powderPer1000 || 0) * 1.5;
      const totalPer1000 = cementCostPer1000 + flyAshCostPer1000 + powderCostPer1000;
      map[mc.brickTypeId] = totalPer1000 / 1000;
    });
    return map;
  }, [materialConfigs]);

  // Calculate total production worker cost
  const totalProductionWorkerCost = useMemo(() => {
    return workerWages.reduce((sum: number, w: any) => sum + (w.grossWage || 0), 0);
  }, [workerWages]);

  // Calculate total transport expense
  const totalTransportExpense = useMemo(() => {
    return transportEntries.reduce((sum: number, t: any) => sum + (t.expenseAmount || 0), 0);
  }, [transportEntries]);

  // Calculate per-client profit
  const clientProfits = useMemo(() => {
    const profitMap: Record<string, {
      clientId: string;
      clientName: string;
      location: string;
      orders: number;
      totalQuantity: number;
      revenue: number;
      materialCost: number;
      masonCost: number;
      transportShare: number;
      workerShare: number;
      totalCost: number;
      profit: number;
      margin: number;
      paid: number;
      pending: number;
    }> = {};

    // Include all orders within date range (any status that has revenue)
    const start = new Date(startDate); start.setHours(0, 0, 0, 0);
    const end = new Date(endDate); end.setHours(23, 59, 59, 999);

    const filteredOrders = (allOrders as any[]).filter((o: any) => {
      const orderDate = new Date(o.orderDate || o.expectedDispatchDate || o.createdAt);
      return orderDate >= start && orderDate <= end;
    });

    const totalOrderedBricks = filteredOrders.reduce((s: number, o: any) => s + (o.quantity || 0), 0);

    filteredOrders.forEach((order: any) => {
      const clientId = order.clientId;
      const client = clientMap[clientId];
      if (!client) return;

      if (!profitMap[clientId]) {
        profitMap[clientId] = {
          clientId,
          clientName: client.name || order.client?.name || "Unknown",
          location: client.address || order.client?.address || "-",
          orders: 0,
          totalQuantity: 0,
          revenue: 0,
          materialCost: 0,
          masonCost: 0,
          transportShare: 0,
          workerShare: 0,
          totalCost: 0,
          profit: 0,
          margin: 0,
          paid: client.totalPaid || 0,
          pending: Math.max(0, client.pendingAmount || 0),
        };
      }

      const entry = profitMap[clientId];
      const qty = order.quantity || 0;
      const brickTypeId = order.brickTypeId;

      entry.orders += 1;
      entry.totalQuantity += qty;
      entry.revenue += order.totalAmount || 0;

      // Material cost
      const matCostPerBrick = materialCostPerBrick[brickTypeId] || 3; // fallback ₹3/brick
      entry.materialCost += qty * matCostPerBrick;

      // Mason cost — only if order has construction type (site work)
      if (order.constructionType) {
        const ct = order.constructionType.toLowerCase();
        let masonRate = 9; // default
        const brickSize = order.brickType?.size?.toLowerCase() || "";
        if (brickSize.includes("6") && ct.includes("compound")) masonRate = 7;
        else if (brickSize.includes("8")) masonRate = 10;
        entry.masonCost += qty * masonRate;
      }

      // Transport share (proportional to bricks ordered)
      if (totalOrderedBricks > 0) {
        entry.transportShare += (qty / totalOrderedBricks) * totalTransportExpense;
      }

      // Production worker share (proportional to bricks ordered)
      if (totalOrderedBricks > 0) {
        entry.workerShare += (qty / totalOrderedBricks) * totalProductionWorkerCost;
      }
    });

    // Calculate totals
    Object.values(profitMap).forEach(entry => {
      entry.materialCost = Math.round(entry.materialCost);
      entry.masonCost = Math.round(entry.masonCost);
      entry.transportShare = Math.round(entry.transportShare);
      entry.workerShare = Math.round(entry.workerShare);
      entry.totalCost = entry.materialCost + entry.masonCost + entry.transportShare + entry.workerShare;
      entry.profit = entry.revenue - entry.totalCost;
      entry.margin = entry.revenue > 0 ? Math.round((entry.profit / entry.revenue) * 100) : 0;
    });

    return Object.values(profitMap).sort((a, b) => b.profit - a.profit);
  }, [allOrders, clientMap, materialCostPerBrick, totalTransportExpense, totalProductionWorkerCost, startDate, endDate]);

  // Summary totals
  const summary = useMemo(() => {
    const totalRevenue = clientProfits.reduce((s, c) => s + c.revenue, 0);
    const totalCost = clientProfits.reduce((s, c) => s + c.totalCost, 0);
    const totalProfit = clientProfits.reduce((s, c) => s + c.profit, 0);
    const totalMaterial = clientProfits.reduce((s, c) => s + c.materialCost, 0);
    const totalMason = clientProfits.reduce((s, c) => s + c.masonCost, 0);
    const totalPaid = clientProfits.reduce((s, c) => s + c.paid, 0);
    const totalPending = clientProfits.reduce((s, c) => s + c.pending, 0);
    const avgMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

    return { totalRevenue, totalCost, totalProfit, totalMaterial, totalMason, totalTransportExpense, totalProductionWorkerCost, totalPaid, totalPending, avgMargin };
  }, [clientProfits, totalTransportExpense, totalProductionWorkerCost]);

  // Export PDF
  const handleExportPDF = () => {
    try {
      if (clientProfits.length === 0) { toast.error("No profit data to export"); return; }
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16); doc.text("RD Interlock - Profit Analysis", 14, 15);
      doc.setFontSize(10);
      doc.text("Period: " + format(startDate, "dd MMM yyyy") + " to " + format(endDate, "dd MMM yyyy"), 14, 22);
      doc.text("Total Revenue: Rs." + summary.totalRevenue.toLocaleString() + "  |  Total Cost: Rs." + summary.totalCost.toLocaleString() + "  |  Profit: Rs." + summary.totalProfit.toLocaleString() + " (" + summary.avgMargin + "%)", 14, 29);

      autoTable(doc, {
        head: [["Client", "Location", "Orders", "Qty", "Revenue", "Material", "Mason", "Transport", "Worker", "Total Cost", "Profit", "Margin"]],
        body: clientProfits.map(c => [
          c.clientName, c.location, c.orders, c.totalQuantity.toLocaleString(),
          "Rs." + c.revenue.toLocaleString(), "Rs." + c.materialCost.toLocaleString(),
          "Rs." + c.masonCost.toLocaleString(), "Rs." + c.transportShare.toLocaleString(),
          "Rs." + c.workerShare.toLocaleString(), "Rs." + c.totalCost.toLocaleString(),
          "Rs." + c.profit.toLocaleString(), c.margin + "%"
        ]),
        startY: 35, styles: { fontSize: 6 }, headStyles: { fillColor: [16, 185, 129] },
      });

      doc.save("profit-analysis-" + format(new Date(), "dd-MM-yyyy") + ".pdf");
      toast.success("PDF exported");
    } catch (err: any) { toast.error("Export failed", { description: err.message }); }
  };

  // Export Excel
  const handleExportExcel = () => {
    try {
      if (clientProfits.length === 0) { toast.error("No profit data to export"); return; }
      const cols = ["Client", "Location", "Orders", "Quantity", "Revenue", "Material Cost", "Mason Cost", "Transport Cost", "Worker Cost", "Total Cost", "Profit", "Margin %", "Paid", "Pending"];
      const rows = clientProfits.map(c => [
        c.clientName, c.location, c.orders, c.totalQuantity, c.revenue,
        c.materialCost, c.masonCost, c.transportShare, c.workerShare,
        c.totalCost, c.profit, c.margin, c.paid, c.pending
      ]);
      const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Profit Analysis");
      XLSX.writeFile(wb, "profit-analysis-" + format(new Date(), "dd-MM-yyyy") + ".xlsx");
      toast.success("Excel exported");
    } catch (err: any) { toast.error("Export failed", { description: err.message }); }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 card-modern">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Calculating profit...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Export */}
      <div className="flex gap-2">
        <button onClick={handleExportPDF} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-all active:scale-[0.98]"><FileText className="h-3.5 w-3.5" /> Export PDF</button>
        <button onClick={handleExportExcel} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-all active:scale-[0.98]"><Download className="h-3.5 w-3.5" /> Export Excel</button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Revenue</span>
            <IndianRupee className="h-3.5 w-3.5 text-emerald-500 opacity-40" />
          </div>
          <p className="text-xl font-black text-emerald-700">₹{summary.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">Total Cost</span>
            <TrendingDown className="h-3.5 w-3.5 text-rose-500 opacity-40" />
          </div>
          <p className="text-xl font-black text-rose-700">₹{summary.totalCost.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-primary">Net Profit</span>
            <TrendingUp className="h-3.5 w-3.5 text-primary opacity-40" />
          </div>
          <p className={`text-xl font-black ${summary.totalProfit >= 0 ? 'text-primary' : 'text-rose-600'}`}>₹{summary.totalProfit.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{summary.avgMargin}% margin</p>
        </div>
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Pending</span>
            <IndianRupee className="h-3.5 w-3.5 text-amber-500 opacity-40" />
          </div>
          <p className="text-xl font-black text-amber-700">₹{summary.totalPending.toLocaleString()}</p>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="card-modern p-4">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Cost Breakdown</p>
        <div className="space-y-2.5">
          {[
            { label: "Raw Materials", value: summary.totalMaterial, icon: Package, color: "bg-blue-500", pct: summary.totalCost > 0 ? Math.round((summary.totalMaterial / summary.totalCost) * 100) : 0 },
            { label: "Mason Wages", value: summary.totalMason, icon: Hammer, color: "bg-purple-500", pct: summary.totalCost > 0 ? Math.round((summary.totalMason / summary.totalCost) * 100) : 0 },
            { label: "Production Workers", value: summary.totalProductionWorkerCost, icon: Factory, color: "bg-orange-500", pct: summary.totalCost > 0 ? Math.round((summary.totalProductionWorkerCost / summary.totalCost) * 100) : 0 },
            { label: "Transport", value: summary.totalTransportExpense, icon: Truck, color: "bg-cyan-500", pct: summary.totalCost > 0 ? Math.round((summary.totalTransportExpense / summary.totalCost) * 100) : 0 },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${item.color}`} />
                  <span className="text-[11px] font-bold text-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black text-foreground">₹{item.value.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground w-8 text-right">{item.pct}%</span>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all duration-700 ${item.color}`} style={{ width: `${item.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per Client Profit */}
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 px-1">Profit by Client ({clientProfits.length})</p>
        {clientProfits.length === 0 ? (
          <div className="card-modern p-8 text-center">
            <TrendingUp className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground italic">No orders found for this period</p>
            <p className="text-[11px] text-muted-foreground mt-1">Try changing the date filter to "This Month" or "Custom" range</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clientProfits.map((c) => (
              <div key={c.clientId} className="card-modern p-4">
                {/* Client Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{c.clientName}</p>
                    <p className="text-[10px] text-muted-foreground">{c.location} · {c.orders} order{c.orders > 1 ? "s" : ""} · {c.totalQuantity.toLocaleString()} bricks</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className={`text-base font-black ${c.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {c.profit >= 0 ? '+' : ''}₹{c.profit.toLocaleString()}
                    </p>
                    <p className={`text-[10px] font-bold ${c.margin >= 50 ? 'text-emerald-600' : c.margin >= 30 ? 'text-amber-600' : 'text-rose-600'}`}>
                      {c.margin}% margin
                    </p>
                  </div>
                </div>

                {/* Revenue vs Cost bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[10px] font-bold mb-1">
                    <span className="text-emerald-600">Revenue: ₹{c.revenue.toLocaleString()}</span>
                    <span className="text-rose-600">Cost: ₹{c.totalCost.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-rose-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${Math.min(100, c.revenue > 0 ? ((c.revenue - c.totalCost) / c.revenue) * 100 : 0)}%` }} />
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="grid grid-cols-4 gap-2 text-[10px] pt-3 border-t border-border/30">
                  <div className="text-center">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mb-0.5">Material</p>
                    <p className="font-black text-foreground">₹{c.materialCost.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mb-0.5">Mason</p>
                    <p className="font-black text-foreground">₹{c.masonCost.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mb-0.5">Transport</p>
                    <p className="font-black text-foreground">₹{c.transportShare.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase mb-0.5">Workers</p>
                    <p className="font-black text-foreground">₹{c.workerShare.toLocaleString()}</p>
                  </div>
                </div>

                {/* Payment Status */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20 text-[10px] font-bold">
                  <span className="text-emerald-600">Paid: ₹{c.paid.toLocaleString()}</span>
                  {c.pending > 0 && <span className="text-rose-600">Pending: ₹{c.pending.toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
