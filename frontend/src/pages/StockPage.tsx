import { useState } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { Factory, Package, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { stockApi } from "@/api/stock.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const StockPage = () => {
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  const { data: stockData = [], isLoading } = useQuery({
    queryKey: ['stock', 'current'],
    queryFn: () => stockApi.getCurrent(),
  });

  const totalProduced = stockData.reduce((sum, s) => sum + s.produced, 0);
  const totalDispatched = stockData.reduce((sum, s) => sum + s.dispatched, 0);
  const totalStock = stockData.reduce((sum, s) => sum + s.currentStock, 0);

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

  return (
    <MobileFormLayout title="📦 Stock">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Fetching inventory...</p>
        </div>
      ) : (
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
                <div className="text-right">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Status</p>
                  <p className="text-xs font-semibold text-foreground">Verified</p>
                </div>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ease-out ${s.barColor}`}
                  style={{ width: `${s.pct}%` }}
                />
              </div>
            </div>
          ))}

          <div className="card-modern p-5 mt-4">
            <h2 className="font-semibold text-foreground text-sm mb-3">Stock by Size</h2>
            <div className="grid grid-cols-2 gap-3">
              {stockData.map((data) => (
                <div key={data.brickType.id} className="bg-secondary/40 rounded-xl p-4 text-center">
                  <p className="text-xs text-muted-foreground">{data.brickType.size}</p>
                  <p className="text-xl font-bold text-foreground mt-1">{data.currentStock.toLocaleString()}</p>
                </div>
              ))}
              {stockData.length === 0 && (
                <p className="col-span-2 text-sm text-muted-foreground italic text-center py-4">
                  No stock data available
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
