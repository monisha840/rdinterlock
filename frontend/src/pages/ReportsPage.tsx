import { MobileFormLayout } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { KPICard } from "@/components/KPICard";
import { ActionButton } from "@/components/ActionButton";
import { DatePickerField } from "@/components/DatePickerField";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Factory,
  Truck,
  Wallet,
  TrendingUp,
  Download,
  FileText,
  Calendar,
  Loader2,
  AlertCircle,
  Hammer,
  IndianRupee,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settlementsApi } from "@/api/settlements.api";
import { format, startOfWeek, endOfWeek } from "date-fns";
import apiClient from "@/api/apiClient";
import { workersApi } from "@/api/workers.api";
import { reportsApi } from "@/api/reports.api";
import { User, Receipt, CreditCard, TrendingDown } from "lucide-react";
import { GlobalDateFilter, DateRange } from "@/components/GlobalDateFilter";
import { BIReportsDashboard } from "@/components/BIReportsDashboard";
import { SalaryPaymentModal } from "@/components/SalaryPaymentModal";

// ─── Worker report type ───────────────────────────────────────────────────────
interface WorkerWageRecord {
  workerId: string;
  workerName: string;
  role: string;
  paymentType: string;
  rate: number;
  dayBricks: number;
  nightBricks: number;
  totalBricks: number;
  grossWage: number;
  advanceBalance: number;
  totalPaid?: number;
  pendingAmount?: number;
  daysPresent: number;
  advanceDetails?: { id: string; amount: number; date: string; paymentMode: string }[];
}

const TABS = ["Dashboard", "Operations", "Staff Salaries", "Worker Wages", "Logs"];

const ReportsPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("Dashboard");

  // ── Global Date Filter state ─────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(1)), // Start of current month
    to: new Date(),
    label: "This Month"
  });

  const handleRangeChange = (range: DateRange) => {
    setDateRange(range);
  };

  // ── Payment Modal state ───────────────────────────────────────────────────
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const handleOpenPayment = (worker: any, netPayable: number, type: string) => {
    setSelectedWorker({ 
      id: worker.workerId || worker.id, 
      name: worker.workerName || worker.name, 
      role: worker.role, 
      netPayable,
      paymentType: type
    });
    setIsPaymentModalOpen(true);
  };

  // ── Operations tab state (now using global range) ─────────────────────────
  const { data: operationsSummary } = useQuery({
    queryKey: ["ops-summary", format(dateRange.from, "yyyy-MM-dd"), format(dateRange.to, "yyyy-MM-dd")],
    queryFn: () => reportsApi.getFinancialReport(format(dateRange.from, "yyyy-MM-dd"), format(dateRange.to, "yyyy-MM-dd")),
    enabled: activeTab === "Operations",
  });

  // ── Staff Salary tab state ────────────────────────────────────────────────
  const { data: salaryReport, isLoading: isSalaryLoading, error: salaryError, refetch: refetchSalary } = useQuery({
    queryKey: ["salary-report", dateRange.from.getMonth() + 1, dateRange.from.getFullYear()],
    queryFn: () => settlementsApi.calculateMonthly(dateRange.from.getMonth() + 1, dateRange.from.getFullYear()),
    enabled: activeTab === "Staff Salaries",
  });
  const saveSalariesMutation = useMutation({
    mutationFn: () => settlementsApi.saveMonthly(dateRange.from.getMonth() + 1, dateRange.from.getFullYear()),
    onSuccess: () => { toast.success("✅ Monthly salaries saved"); queryClient.invalidateQueries({ queryKey: ["salary-report"] }); },
    onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
  });

  // ── Worker Wages tab state ────────────────────────────────────────────────
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  // ── Worker Wages tab state ────────────────────────────────────────────────
  const { data: workerWages, isLoading: isWageLoading, error: wageError, refetch: refetchWages } = useQuery<WorkerWageRecord[]>({
    queryKey: ["worker-wages", format(dateRange.from, "yyyy-MM-dd"), format(dateRange.to, "yyyy-MM-dd")],
    queryFn: async () => {
      const res = await apiClient.get(
        `/wages/worker-report?startDate=${format(dateRange.from, "yyyy-MM-dd")}&endDate=${format(dateRange.to, "yyyy-MM-dd")}`
      );
      return res.data as WorkerWageRecord[];
    },
    enabled: activeTab === "Worker Wages",
  });

  const roleColor: Record<string, string> = {
    DRIVER: "success",
    MANAGER: "destructive",
    TELECALLER: "primary",
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <MobileFormLayout title="📈 Reports">
      {/* Tabs */}
      <div className="flex p-1 bg-secondary/50 rounded-2xl mb-4 gap-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === tab
              ? "bg-background text-primary shadow-sm"
              : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Global Date Filter */}
      <GlobalDateFilter onRangeChange={handleRangeChange} currentLabel={dateRange.label} />

      {dateRange.label === "Custom" && (
        <div className="grid grid-cols-2 gap-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <DatePickerField 
            date={dateRange.from} 
            onDateChange={(d) => setDateRange(prev => ({ ...prev, from: d }))} 
            label="From" 
          />
          <DatePickerField 
            date={dateRange.to} 
            onDateChange={(d) => setDateRange(prev => ({ ...prev, to: d }))} 
            label="To" 
          />
        </div>
      )}

      {/* ══════════════════════ DASHBOARD TAB ══════════════════════ */}
      {activeTab === "Dashboard" && (
        <BIReportsDashboard startDate={dateRange.from} endDate={dateRange.to} />
      )}

      {/* ══════════════════════ OPERATIONS TAB ══════════════════════ */}
      {activeTab === "Operations" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <KPICard title="Total Production" value="1,85,000" icon={Factory} variant="primary" />
            <KPICard title="Total Dispatch" value="1,62,000" icon={Truck} variant="accent" />
            <KPICard title="Total Expense" value={`₹${(operationsSummary?.expenses || 0).toLocaleString()}`} icon={Wallet} variant="warning" />
            <KPICard title="Est. Profit" value={`₹${(operationsSummary?.profit || 0).toLocaleString()}`} icon={TrendingUp} variant="success" />
          </div>

          <EntryCard title="Summary">
            <div className="space-y-0">
              {[
                { label: "Production (6 inch)", value: "1,20,000" },
                { label: "Production (8 inch)", value: "65,000" },
                { label: "Dispatched", value: "1,62,000" },
                { label: "Revenue Collected", value: "₹8,10,000" },
                { label: "Pending Payments", value: "₹32,000" },
                { label: "Worker Payments", value: "₹1,85,000" },
                { label: "Fuel Costs", value: "₹42,000" },
                { label: "Material Costs", value: "₹1,50,000" },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  <span className="text-sm font-bold text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </EntryCard>
        </>
      )}

      {/* ══════════════════ STAFF SALARIES TAB ══════════════════ */}
      {activeTab === "Staff Salaries" && (
        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-2xl p-4 mb-4">
            <p className="text-xs text-muted-foreground font-medium text-center">
              Salary Month: <span className="font-bold text-foreground">{format(dateRange.from, "MMMM yyyy")}</span>
            </p>
            <ActionButton
              label="Recalculate"
              icon={TrendingUp}
              variant="primary"
              size="sm"
              onClick={() => refetchSalary()}
              className="w-full mt-3"
            />
            <p className="text-[10px] text-muted-foreground mt-2 italic text-center">
              * Calculated from attendance records for Manager, Driver, Telecaller
            </p>
          </div>

          {isSalaryLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 card-modern">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Calculating staff salaries...</p>
            </div>
          ) : salaryError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 card-modern border-destructive/20 bg-destructive/5 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-medium">Failed to calculate salaries</p>
            </div>
          ) : salaryReport?.salaries?.length ? (
            <>
              <div className="space-y-3">
                {salaryReport.salaries.map((s: any) => (
                  <div key={s.workerId} className="card-modern p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-base">{s.workerName}</h3>
                        <StatusBadge label={s.role} variant={(roleColor[s.role] as any) || "default"} />
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase font-black tracking-tight">Pending Balance</p>
                        <p className="text-lg font-black text-primary">₹{(s.pendingAmount || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[11px] border-t border-border/50 pt-3 mb-4">
                      <div className="flex flex-col items-center p-2 bg-secondary/30 rounded-xl">
                        <span className="text-muted-foreground font-bold uppercase text-[9px]">Gross</span>
                        <span className="font-black">₹{s.salary.toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-secondary/30 rounded-xl">
                        <span className="text-muted-foreground font-bold uppercase text-[9px]">Advances</span>
                        <span className="font-black text-destructive">-₹{s.advanceUsed?.toLocaleString() ?? 0}</span>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-success/10 rounded-xl border border-success/20">
                        <span className="text-success font-bold uppercase text-[9px]">Paid</span>
                        <span className="font-black text-success">₹{(s.totalPaid || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <ActionButton 
                        label="Pay Salary" 
                        icon={IndianRupee} 
                        variant="primary" 
                        size="sm" 
                        className="flex-1 h-10 shadow-sm"
                        onClick={() => handleOpenPayment(s, s.pendingAmount, 'SALARY')}
                      />
                    </div>

                    {/* Meta stats */}
                    <div className="grid grid-cols-2 gap-y-2 text-[10px] items-center mt-3 pt-3 border-t border-border/20 uppercase font-bold text-muted-foreground">
                      <div className="flex justify-between pr-4 border-r border-border/30">
                        <span>Days Worked:</span>
                        <span className="text-foreground font-black">{s.presentDays}</span>
                      </div>
                      <div className="flex justify-between pl-4">
                        <span>Daily Rate:</span>
                        <span className="text-foreground font-black">₹{s.dailyRate}</span>
                      </div>
                    </div>
                    {/* Advance Breakdown */}
                    {s.advanceDetails && s.advanceDetails.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-dashed border-border/50">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Advance Details</p>
                        <div className="space-y-1.5">
                          {s.advanceDetails.map((adv: any) => (
                            <div key={adv.id} className="flex justify-between items-center text-xs bg-secondary/30 p-1.5 rounded-lg">
                              <span className="text-muted-foreground">{format(new Date(adv.date), 'dd MMM yyyy')} • {adv.paymentMode}</span>
                              <span className="font-bold text-destructive">₹{adv.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <ActionButton
                label={saveSalariesMutation.isPending ? "Saving..." : "Save & Generate Settlements"}
                icon={saveSalariesMutation.isPending ? Loader2 : FileText}
                variant="success"
                size="lg"
                onClick={() => saveSalariesMutation.mutate()}
                className="w-full shadow-lg"
                disabled={saveSalariesMutation.isPending}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3 card-modern text-muted-foreground italic">
              <Calendar className="h-8 w-8 opacity-20" />
              <p className="text-sm">No staff found for this period.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════ WORKER WAGES TAB ══════════════════ */}
      {activeTab === "Worker Wages" && (
        <div className="space-y-4">
          <div className="bg-secondary/50 rounded-2xl p-4 mb-4">
            <p className="text-xs text-muted-foreground font-medium text-center">
              Wages for period: <span className="font-bold text-foreground">{format(dateRange.from, "dd MMM")}</span> to <span className="font-bold text-foreground">{format(dateRange.to, "dd MMM yyyy")}</span>
            </p>
            <ActionButton
              label="Recalculate"
              icon={TrendingUp}
              variant="primary"
              size="sm"
              onClick={() => refetchWages()}
              className="w-full mt-3"
            />
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              * Based on brick output from Daily Entry. Day shift: ₹2.50/brick · Night: ₹3.00/brick · Mason: ₹9.00/brick
            </p>
          </div>

          {isWageLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 card-modern">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Calculating worker wages...</p>
            </div>
          ) : wageError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 card-modern border-destructive/20 bg-destructive/5 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm font-medium">Failed to load worker wages</p>
            </div>
          ) : workerWages && workerWages.length > 0 ? (
            <>
              {/* Summary strip */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Total Gross", value: `₹${workerWages.reduce((s, w) => s + w.grossWage, 0).toLocaleString()}` },
                  { label: "Advance Due", value: `₹${workerWages.reduce((s, w) => s + w.advanceBalance, 0).toLocaleString()}` },
                  { label: "Net Payable", value: `₹${workerWages.reduce((s, w) => s + Math.max(0, w.grossWage - w.advanceBalance), 0).toLocaleString()}` },
                ].map(k => (
                  <div key={k.label} className="p-3 rounded-xl bg-secondary/50 text-center">
                    <p className="text-[10px] text-muted-foreground">{k.label}</p>
                    <p className="text-sm font-black text-foreground">{k.value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {workerWages.map(w => {
                  const isMason = w.role === "MASON";
                  const netPayable = Math.max(0, w.grossWage - w.advanceBalance);
                  return (
                    <div key={w.workerId} className="card-modern p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-white text-sm ${isMason ? "bg-purple-500" : "bg-blue-500"}`}>
                            {w.workerName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-sm">{w.workerName}</p>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${isMason ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                              {w.role}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight">Pending Balance</p>
                          <p className="text-lg font-black text-primary">₹{(w.pendingAmount || 0).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-[10px] border-t border-border/50 pt-3 mb-4">
                        <div className="flex flex-col items-center p-2 bg-secondary/30 rounded-xl">
                          <span className="text-muted-foreground font-bold uppercase text-[8px]">Gross</span>
                          <span className="font-black">₹{w.grossWage.toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-secondary/30 rounded-xl">
                          <span className="text-muted-foreground font-bold uppercase text-[8px]">Advances</span>
                          <span className="font-black text-destructive">-₹{w.advanceBalance?.toLocaleString() ?? 0}</span>
                        </div>
                        <div className="flex flex-col items-center p-2 bg-success/10 rounded-xl border border-success/20">
                          <span className="text-success font-bold uppercase text-[8px]">Paid</span>
                          <span className="font-black text-success">₹{(w.totalPaid || 0).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <ActionButton 
                          label="Pay Wage" 
                          icon={IndianRupee} 
                          variant="primary" 
                          size="sm" 
                          className="flex-1 h-10 shadow-sm"
                          onClick={() => handleOpenPayment(w, w.pendingAmount, 'WAGE')}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-2 text-[10px] border-t border-border/50 pt-3 mt-3 font-bold uppercase text-muted-foreground">
                        {isMason ? (
                          <>
                            <div className="flex justify-between pr-4 border-r border-border/30">
                              <span className="text-muted-foreground">Total Bricks:</span>
                              <span className="font-bold">{w.totalBricks.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between pl-4">
                              <span className="text-muted-foreground">Rate:</span>
                              <span className="font-bold">₹9/brick</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between pr-4 border-r border-border/30">
                              <span className="text-muted-foreground">Day Bricks:</span>
                              <span className="font-bold">{w.dayBricks.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between pl-4">
                              <span className="text-muted-foreground">Night Bricks:</span>
                              <span className="font-bold">{w.nightBricks.toLocaleString()}</span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between pr-4 border-r border-border/30">
                          <span className="text-muted-foreground">Gross Wage:</span>
                          <span className="font-bold">₹{w.grossWage.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between pl-4">
                          <span className="text-muted-foreground text-destructive">Total Adv:</span>
                          <span className="font-bold text-destructive">-₹{w.advanceBalance.toLocaleString()}</span>
                        </div>
                        {!isMason && (
                          <div className="flex justify-between col-span-2 pt-1 border-t border-border/30 mt-1">
                            <span className="text-muted-foreground">Days Present:</span>
                            <span className="font-bold">{w.daysPresent}</span>
                          </div>
                        )}
                      </div>

                      {/* Advance Breakdown */}
                      {w.advanceDetails && w.advanceDetails.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-dashed border-border/50">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Advance Details</p>
                          <div className="space-y-1.5">
                            {w.advanceDetails.map((adv) => (
                              <div key={adv.id} className="flex justify-between items-center text-xs bg-secondary/30 p-1.5 rounded-lg">
                                <span className="text-muted-foreground">{format(new Date(adv.date), 'dd MMM yyyy')} • {adv.paymentMode}</span>
                                <span className="font-bold text-destructive">₹{adv.amount.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : workerWages ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 card-modern text-muted-foreground italic">
              <Hammer className="h-8 w-8 opacity-20" />
              <p className="text-sm">No worker production data found for this period.</p>
              <p className="text-[11px] text-center">Enter production via Daily Entry, then check this report.</p>
            </div>
          ) : null}
        </div>
      )}

      {/* ══════════════════════ LOGS TAB ══════════════════════ */}
      {activeTab === "Logs" && <LogsTabContent globalDateRange={dateRange} />}

      {/* Export buttons */}
      <div className="grid grid-cols-2 gap-3 mt-2">
        <ActionButton
          label="Export PDF"
          icon={FileText}
          variant="primary"
          size="lg"
          onClick={() => toast.info("PDF export coming soon")}
          className="w-full"
        />
        <ActionButton
          label="Export Excel"
          icon={Download}
          variant="accent"
          size="lg"
          onClick={() => toast.info("Excel export coming soon")}
          className="w-full"
        />
      </div>
      {selectedWorker && (
        <SalaryPaymentModal 
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          worker={selectedWorker}
          onSuccess={() => {
            if (activeTab === "Staff Salaries") refetchSalary();
            if (activeTab === "Worker Wages") refetchWages();
          }}
        />
      )}
    </MobileFormLayout>
  );
};

const LogsTabContent = ({ globalDateRange }: { globalDateRange: DateRange }) => {
  const [personId, setPersonId] = useState<string>("");
  const [logType, setLogType] = useState("All");

  const dateRange = globalDateRange;

  const { data: people } = useQuery({
    queryKey: ["all-workers-for-logs"],
    queryFn: () => workersApi.getAll(true),
    enabled: true,
  });

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["person-logs", personId, format(dateRange.from, "yyyy-MM-dd"), format(dateRange.to, "yyyy-MM-dd")],
    queryFn: async () => {
      return reportsApi.getPersonLogs(personId, format(dateRange.from, "yyyy-MM-dd"), format(dateRange.to, "yyyy-MM-dd"));
    },
    enabled: !!personId,
  });

  const filteredLogs = logsData?.logs?.filter((l: any) => {
    if (logType === "All") return true;
    if (logType === "Payments") return l.type === "payment";
    if (logType === "Expenses") return l.type === "expense";
    return l.type === logType.toLowerCase().replace(/s$/, "");
  }) || [];

  // Group by date
  const groupedLogs = filteredLogs.reduce((acc: any, log: any) => {
    const dateStr = format(new Date(log.date), "dd MMM yyyy");
    if (!acc[dateStr]) acc[dateStr] = [];
    acc[dateStr].push(log);
    return acc;
  }, {});

  const typeIcons: any = {
    attendance: Calendar,
    payment: CreditCard,
    transport: Truck,
    sales: TrendingUp,
    expense: Receipt,
    production: Hammer
  };

  const typeColors: any = {
    attendance: "text-blue-500 bg-blue-50",
    payment: "text-green-500 bg-green-50",
    transport: "text-amber-500 bg-amber-50",
    sales: "text-purple-500 bg-purple-50",
    expense: "text-red-500 bg-red-50",
    production: "text-orange-500 bg-orange-50"
  };

  return (
    <div className="space-y-4">
      {/* Dropdown & Filters */}
      <EntryCard title="Activity Timeline">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5 block">Select Staff or Worker</label>
            <div className="relative">
              <select 
                value={personId} 
                onChange={(e) => setPersonId(e.target.value)}
                className="w-full h-12 bg-secondary/50 border-none rounded-xl px-4 pr-10 text-sm font-semibold focus:ring-2 ring-primary/20 appearance-none text-foreground"
              >
                <option value="">Choose a person...</option>
                {people?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                <User className="h-4 w-4" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {["All", "Attendance", "Production", "Payments", "Transport", "Sales", "Expenses"].map(t => (
              <button
                key={t}
                onClick={() => setLogType(t)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-[11px] font-bold transition-all active:scale-95 ${logType === t 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "bg-secondary/70 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="bg-primary/5 p-3 rounded-xl border border-primary/10">
            <p className="text-[10px] text-primary font-black uppercase tracking-wider mb-1">Active Range</p>
            <p className="text-xs font-bold">{format(dateRange.from, "dd MMM yyyy")} - {format(dateRange.to, "dd MMM yyyy")}</p>
          </div>
        </div>
      </EntryCard>

      {!personId ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 card-modern text-muted-foreground italic bg-secondary/5 border-dashed border-2">
          <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center mb-2">
            <User className="h-8 w-8 opacity-20" />
          </div>
          <p className="text-sm font-medium">Select a person to view their activity</p>
          <p className="text-[10px] opacity-60">Full timeline of work, payments and sales</p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 card-modern">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Gathering activity records...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-modern p-4 bg-gradient-to-br from-green-50 to-background border-green-100">
              <p className="text-[10px] font-black text-green-600 uppercase mb-1">Total Earned</p>
              <p className="text-xl font-black text-foreground">₹{logsData?.summary?.totalEarned?.toLocaleString() || 0}</p>
            </div>
            <div className="card-modern p-4 bg-gradient-to-br from-blue-50 to-background border-blue-100">
              <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Total Paid</p>
              <p className="text-xl font-black text-foreground">₹{logsData?.summary?.totalPaid?.toLocaleString() || 0}</p>
            </div>
            <div className="card-modern p-4 bg-gradient-to-br from-amber-50 to-background border-amber-100">
              <p className="text-[10px] font-black text-amber-600 uppercase mb-1">Pending Balance</p>
              <p className="text-xl font-black text-foreground">₹{logsData?.summary?.pendingAmount?.toLocaleString() || 0}</p>
            </div>
            <div className="card-modern p-4 bg-gradient-to-br from-purple-50 to-background border-purple-100">
              <p className="text-[10px] font-black text-purple-600 uppercase mb-1">Total Loads</p>
              <p className="text-xl font-black text-foreground">{logsData?.summary?.totalLoads || 0}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gradient-to-b before:from-primary before:to-primary/10">
            {Object.keys(groupedLogs).length > 0 ? (
              Object.entries(groupedLogs).map(([date, items]: [string, any]) => (
                <div key={date} className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-[22px] w-[22px] rounded-full bg-background border-[3px] border-primary z-10 -ml-[23px] shadow-sm" />
                    <h4 className="text-[11px] font-black uppercase text-primary tracking-wider">{date}</h4>
                  </div>
                  <div className="space-y-4">
                    {items.map((log: any) => {
                      const Icon = typeIcons[log.type] || FileText;
                      const isFinancial = log.type === 'payment' || log.type === 'expense';
                      return (
                        <div key={log.id} className="card-modern p-4 flex gap-4 items-center active:scale-[0.98] transition-all border-l-4 border-l-transparent hover:border-l-primary/30">
                          <div className={`h-12 w-12 min-w-[48px] rounded-2xl flex items-center justify-center shadow-sm ${typeColors[log.type]}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-bold text-foreground leading-tight mb-0.5">{log.title}</p>
                              {log.amount !== null && (
                                <p className={`text-sm font-black whitespace-nowrap ml-2 ${isFinancial ? 'text-destructive' : 'text-primary'}`}>
                                  {isFinancial ? '-' : '+'}₹{log.amount.toLocaleString()}
                                </p>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1.5 mt-1 uppercase tracking-tight">
                              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                              {log.reference}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-3 card-modern text-muted-foreground italic ml-2 border-dashed">
                <AlertCircle className="h-8 w-8 opacity-20" />
                <p className="text-sm font-semibold">No activity records found</p>
                <p className="text-[10px]">Try changing the filters or date range</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsPage;
