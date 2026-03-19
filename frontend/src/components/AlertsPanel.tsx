import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsApi, Alert } from "@/api/alerts.api";
import { AlertCircle, X } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

export const AlertsPanel = () => {
  const queryClient = useQueryClient();
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['active-alerts'],
    queryFn: alertsApi.getAlerts,
    refetchInterval: 60000, // Refresh every minute
  });

  const readMutation = useMutation({
    mutationFn: alertsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-alerts"] });
    }
  });

  const readAllMutation = useMutation({
    mutationFn: alertsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-alerts"] });
      toast.success("All alerts cleared");
    }
  });

  const prevCount = useRef(0);
  useEffect(() => {
    if (alerts && alerts.length > prevCount.current && prevCount.current !== 0) {
      toast.error("New Smart Alert Generated!", {
        description: "Check the Smart Alerts panel for details."
      });
    }
    if (alerts) {
      prevCount.current = alerts.length;
    }
  }, [alerts]);

  // Removed early return null to ensure panel always renders
  // if (isLoading || !alerts || alerts.length === 0) return null;
  
  if (isLoading) {
    return (
      <div className="card-modern p-4 border-primary/20 bg-primary/5 flex items-center justify-center">
        <p className="text-sm text-primary">Loading alerts...</p>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="card-modern p-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">
            Smart Alerts
          </h2>
        </div>
        <p className="text-xs text-muted-foreground">No active alerts at the moment.</p>
      </div>
    );
  }

  return (
    <div className="card-modern p-4 border-primary/20 bg-primary/5 space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-primary" />
          <h2 className="font-bold text-foreground text-sm uppercase tracking-wide">
            Smart Alerts
          </h2>
          <span className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">
            {alerts.length}
          </span>
        </div>
        <button
          onClick={() => readAllMutation.mutate()}
          className="text-[10px] font-bold text-primary hover:underline uppercase"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {alerts.map((alert: Alert) => (
          <div
            key={alert.id}
            className={`p-3 rounded-xl border flex items-start gap-3 transition-all hover:scale-[1.01] ${
              alert.severity === 'high'
                ? "border-destructive/30 bg-destructive/10 shadow-sm"
                : alert.severity === 'medium'
                  ? "border-warning/30 bg-warning/5"
                  : "border-primary/20 bg-primary/5"
            }`}
          >
            <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
              alert.severity === 'high' ? "bg-destructive animate-pulse" : alert.severity === 'medium' ? "bg-warning" : "bg-primary"
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-foreground leading-tight">
                {alert.message}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {format(new Date(alert.createdAt), "dd MMM, HH:mm")}
              </p>
            </div>
            <button
              onClick={() => readMutation.mutate(alert.id)}
              className="text-muted-foreground hover:text-foreground shrink-0 p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
