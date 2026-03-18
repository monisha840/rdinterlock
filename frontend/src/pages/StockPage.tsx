import { useState, useMemo } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { Factory, Package, Loader2, AlertTriangle, Info, RefreshCw, Zap } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { stockApi } from "@/api/stock.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const StockPage = () => {
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  // Queries
  const { data: stockData = [], isLoading: isStockLoading } = useQuery({
    queryKey: ['stock', 'current'],
    queryFn: () => stockApi.getCurrent(),
  });

  const { data: alertsData, isLoading: isAlertsLoading } = useQuery({
    queryKey: ['stock', 'alerts'],
    queryFn: async () => {
        const response = await fetch('/api/stock/alerts', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error('Failed to fetch alerts');
        const res = await response.json();
        return res.data;
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const isLoading = isStockLoading || isAlertsLoading;

  const totalProduced = stockData.reduce((sum: number, s: any) => sum + s.produced, 0);
  const totalDispatched = stockData.reduce((sum: number, s: any) => sum + s.dispatched, 0);
  const totalStock = stockData.reduce((sum: number, s: any) => sum + s.currentStock, 0);

  const stages = [
    {
      label: "Total Produced",
      value: totalProduced.toLocaleString(),
      icon: Factory,
      gradient: "gradient-primary",
      pct: 100,
      barColor: "bg-primary",
      details: "Total production logs recorded"
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

  return (
    <MobileFormLayout title="📦 Stock">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Analyzing inventory...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center px-1">
             <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Live Inventory</h2>
             <button 
               onClick={refreshData}
               className="p-2 rounded-xl bg-secondary/50 text-muted-foreground hover:text-primary transition-colors"
             >
               <RefreshCw className="h-4 w-4" />
             </button>
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
                            <div className={`${textColor} mt-0.5`}>
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
                        <div key={data.brickType.id} className="bg-secondary/40 rounded-2xl p-4 text-center border border-transparent hover:border-primary/20 transition-all">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">{data.brickType.size}</p>
                            <p className="text-xl font-bold text-foreground">{data.currentStock.toLocaleString()}</p>
                        </div>
                        ))}
                    </div>
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
        </div>
      )}

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
    </MobileFormLayout>
  );
};

export default StockPage;

