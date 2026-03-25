import { KPICard } from "@/components/KPICard";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import {
  Factory,
  Package,
  Truck,
  Wallet,
  Receipt,
  Clock,
  TrendingUp,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/api/dashboard.api";
import { clientsApi } from "@/api/clients.api";
import { format, isToday, formatDistanceToNow } from "date-fns";
import { AlertsPanel } from "@/components/AlertsPanel";
import { RemindersPanel } from "@/components/RemindersPanel";
import { TodaysTasksPanel } from "@/components/TodaysTasksPanel";

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: upcomingDispatches, isLoading: isLoadingDispatches } = useQuery({
    queryKey: ['upcoming-dispatches'],
    queryFn: clientsApi.getUpcomingDispatches,
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <MobileFormLayout title="Dashboard">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileFormLayout>
    );
  }

  if (error) {
    return (
      <MobileFormLayout title="Dashboard">
        <div className="card-modern p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Failed to load dashboard data</p>
          <p className="text-xs text-muted-foreground mt-1">{(error as Error).message}</p>
        </div>
      </MobileFormLayout>
    );
  }

  // Calculate total ready stock
  const totalReadyStock = dashboardData?.readyStock?.reduce((sum: any, item: any) => sum + item.stock, 0) || 0;

  // Last 7 days production data for chart
  const productionChartData = dashboardData?.productionChart || [
    { day: "Mon", qty: 0 },
    { day: "Tue", qty: 0 },
    { day: "Wed", qty: 0 },
    { day: "Thu", qty: 0 },
    { day: "Fri", qty: 0 },
    { day: "Sat", qty: 0 },
    { day: "Sun", qty: 0 },
  ];

  return (
    <MobileFormLayout title="Dashboard">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KPICard
          title="Today Production"
          value={dashboardData?.todayProduction?.quantity > 0
            ? dashboardData.todayProduction.quantity.toLocaleString()
            : "No production today"}
          trend={dashboardData?.todayProduction?.latestTime 
            ? `Last: ${formatDistanceToNow(new Date(dashboardData.todayProduction.latestTime), { addSuffix: true })}`
            : undefined}
          icon={Factory}
          variant="primary"
          onClick={() => navigate("/daily-entry")}
        />
        <KPICard
          title="Ready Stock"
          value={totalReadyStock.toLocaleString()}
          icon={Package}
          variant="success"
          onClick={() => navigate("/stock")}
        />
        <KPICard
          title="Today Dispatch"
          value={dashboardData?.todayDispatch?.quantity?.toLocaleString() || '0'}
          icon={Truck}
          variant="accent"
          onClick={() => navigate("/dispatch")}
        />
        <KPICard
          title="Cash Balance"
          value={`₹${((dashboardData?.cashBalance || 0) / 100000).toFixed(1)}L`}
          icon={Wallet}
          onClick={() => navigate("/cash-book")}
        />
        <KPICard
          title="Expenses Today"
          value={`₹${((dashboardData?.todayExpenses?.amount || 0) / 1000).toFixed(1)}K`}
          icon={Receipt}
          variant="warning"
          onClick={() => navigate("/expenses")}
        />
        <KPICard
          title="Pending Payments"
          value={`₹${((dashboardData?.pendingPayments || 0) / 1000).toFixed(1)}K`}
          icon={Clock}
          onClick={() => navigate("/dispatch")}
        />
      </div>

      {/* 🔴 Phase 7: Smart Alerts (Automated) */}
      <AlertsPanel />

      {/* Latest Production Info - Only show if production exists today */}
      {dashboardData?.todayProduction?.quantity > 0 && dashboardData?.todayProduction?.latestTime && (
        <div
          onClick={() => navigate("/daily-entry")}
          className="card-modern-hover p-4 flex items-center gap-3 border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-top-2 duration-500"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center">
                <p className="text-sm font-bold text-foreground">Active Production</p>
                <span className="text-[10px] font-black bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase">Today</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Current output: <span className="font-bold text-foreground">{dashboardData.todayProduction.quantity.toLocaleString()}</span> • Last recorded {formatDistanceToNow(new Date(dashboardData.todayProduction.latestTime), { addSuffix: true })}
            </p>
          </div>
        </div>
      )}

      {/* Upcoming Dispatch Alert - HIGH PRIORITY */}
      {!isLoadingDispatches && upcomingDispatches && upcomingDispatches.length > 0 && (
        <div className="card-modern p-4 border-destructive/40 bg-destructive/10">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="h-5 w-5 text-destructive animate-pulse" />
            <h2 className="font-bold text-destructive text-sm uppercase tracking-wide">
              ⚠ Upcoming Dispatch
            </h2>
          </div>

          <div className="space-y-2">
            {upcomingDispatches.map((dispatch: any) => {
              const dispatchDate = new Date(dispatch.expectedDispatchDate);
              const isDueToday = isToday(dispatchDate);

              return (
                <div
                  key={dispatch.id}
                  className={`p-3 rounded-xl border ${isDueToday
                    ? "border-destructive/60 bg-destructive/20"
                    : "border-destructive/20 bg-background/50"
                    } flex flex-col justify-between items-start cursor-pointer hover:bg-destructive/20 transition-colors`}
                  onClick={() => navigate('/client-management')}
                >
                  <div className="w-full flex justify-between items-start mb-1">
                    <p className="font-bold text-foreground text-sm">{dispatch.client?.name}</p>
                    {isDueToday && (
                      <span className="text-[10px] bg-destructive text-destructive-foreground px-2 py-0.5 rounded-full font-bold animate-pulse uppercase">
                        Today Dispatch
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between w-full mt-1">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {dispatch.brickType?.size} – <span className="text-foreground">{(dispatch.quantity ?? 0).toLocaleString()} pcs</span>
                    </p>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-destructive">
                      <Clock className="h-3 w-3" />
                      <span>Dispatch: {format(dispatchDate, "dd MMM yyyy")}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card-modern p-5 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground text-sm">Production — Last 7 Days</h2>
        </div>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productionChartData}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(215 16% 47%)" }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="qty" fill="hsl(221, 83%, 53%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 📌 Phase 7: Manual Reminders / Tasks */}
      <TodaysTasksPanel />
      <RemindersPanel />

      <div className="card-modern p-5 animate-fade-in">
        <h2 className="font-semibold text-foreground text-sm mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 ? (
            dashboardData.recentActivity.map((item: any, i: number) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-0 last:pb-0">
                <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{item.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(item.time), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent activity</p>
          )}
        </div>
      </div>
    </MobileFormLayout>
  );
};

export default Dashboard;
