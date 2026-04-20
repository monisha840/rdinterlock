import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsApi, Alert } from "@/api/alerts.api";
import { AlertCircle, X, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Map alert types to their destination routes
const getAlertRoute = (alert: Alert): string => {
  switch (alert.type) {
    case 'stock': return '/reports';
    case 'material': return '/reports';
    case 'payment': return '/client-ledger';
    case 'salary': return '/reports';
    case 'dispatch' as any: return '/client-management';
    default: return '/';
  }
};

export const AlertsPanel = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['active-alerts'],
    queryFn: alertsApi.getAlerts,
    refetchInterval: 60000, // Refresh every minute
  });

  // Sort alerts: HIGH priority first, then MEDIUM, then LOW
  const sortedAlerts = alerts ? [...alerts].sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
  }) : [];

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
        {sortedAlerts.map((alert: Alert) => (
          <div
            key={alert.id}
            onClick={() => navigate(getAlertRoute(alert))}
            className={`p-3 rounded-xl border flex items-start gap-3 transition-all hover:scale-[1.01] cursor-pointer ${
              alert.severity === 'high'
                ? "border-red-500/40 bg-red-500/10 shadow-sm shadow-red-500/10"
                : alert.severity === 'medium'
                  ? "border-warning/30 bg-warning/5"
                  : "border-primary/20 bg-primary/5"
            }`}
          >
            <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
              alert.severity === 'high' ? "bg-red-500 animate-pulse" : alert.severity === 'medium' ? "bg-warning" : "bg-primary"
            }`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {alert.severity === 'high' && (
                  <span className="text-[9px] font-black text-red-600 bg-red-500/20 px-1.5 py-0.5 rounded uppercase">High</span>
                )}
                <p className={`text-xs font-bold leading-tight ${alert.severity === 'high' ? "text-red-700" : "text-foreground"}`}>
                  {alert.message}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {format(new Date(alert.createdAt), "dd MMM, HH:mm")}
              </p>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 mt-1" />
            <button
              onClick={(e) => { e.stopPropagation(); readMutation.mutate(alert.id); }}
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
