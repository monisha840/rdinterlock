import { useState } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { KPICard } from "@/components/KPICard";
import { toast } from "sonner";
import { Hammer, Loader2, MapPin, IndianRupee, Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/apiClient";
import { format } from "date-fns";

const MasonLedgerPage = () => {
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");

  const { data: ledger = [], isLoading } = useQuery<any[]>({
    queryKey: ["mason-ledger", startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get(`/reports/mason-ledger?startDate=${startDate}&endDate=${endDate}`);
      return (res as any).data;
    },
  });

  const filtered = (ledger || []).filter((e: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.masonName?.toLowerCase().includes(q) ||
      e.siteName?.toLowerCase().includes(q) ||
      e.brickType?.toLowerCase().includes(q)
    );
  });

  const totalBricks = filtered.reduce((s: number, e: any) => s + (e.bricks || 0), 0);
  const totalEarnings = filtered.reduce((s: number, e: any) => s + (e.totalAmount || 0), 0);
  const uniqueSites = new Set(filtered.map((e: any) => e.siteName).filter(Boolean)).size;

  return (
    <MobileFormLayout title="Mason Ledger" subtitle="Site-wise mason work tracking">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
        <KPICard title="Total Bricks" value={totalBricks.toLocaleString()} icon={Hammer} variant="primary" />
        <KPICard title="Total Earned" value={`₹${totalEarnings.toLocaleString()}`} icon={IndianRupee} variant="success" />
        <KPICard title="Sites" value={String(uniqueSites)} icon={MapPin} variant="accent" />
      </div>

      {/* Date Filters */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">From</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-10 px-3 bg-card border border-border rounded-xl text-xs focus:border-primary outline-none" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">To</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-10 px-3 bg-card border border-border rounded-xl text-xs focus:border-primary outline-none" />
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search mason, site, brick type..."
          className="w-full h-11 pl-10 pr-10 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Ledger Entries */}
      <EntryCard title="Mason Work Entries">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Hammer className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground italic">No mason work entries found</p>
            <p className="text-[11px] text-muted-foreground mt-1">Add production entries with mason workers to see data here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e: any) => (
              <div key={e.id} className="p-4 bg-secondary/30 rounded-2xl border border-border/50 hover:border-primary/20 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {e.masonName?.[0] || "M"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] sm:text-sm font-bold text-foreground truncate">{e.masonName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {e.siteName && e.siteName !== '-' ? (
                          <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{e.siteName}</span></span>
                        ) : (
                          <span>{e.machine}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[13px] sm:text-sm font-black text-primary">₹{(e.totalAmount || 0).toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">{format(new Date(e.date), "dd MMM yyyy")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 text-[11px] font-bold text-muted-foreground pt-3 border-t border-border/30">
                  <div className="text-center">
                    <p className="uppercase text-[9px] mb-0.5">Type</p>
                    <p className="text-foreground text-[12px]">{e.brickType}</p>
                  </div>
                  <div className="text-center">
                    <p className="uppercase text-[9px] mb-0.5">Bricks</p>
                    <p className="text-foreground text-[12px]">{(e.bricks || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="uppercase text-[9px] mb-0.5">Rate</p>
                    <p className="text-foreground text-[12px]">₹{e.ratePerBrick}</p>
                  </div>
                  <div className="text-center">
                    <p className="uppercase text-[9px] mb-0.5">Advance</p>
                    <p className={`text-[12px] ${e.advanceBalance > 0 ? "text-amber-600" : "text-foreground"}`}>₹{(e.advanceBalance || 0).toLocaleString()}</p>
                  </div>
                </div>
                {/* Material Consumption */}
                {(e.powder > 0 || e.cement > 0 || e.flyAsh > 0) && (
                  <div className="grid grid-cols-3 gap-3 text-[11px] font-bold text-muted-foreground pt-3 mt-2 border-t border-border/20">
                    <div className="text-center">
                      <p className="uppercase text-[9px] mb-0.5">Powder</p>
                      <p className="text-foreground text-[12px]">{e.powder > 0 ? `${e.powder} units` : '-'}</p>
                    </div>
                    <div className="text-center">
                      <p className="uppercase text-[9px] mb-0.5">Cement</p>
                      <p className="text-foreground text-[12px]">{e.cement > 0 ? `${e.cement} units` : '-'}</p>
                    </div>
                    <div className="text-center">
                      <p className="uppercase text-[9px] mb-0.5">Fly Ash</p>
                      <p className="text-foreground text-[12px]">{e.flyAsh > 0 ? `${e.flyAsh} units` : '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20 mt-2">
              <span className="text-sm font-bold text-foreground">Total ({filtered.length} entries)</span>
              <span className="text-lg font-bold text-primary">₹{totalEarnings.toLocaleString()}</span>
            </div>
          </div>
        )}
      </EntryCard>
    </MobileFormLayout>
  );
};

export default MasonLedgerPage;
