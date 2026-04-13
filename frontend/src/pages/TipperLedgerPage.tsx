import { useState } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { KPICard } from "@/components/KPICard";
import { Loader2, Truck, MapPin, IndianRupee, Search, X, Package, FileText, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/api/apiClient";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

const TipperLedgerPage = () => {
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");

  const { data: ledger = [], isLoading } = useQuery<any[]>({
    queryKey: ["tipper-ledger", startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get(`/reports/tipper-ledger?startDate=${startDate}&endDate=${endDate}`);
      return (res as any).data;
    },
  });

  const filtered = (ledger || []).filter((e: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.companyVendor?.toLowerCase().includes(q) ||
      e.vehicleNumber?.toLowerCase().includes(q) ||
      e.location?.toLowerCase().includes(q) ||
      e.brickType?.toLowerCase().includes(q)
    );
  });

  const totalLoads = filtered.reduce((s: number, e: any) => s + (e.tippedLoad || 0), 0);
  const totalQuantity = filtered.reduce((s: number, e: any) => s + (e.quantity || 0), 0);
  const totalAmount = filtered.reduce((s: number, e: any) => s + (e.totalAmount || 0), 0);

  const handleTipperPDF = () => {
    try {
      if (filtered.length === 0) { toast.error("No data to export"); return; }
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16); doc.text("RD Interlock - Tipper Ledger", 14, 15);
      doc.setFontSize(10); doc.text("Period: " + startDate + " to " + endDate, 14, 22);
      autoTable(doc, {
        head: [["Vendor", "Vehicle", "Date", "Brick Type", "Loads", "Qty", "Location", "Rate", "Amount"]],
        body: filtered.map((e: any) => [e.companyVendor || "-", e.vehicleNumber || "-", format(new Date(e.date), "dd-MM-yyyy"), e.brickType || "-", e.tippedLoad || 0, (e.quantity || 0).toLocaleString(), e.location || "-", "Rs." + (e.rate || 0), "Rs." + (e.totalAmount || 0).toLocaleString()]),
        startY: 28, styles: { fontSize: 7 }, headStyles: { fillColor: [59, 130, 246] },
      });
      doc.save("tipper-ledger-" + format(new Date(), "dd-MM-yyyy") + ".pdf");
      toast.success("PDF exported");
    } catch (err: any) { toast.error("Export failed", { description: err.message }); }
  };

  const handleTipperExcel = () => {
    try {
      if (filtered.length === 0) { toast.error("No data to export"); return; }
      const cols = ["Vendor", "Vehicle", "Date", "Brick Type", "Loads", "Qty", "Location", "Rate", "Amount"];
      const rows = filtered.map((e: any) => [e.companyVendor || "-", e.vehicleNumber || "-", format(new Date(e.date), "dd-MM-yyyy"), e.brickType || "-", e.tippedLoad || 0, e.quantity || 0, e.location || "-", e.rate || 0, e.totalAmount || 0]);
      const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Tipper Ledger");
      XLSX.writeFile(wb, "tipper-ledger-" + format(new Date(), "dd-MM-yyyy") + ".xlsx");
      toast.success("Excel exported");
    } catch (err: any) { toast.error("Export failed", { description: err.message }); }
  };

  return (
    <MobileFormLayout title="Tipper Ledger" subtitle="Track tipper vehicle loads & deliveries">
      {/* Export */}
      <div className="flex gap-2 mb-3">
        <button onClick={handleTipperPDF} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-secondary/50 border border-border text-[11px] font-bold hover:bg-secondary transition-all active:scale-[0.98]"><FileText className="h-3.5 w-3.5" /> PDF</button>
        <button onClick={handleTipperExcel} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-all active:scale-[0.98]"><Download className="h-3.5 w-3.5" /> Excel</button>
      </div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
        <KPICard title="Total Loads" value={totalLoads.toLocaleString()} icon={Truck} variant="primary" />
        <KPICard title="Total Bricks" value={totalQuantity.toLocaleString()} icon={Package} variant="accent" />
        <KPICard title="Total Amount" value={`₹${totalAmount.toLocaleString()}`} icon={IndianRupee} variant="success" />
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
          placeholder="Search vendor, vehicle, location..."
          className="w-full h-11 pl-10 pr-10 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Ledger Entries */}
      <EntryCard title="Tipper Entries">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground italic">No tipper entries found</p>
            <p className="text-[11px] text-muted-foreground mt-1">Add transport entries to see tipper data here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e: any) => (
              <div key={e.id} className="p-4 bg-secondary/30 rounded-2xl border border-border/50 hover:border-primary/20 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-blue-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {e.companyVendor?.[0] || "T"}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] sm:text-sm font-bold text-foreground truncate">{e.companyVendor}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Truck className="h-3 w-3 shrink-0" /><span className="truncate">{e.vehicleNumber}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[13px] sm:text-sm font-black text-primary">₹{(e.totalAmount || 0).toLocaleString()}</p>
                    <p className="text-[11px] text-muted-foreground">{format(new Date(e.date), "dd MMM yyyy")}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-[11px] font-bold text-muted-foreground pt-3 border-t border-border/30">
                  <div className="text-center">
                    <p className="uppercase text-[9px] mb-0.5">Type</p>
                    <p className="text-foreground text-[12px]">{e.brickType}</p>
                  </div>
                  <div className="text-center">
                    <p className="uppercase text-[9px] mb-0.5">Loads</p>
                    <p className="text-foreground text-[12px]">{e.tippedLoad}</p>
                  </div>
                  <div className="text-center">
                    <p className="uppercase text-[9px] mb-0.5">Qty</p>
                    <p className="text-foreground text-[12px]">{(e.quantity || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] font-bold text-muted-foreground pt-2 mt-2 border-t border-border/20">
                  <div className="text-center">
                    <p className="uppercase text-[9px] mb-0.5">Location</p>
                    <p className="text-foreground text-[12px] truncate">{e.location}</p>
                  </div>
                  <div className="text-center">
                    <p className="uppercase text-[9px] mb-0.5">Rate</p>
                    <p className="text-foreground text-[12px]">₹{e.rate}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Total */}
            <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20 mt-2">
              <span className="text-sm font-bold text-foreground">Total ({filtered.length} entries)</span>
              <span className="text-lg font-bold text-primary">₹{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        )}
      </EntryCard>
    </MobileFormLayout>
  );
};

export default TipperLedgerPage;
