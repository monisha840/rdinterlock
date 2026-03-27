import React from "react";
import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/api/reports.api";
import { EntryCard } from "./EntryCard";
import { KPICard } from "./KPICard";
import { 
  TrendingUp, 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownRight, 
  Users, 
  Truck,
  Loader2,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";

interface BIReportsDashboardProps {
  startDate: Date;
  endDate: Date;
}

export const BIReportsDashboard: React.FC<BIReportsDashboardProps> = ({ startDate, endDate }) => {
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ["reports-summary", format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")],
    queryFn: () => reportsApi.getSummary(format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd")).then(res => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Generating BI Insights...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-destructive card-modern border-destructive/20 bg-destructive/5">
        <AlertCircle className="h-10 w-10" />
        <p className="font-bold">Failed to load reports</p>
        <p className="text-xs opacity-70">Please check your connection and try again</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Financial Overview Cards */}
      <div className="grid grid-cols-1 gap-3">
        <div className="card-modern p-5 bg-gradient-to-br from-primary/10 to-background border-primary/20 relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 opacity-5">
            <TrendingUp className="h-32 w-32" />
          </div>
          <div className="flex justify-between items-center mb-4">
            <div className="h-10 w-10 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
              <TrendingUp className="h-6 w-6" />
            </div>
            <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-3 py-1 rounded-full">Net Profit</span>
          </div>
          <p className="text-4xl font-black text-foreground tracking-tighter">₹{summary.net_profit.toLocaleString()}</p>
          <div className="flex gap-4 mt-4">
             <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                <ArrowUpRight className="h-3 w-3" />
                <span>Income: ₹{summary.total_income.toLocaleString()}</span>
             </div>
             <div className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                <ArrowDownRight className="h-3 w-3" />
                <span>Expense: ₹{summary.total_expense.toLocaleString()}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KPICard 
          title="Sales Income" 
          value={`₹${summary.breakdown.sales_income.toLocaleString()}`} 
          icon={IndianRupee} 
          variant="primary" 
        />
        <KPICard 
          title="Transport Income" 
          value={`₹${summary.breakdown.transport_income.toLocaleString()}`} 
          icon={Truck} 
          variant="accent" 
        />
      </div>

      {/* 2. Expense Breakdown */}
      <EntryCard title="Expense Breakdown">
        <div className="space-y-1">
          {[
            { label: "Labour & Wages", value: summary.breakdown.labour_expense, color: "text-blue-600" },
            { label: "Materials", value: summary.breakdown.material_expense, color: "text-orange-600" },
            { label: "Transport Ops", value: summary.breakdown.transport_expense, color: "text-purple-600" },
            { label: "Other Expenses", value: summary.breakdown.other_expense, color: "text-gray-500" },
          ].map((item, i) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-border/50 last:border-0 hover:bg-secondary/20 px-2 rounded-lg transition-colors">
              <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
              <span className={`text-sm font-black ${item.color}`}>₹{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </EntryCard>

      {/* 3. Category-wise Analysis */}
      <EntryCard title="Top Expense Categories">
        <div className="space-y-4 pt-2">
          {summary.category_expenses.length > 0 ? (
            summary.category_expenses.slice(0, 10).map((cat: any, i: number) => {
              const percentage = (cat.value / summary.total_expense) * 100;
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between items-end">
                    <span className="text-xs font-bold text-foreground capitalize">{cat.name}</span>
                    <span className="text-xs font-black text-muted-foreground">₹{cat.value.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/60 rounded-full transition-all duration-500" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">No categorized expenses in this range</p>
          )}
        </div>
      </EntryCard>

      {/* 4. Staff Payment Summary */}
      <div className="card-modern p-5 bg-gradient-to-br from-blue-50 to-background border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 rounded-xl bg-blue-500 text-white flex items-center justify-center">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="font-black text-sm uppercase tracking-wider">Staff Payment Status</h3>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-xl bg-background border border-blue-50 shadow-sm">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Salary</p>
            <p className="text-sm font-black">₹{summary.salary_summary.total_salary.toLocaleString()}</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-background border border-blue-50 shadow-sm">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Paid</p>
            <p className="text-sm font-black text-green-600">₹{summary.salary_summary.total_paid.toLocaleString()}</p>
          </div>
          <div className="text-center p-2 rounded-xl bg-background border border-blue-50 shadow-sm">
            <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Pending</p>
            <p className="text-sm font-black text-red-600">₹{summary.salary_summary.pending.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* 5. Transport Profitability */}
      <div className="card-modern p-5 border-purple-100 bg-gradient-to-br from-purple-50 to-background">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
             <div className="h-8 w-8 rounded-xl bg-purple-500 text-white flex items-center justify-center">
               <Truck className="h-5 w-5" />
             </div>
             <h3 className="font-black text-sm uppercase tracking-wider">Transport Business</h3>
          </div>
          <span className="text-[10px] font-black text-purple-600 bg-purple-100 px-2 py-1 rounded-md">{summary.transport_summary.total_loads} Loads</span>
        </div>
        <div className="flex justify-between items-center bg-background/50 p-3 rounded-2xl border border-purple-50">
          <div className="text-center">
             <p className="text-[10px] font-bold text-muted-foreground mb-0.5 uppercase">Income</p>
             <p className="text-sm font-black">₹{summary.transport_summary.total_income.toLocaleString()}</p>
          </div>
          <div className="h-8 w-[1px] bg-purple-100" />
          <div className="text-center">
             <p className="text-[10px] font-bold text-muted-foreground mb-0.5 uppercase">Expense</p>
             <p className="text-sm font-black">₹{summary.transport_summary.total_expense.toLocaleString()}</p>
          </div>
          <div className="h-8 w-[1px] bg-purple-100" />
          <div className="text-center">
             <p className="text-[10px] font-bold text-muted-foreground mb-0.5 uppercase">Profit</p>
             <p className="text-sm font-black text-purple-600">₹{summary.transport_summary.profit.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
