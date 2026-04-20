import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addMonths,
  endOfMonth,
  format,
  isFuture,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, TrendingDown } from "lucide-react";
import { cashApi } from "@/api/cash.api";

export const MonthlyExpenseChart = () => {
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));

  const from = startOfMonth(anchor);
  const to = endOfMonth(anchor);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: [
      "cash-entries-expense-chart",
      format(from, "yyyy-MM-dd"),
      format(to, "yyyy-MM-dd"),
    ],
    queryFn: () =>
      cashApi.getAll({
        startDate: format(from, "yyyy-MM-dd"),
        endDate: format(to, "yyyy-MM-dd"),
        type: "DEBIT",
      }),
  });

  // Bucket expenses by day of month. Empty days render as 0 so the chart
  // spans the whole month at a stable width.
  const chartData = useMemo(() => {
    const days = to.getDate();
    const buckets: Record<number, number> = {};
    for (let d = 1; d <= days; d++) buckets[d] = 0;
    (entries as any[]).forEach((e) => {
      const day = new Date(e.date).getDate();
      buckets[day] = (buckets[day] || 0) + (e.amount || 0);
    });
    return Array.from({ length: days }, (_, i) => ({
      day: String(i + 1).padStart(2, "0"),
      amount: buckets[i + 1] || 0,
    }));
  }, [entries, to]);

  const total = chartData.reduce((s, d) => s + d.amount, 0);
  const nextMonth = addMonths(anchor, 1);
  const canGoNext = !isFuture(startOfMonth(nextMonth));

  return (
    <div className="card-modern p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-destructive/10 flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">Monthly Expenses</h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              {format(anchor, "MMMM yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setAnchor((a) => subMonths(a, 1))}
            className="h-8 w-8 rounded-lg bg-secondary/60 hover:bg-secondary text-foreground flex items-center justify-center active:scale-90 transition-all"
            aria-label="Previous month"
            title="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => canGoNext && setAnchor((a) => addMonths(a, 1))}
            disabled={!canGoNext}
            className="h-8 w-8 rounded-lg bg-secondary/60 hover:bg-secondary text-foreground flex items-center justify-center active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next month"
            title={canGoNext ? "Next month" : "No future data"}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between mb-2 gap-3">
        <p className="text-2xl font-black text-foreground">
          ₹{total.toLocaleString()}
        </p>
        <p className="text-[10px] text-muted-foreground font-semibold">
          {(entries as any[]).length} entries
        </p>
      </div>

      <div className="h-40">
        {isLoading ? (
          <div className="h-full w-full bg-secondary/20 rounded-xl animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(215 16% 47% / 0.15)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "hsl(215 16% 47%)" }}
                axisLine={false}
                tickLine={false}
                interval={Math.ceil(chartData.length / 8)}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "hsl(0 84% 60% / 0.08)" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid hsl(215 16% 47% / 0.2)",
                  fontSize: 12,
                }}
                formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "Spent"]}
                labelFormatter={(day) => `${format(anchor, "MMM")} ${day}`}
              />
              <Bar dataKey="amount" fill="hsl(0 84% 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
