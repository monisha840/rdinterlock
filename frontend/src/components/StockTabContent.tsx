import { useState } from "react";
import { Factory, Package, Loader2, AlertTriangle, Info, RefreshCw, Zap, FileText, Download, AlertOctagon } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { stockApi } from "@/api/stock.api";
import apiClient from "@/api/apiClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const StockTabContent = () => {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  const { data: stockData = [], isLoading: isStockLoading } = useQuery({
    queryKey: ['stock', 'current'],
    queryFn: () => stockApi.getCurrent(),
  });

  const { data: alertsData, isLoading: isAlertsLoading } = useQuery({
    queryKey: ['stock', 'alerts'],
    queryFn: async () => {
      const res = await apiClient.get('/stock/alerts');
      return (res as any).data;
    },
    refetchInterval: 30000,
  });

  const isLoading = isStockLoading || isAlertsLoading;

  const totalProduced = stockData.reduce((sum: number, s: any) => sum + s.produced, 0);
  const totalDamaged = stockData.reduce((sum: number, s: any) => sum + (s.damaged || 0), 0);
  const totalDispatched = stockData.reduce((sum: number, s: any) => sum + s.dispatched, 0);
  const totalStock = stockData.reduce((sum: number, s: any) => sum + s.currentStock, 0);
  const wastagePct = totalProduced > 0 ? (totalDamaged / totalProduced) * 100 : 0;

  const stages = [
    {
      label: "Total Produced",
      value: totalProduced.toLocaleString(),
      icon: Factory,
      gradient: "gradient-primary",
      pct: 100,
      barColor: "bg-primary",
      details: "Total production logs recorded (full output including any damaged)"
    },
    {
      label: "Damaged Bricks",
      value: totalDamaged.toLocaleString(),
      icon: AlertOctagon,
      gradient: "bg-destructive",
      pct: wastagePct,
      barColor: "bg-destructive",
      details: `Recorded as scrap / wastage during production (${wastagePct.toFixed(2)}% of output). Tracked separately — never subtracted from stock.`
    },
    {
      label: "Total Dispatched",
      value: totalDispatched.toLocaleString(),
      icon: Package,
      gradient: "gradient-warning",
      pct: (totalProduced > 0 ? (totalDispatched / totalProduced) * 100 : 0),
      barColor: "bg-warning",
      details: "Bricks shipped to customers"
    },
    {
      label: "Ready Stock",
      value: totalStock.toLocaleString(),
      icon: Package,
      gradient: "gradient-success",
      pct: (totalProduced > 0 ? (totalStock / totalProduced) * 100 : 0),
      barColor: "bg-success",
      details: "Available inventory for sale"
    },
  ];

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['stock'] });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground animate-pulse">Analyzing inventory...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-8">
      {/* Header + Export */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Live Inventory</h2>
        <div className="flex items-center gap-1.5">
          <button onClick={() => {
            try {
              const doc = new jsPDF();
              doc.setFontSize(16); doc.text("RD Interlock - Stock Report", 14, 15);
              doc.setFontSize(10); doc.text("Generated: " + format(new Date(), "dd-MM-yyyy HH:mm"), 14, 22);
              autoTable(doc, {
                head: [["Brick Type", "Produced", "Damaged", "Dispatched", "Current Stock"]],
                body: stockData.map((d: any) => [d.brickType?.size || "-", d.produced || 0, d.damaged || 0, d.dispatched || 0, d.currentStock || 0]),
                startY: 28, styles: { fontSize: 9 }, headStyles: { fillColor: [16, 185, 129] },
              });
              const fy = (doc as any).lastAutoTable?.finalY || 80;
              doc.text("Totals — Produced: " + totalProduced.toLocaleString() + " | Damaged: " + totalDamaged.toLocaleString() + " | Dispatched: " + totalDispatched.toLocaleString() + " | Stock: " + totalStock.toLocaleString(), 14, fy + 8);
              doc.save("stock-report-" + format(new Date(), "dd-MM-yyyy") + ".pdf");
              toast.success("PDF exported");
            } catch (err: any) { toast.error("Export failed", { description: err.message }); }
          }} className="h-8 px-2.5 flex items-center gap-1 rounded-lg bg-secondary/50 border border-border text-[10px] font-bold hover:bg-secondary transition-all active:scale-95"><FileText className="h-3 w-3" /> PDF</button>
          <button onClick={() => {
            try {
              const cols = ["Brick Type", "Produced", "Damaged", "Dispatched", "Current Stock"];
              const rows = stockData.map((d: any) => [d.brickType?.size || "-", d.produced || 0, d.damaged || 0, d.dispatched || 0, d.currentStock || 0]);
              const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "Stock");
              XLSX.writeFile(wb, "stock-report-" + format(new Date(), "dd-MM-yyyy") + ".xlsx");
              toast.success("Excel exported");
            } catch (err: any) { toast.error("Export failed", { description: err.message }); }
          }} className="h-8 px-2.5 flex items-center gap-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition-all active:scale-95"><Download className="h-3 w-3" /> Excel</button>
          <button
            onClick={refreshData}
            className="p-2 rounded-xl bg-secondary/50 text-muted-foreground hover:text-primary transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {alertsData?.warnings && alertsData.warnings.length > 0 && (
        <div className="space-y-2">
          {alertsData.warnings.map((alert: any, i: number) => {
            const bgColor = alert.type === 'RED' ? 'bg-destructive/10' : alert.type === 'YELLOW' ? 'bg-yellow-500/10' : 'bg-orange-500/10';
            const borderColor = alert.type === 'RED' ? 'border-destructive/30' : alert.type === 'YELLOW' ? 'border-yellow-500/30' : 'border-orange-500/30';
            const textColor = alert.type === 'RED' ? 'text-destructive' : alert.type === 'YELLOW' ? 'text-yellow-600' : 'text-orange-600';
            const Icon = alert.type === 'RED' ? AlertTriangle : alert.type === 'YELLOW' ? Info : Zap;

            return (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-2xl border ${bgColor} ${borderColor} animate-in slide-in-from-top-2 duration-300`}>
                <div className={`${textColor} mt-0.5 relative`}>
                  <Icon className="h-5 w-5 fill-current opacity-20" />
                  <Icon className="h-5 w-5 absolute -mt-5" />
                </div>
                <p className={`text-xs font-bold leading-tight ${textColor}`}>{alert.message}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="space-y-3">
        {stages.map((s, i) => (
          <div
            key={i}
            onClick={() => setSelectedStage(i)}
            className="card-modern-hover p-4 animate-fade-in"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={`rounded-xl p-2.5 ${s.gradient} shadow-sm`}>
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </div>
            </div>
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-1000 ease-out ${s.barColor}`}
                style={{ width: `${s.pct}%` }}
              />
            </div>
          </div>
        ))}

        <div className="grid grid-cols-1 gap-4 mt-4">
          {/* Stock by Size */}
          <div className="card-modern p-5">
            <h2 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Stock by Size
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {stockData.map((data: any) => (
                <div key={data.brickType.id} className="bg-secondary/40 rounded-2xl p-4 border border-transparent hover:border-primary/20 transition-all">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1 text-center">{data.brickType.size}</p>
                  <p className="text-xl font-bold text-foreground text-center">{data.currentStock.toLocaleString()}</p>
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-muted-foreground">Produced: {(data.produced || 0).toLocaleString()}</span>
                    <span className={`${(data.damaged || 0) > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      Damaged: {(data.damaged || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Damaged Bricks Summary — admin-only visibility, not subtracted from stock */}
          <div className="card-modern p-5 border-destructive/20 bg-destructive/5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <AlertOctagon className="h-4 w-4 text-destructive" /> Damaged Bricks
              </h2>
              <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {wastagePct.toFixed(2)}% wastage
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-background/70 border border-destructive/10 p-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Damaged</p>
                <p className="text-2xl font-black text-destructive">{totalDamaged.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-background/70 border border-destructive/10 p-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Good Output</p>
                <p className="text-2xl font-black text-foreground">{(totalProduced - totalDamaged).toLocaleString()}</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-3 italic leading-relaxed">
              Damaged bricks are stored separately per Daily Entry (Production.damagedBricks). They are <span className="font-bold text-foreground">not</span> subtracted from produced quantity or available stock — they are tracked for wastage analysis only.
            </p>
          </div>

          {/* Material Availability */}
          <div className="card-modern p-5">
            <h2 className="font-semibold text-foreground text-sm mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" /> Material Availability
            </h2>
            <div className="space-y-3">
              {alertsData?.materialStatus?.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                  <div>
                    <p className="text-xs font-bold text-foreground">{m.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{m.unit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground">{m.stock.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-success uppercase">Available</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Capacity (Bricks Possible)</h3>
              <div className="grid grid-cols-2 gap-3">
                {alertsData?.productionLimits?.map((pl: any) => (
                  <div key={pl.brickTypeId} className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase">{pl.brickType}</p>
                    <p className="text-lg font-black text-foreground">
                      {pl.limit === Infinity ? '∞' : pl.limit.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Dialog */}
      <Dialog open={selectedStage !== null} onOpenChange={() => setSelectedStage(null)}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>{selectedStage !== null && stages[selectedStage].label}</DialogTitle>
          </DialogHeader>
          {selectedStage !== null && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 bg-secondary/40 rounded-xl p-3">
                <span className="text-sm text-muted-foreground">Value:</span>
                <span className="text-lg font-bold text-foreground">{stages[selectedStage].value}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {stages[selectedStage].details}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
