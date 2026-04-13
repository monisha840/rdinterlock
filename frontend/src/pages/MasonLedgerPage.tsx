import { useState, useEffect, useRef } from "react";
import { MobileFormLayout, FormField, BigNumberInput } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { KPICard } from "@/components/KPICard";
import { ActionButton } from "@/components/ActionButton";
import { toast } from "sonner";
import { Hammer, Loader2, MapPin, IndianRupee, Search, X, Save, Plus, Users, Edit2, Trash2, FileText, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/api/apiClient";
import { settingsApi } from "@/api/settings.api";
import { productionApi } from "@/api/production.api";
import { clientsApi } from "@/api/clients.api";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// ─── Mason rate helper ───────────────────────────────────────────────────────
const getDefaultMasonRate = (brickSize: string, constructionType: string) => {
  const size = brickSize?.toLowerCase() || "";
  const ct = constructionType?.toLowerCase() || "";
  if (size.includes("6")) {
    if (ct.includes("compound")) return 7;
    return 9;
  }
  if (size.includes("8")) return 10;
  return 9;
};

// ─── Client Search Dropdown ──────────────────────────────────────────────────
const ClientDropdown = ({ clients, value, onChange }: { clients: any[]; value: string; onChange: (client: any) => void }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = clients.find((c: any) => c.id === value);
  const filtered = clients.filter((c: any) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.name?.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q);
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {value && selected ? (
        <div className="flex items-center justify-between h-11 px-3 bg-purple-500/5 border border-purple-500/20 rounded-xl">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="h-3.5 w-3.5 text-purple-500 shrink-0" />
            <span className="text-sm font-semibold text-foreground truncate">{selected.name}</span>
            {selected.address && <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">({selected.address})</span>}
          </div>
          <button onClick={() => { onChange(null); setQuery(""); }} className="p-1 hover:bg-secondary rounded-lg shrink-0">
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search client by name or location (optional)"
            className="w-full h-11 pl-9 pr-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-purple-500 focus:outline-none"
          />
        </div>
      )}
      {open && !value && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="p-3 text-xs text-muted-foreground text-center">No clients found</p>
          ) : (
            filtered.map((c: any) => (
              <button
                key={c.id}
                onClick={() => { onChange(c); setOpen(false); setQuery(""); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                  {c.address && <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5 shrink-0" />{c.address}</p>}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const MasonLedgerPage = () => {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  // ─── Mason Form State ──────────────────────────────────────────────────────
  const [masonId, setMasonId] = useState("");
  const [masonClientId, setMasonClientId] = useState("");
  const [masonSiteName, setMasonSiteName] = useState("");
  const [masonBrickTypeId, setMasonBrickTypeId] = useState("");
  const [masonConstructionTypes, setMasonConstructionTypes] = useState<string[]>([]);
  const [masonQuantity, setMasonQuantity] = useState("");
  const [masonRate, setMasonRate] = useState("");
  const [masonDate, setMasonDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // ─── Queries ───────────────────────────────────────────────────────────────
  const { data: ledger = [], isLoading } = useQuery<any[]>({
    queryKey: ["mason-ledger", startDate, endDate],
    queryFn: async () => {
      const res = await apiClient.get(`/reports/mason-ledger?startDate=${startDate}&endDate=${endDate}`);
      return (res as any).data;
    },
  });

  const { data: metadata } = useQuery({
    queryKey: ['form-metadata'],
    queryFn: settingsApi.getFormMetadata,
    staleTime: 5 * 60 * 1000,
  });

  const machines = metadata?.machines || [];
  const brickTypes = metadata?.brickTypes || [];
  const workerList = metadata?.workers || [];
  const masonList = workerList.filter((w: any) => w.role?.toUpperCase() === 'MASON');

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll(),
    enabled: showForm,
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ["client-orders-all"],
    queryFn: () => clientsApi.getAllOrders({}),
    enabled: showForm,
  });

  // ─── Auto-update rate when brick type or construction type changes ─────────
  const selectedBrickSize = brickTypes.find((bt: any) => bt.id === masonBrickTypeId)?.size || "";

  useEffect(() => {
    if (masonBrickTypeId) {
      const defaultRate = getDefaultMasonRate(selectedBrickSize, masonConstructionTypes[0] || "Room");
      setMasonRate(String(defaultRate));
    }
  }, [masonBrickTypeId, masonConstructionTypes, selectedBrickSize]);

  // ─── Client auto-fill ──────────────────────────────────────────────────────
  const handleClientSelect = (client: any) => {
    if (!client) {
      setMasonClientId("");
      setMasonSiteName("");
      return;
    }

    setMasonClientId(client.id);
    setMasonSiteName(client.address || client.name || "");

    const clientOrders = (allOrders as any[])
      .filter((o: any) => o.clientId === client.id)
      .sort((a: any, b: any) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    if (clientOrders.length > 0) {
      const latestOrder = clientOrders[0];
      if (latestOrder.brickTypeId) setMasonBrickTypeId(latestOrder.brickTypeId);
      if (latestOrder.constructionType) {
        const types = latestOrder.constructionType.split(",").map((t: string) => t.trim()).filter(Boolean);
        setMasonConstructionTypes(types);
      }
      if (latestOrder.quantity) setMasonQuantity(String(latestOrder.quantity));
      toast.success("Client details loaded", { description: `${latestOrder.brickType?.size || ""} - ${latestOrder.quantity || 0} pcs` });
    }
  };

  const resetForm = () => {
    setMasonId(""); setMasonClientId(""); setMasonSiteName(""); setMasonBrickTypeId("");
    setMasonConstructionTypes([]); setMasonQuantity(""); setMasonRate("");
    setMasonDate(format(new Date(), "yyyy-MM-dd"));
  };

  // ─── Save Mutation ─────────────────────────────────────────────────────────
  const createMasonWorkMutation = useMutation({
    mutationFn: productionApi.create,
    onSuccess: () => {
      toast.success("✅ Mason Site Work Saved");
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['mason-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      resetForm();
      setShowForm(false);
    },
    onError: (error: any) => {
      toast.error("❌ Failed to save", { description: error.response?.data?.message || error.message });
    },
  });

  // ─── Delete Mutation ───────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => productionApi.delete(id),
    onSuccess: () => {
      toast.success("✅ Entry deleted");
      queryClient.invalidateQueries({ queryKey: ['mason-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    },
    onError: (error: any) => {
      toast.error("❌ Delete failed", { description: error.response?.data?.message || error.message });
    },
  });

  const saveMasonWork = () => {
    const qty = parseInt(masonQuantity) || 0;
    const rate = parseFloat(masonRate) || 0;
    if (!masonId) { toast.error("Please select a mason"); return; }
    if (!masonBrickTypeId) { toast.error("Please select brick type"); return; }
    if (qty <= 0) { toast.error("Please enter bricks laid count"); return; }

    const payload = {
      date: masonDate,
      machineId: machines[0]?.id,
      shift: "MORNING" as any,
      brickTypeId: masonBrickTypeId,
      quantity: qty,
      damagedBricks: 0,
      notes: `Site: ${masonSiteName || 'N/A'}${masonConstructionTypes.length > 0 ? ' | Type: ' + masonConstructionTypes.join(', ') : ''} | Rate: ${rate}`,
      siteName: masonSiteName || undefined,
      workers: [{ workerId: masonId, quantity: qty }],
    };
    createMasonWorkMutation.mutate(payload);
  };

  // ─── Edit handler — populate form from ledger entry ────────────────────────
  const handleEdit = (e: any) => {
    setShowForm(true);
    // Find mason worker by name
    const mason = masonList.find((w: any) => w.name === e.masonName) || workerList.find((w: any) => w.name === e.masonName);
    if (mason) setMasonId(mason.id);
    setMasonSiteName(e.siteName || e.machine || "");
    // Find brick type
    const bt = brickTypes.find((b: any) => b.size === e.brickType);
    if (bt) setMasonBrickTypeId(bt.id);
    setMasonQuantity(String(e.bricks || ""));
    setMasonRate(String(e.ratePerBrick || ""));
    setMasonDate(format(new Date(e.date), "yyyy-MM-dd"));
    // Parse construction type from notes if available
    const noteMatch = (e.notes || "").match(/Type:\s*(.+?)(?:\s*\||$)/);
    if (noteMatch) {
      setMasonConstructionTypes(noteMatch[1].split(",").map((t: string) => t.trim()));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.info("Edit mode — modify and save to create updated entry");
  };

  // ─── Export PDF ────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    try {
      if (filtered.length === 0) { toast.error("No data to export"); return; }
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("RD Interlock - Mason Ledger", 14, 15);
      doc.setFontSize(10);
      doc.text("Period: " + startDate + " to " + endDate, 14, 22);

      autoTable(doc, {
        head: [["Mason", "Site", "Brick Type", "Bricks", "Rate", "Total", "Date"]],
        body: filtered.map((e: any) => [
          e.masonName || "-",
          e.siteName || e.machine || "-",
          e.brickType || "-",
          (e.bricks || 0).toLocaleString(),
          "Rs." + (e.ratePerBrick || 0),
          "Rs." + (e.totalAmount || 0).toLocaleString(),
          format(new Date(e.date), "dd-MM-yyyy"),
        ]),
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [147, 51, 234] },
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 200;
      doc.setFontSize(10);
      doc.text("Total Bricks: " + totalBricks.toLocaleString() + "  |  Total Earned: Rs." + totalEarnings.toLocaleString(), 14, finalY + 8);

      doc.save("mason-ledger-" + format(new Date(), "dd-MM-yyyy") + ".pdf");
      toast.success("PDF exported");
    } catch (err: any) {
      console.error(err);
      toast.error("PDF export failed", { description: err.message });
    }
  };

  // ─── Export Excel ──────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    try {
      if (filtered.length === 0) { toast.error("No data to export"); return; }
      const cols = ["Mason", "Site", "Brick Type", "Bricks", "Rate", "Total Amount", "Date"];
      const rows = filtered.map((e: any) => [
        e.masonName || "-",
        e.siteName || e.machine || "-",
        e.brickType || "-",
        e.bricks || 0,
        e.ratePerBrick || 0,
        e.totalAmount || 0,
        format(new Date(e.date), "dd-MM-yyyy"),
      ]);
      const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Mason Ledger");
      XLSX.writeFile(wb, "mason-ledger-" + format(new Date(), "dd-MM-yyyy") + ".xlsx");
      toast.success("Excel exported");
    } catch (err: any) {
      console.error(err);
      toast.error("Excel export failed", { description: err.message });
    }
  };

  // ─── Filters ───────────────────────────────────────────────────────────────
  const filtered = (ledger || []).filter((e: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.masonName?.toLowerCase().includes(q) || e.siteName?.toLowerCase().includes(q) || e.brickType?.toLowerCase().includes(q);
  });

  const totalBricks = filtered.reduce((s: number, e: any) => s + (e.bricks || 0), 0);
  const totalEarnings = filtered.reduce((s: number, e: any) => s + (e.totalAmount || 0), 0);
  const uniqueSites = new Set(filtered.map((e: any) => e.siteName).filter(Boolean)).size;

  const currentRate = parseFloat(masonRate) || 0;
  const currentQty = parseInt(masonQuantity) || 0;

  return (
    <MobileFormLayout title="Mason Ledger" subtitle="Site-wise mason work tracking">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
        <KPICard title="Total Bricks" value={totalBricks.toLocaleString()} icon={Hammer} variant="primary" />
        <KPICard title="Total Earned" value={`₹${totalEarnings.toLocaleString()}`} icon={IndianRupee} variant="success" />
        <KPICard title="Sites" value={String(uniqueSites)} icon={MapPin} variant="accent" />
      </div>

      {/* Action Buttons Row */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { if (showForm) { resetForm(); } setShowForm(!showForm); }}
          className="flex-1 h-10 flex items-center justify-center gap-2 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-all active:scale-[0.98] shadow-lg shadow-purple-500/20"
        >
          <Plus className="h-3.5 w-3.5" /> {showForm ? "Hide Form" : "Add Mason Work"}
        </button>
        <button onClick={handleExportPDF} className="h-10 px-3.5 flex items-center gap-1.5 rounded-xl bg-secondary/50 border border-border text-xs font-bold hover:bg-secondary transition-all active:scale-[0.98]">
          <FileText className="h-3.5 w-3.5" /> PDF
        </button>
        <button onClick={handleExportExcel} className="h-10 px-3.5 flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-all active:scale-[0.98]">
          <Download className="h-3.5 w-3.5" /> Excel
        </button>
      </div>

      {/* ═══ MASON SITE WORK FORM ═══ */}
      {showForm && (
        <EntryCard title="🧱 Mason Site Work">
          <p className="text-[10px] text-muted-foreground mb-4 uppercase font-semibold tracking-wider">
            Record bricks laid by masons at client sites
          </p>
          <div className="space-y-4">
            <FormField label="Date">
              <input type="date" value={masonDate} onChange={(e) => setMasonDate(e.target.value)} className="w-full h-11 px-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
            </FormField>

            <FormField label="Select Mason" required>
              <select value={masonId} onChange={(e) => setMasonId(e.target.value)} className="w-full h-11 px-3 bg-purple-500/5 border border-purple-500/20 rounded-xl text-foreground text-sm focus:border-purple-500 focus:outline-none">
                <option value="">Choose mason...</option>
                {masonList.length > 0
                  ? masonList.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)
                  : workerList.map((w: any) => <option key={w.id} value={w.id}>{w.name} ({w.role})</option>)
                }
              </select>
            </FormField>

            <FormField label="Client / Site Location">
              <ClientDropdown clients={clients} value={masonClientId} onChange={handleClientSelect} />
              {!masonClientId && (
                <input value={masonSiteName} onChange={(e) => setMasonSiteName(e.target.value)} placeholder="Or type site name manually..." className="w-full h-10 px-3 mt-2 bg-secondary/30 border border-border/50 rounded-xl text-foreground text-xs focus:border-primary focus:outline-none" />
              )}
              {masonClientId && masonSiteName && (
                <p className="text-[10px] text-purple-600 font-medium mt-1.5 flex items-center gap-1"><MapPin className="h-3 w-3" /> {masonSiteName}</p>
              )}
            </FormField>

            <FormField label="Brick Type" required>
              {brickTypes.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {brickTypes.map((bt: any) => (
                    <button key={bt.id} type="button" onClick={() => setMasonBrickTypeId(bt.id)} className={`h-10 rounded-xl text-sm font-bold border transition-all ${masonBrickTypeId === bt.id ? "bg-purple-500 text-white border-purple-500 shadow-sm" : "bg-background text-muted-foreground border-border hover:border-purple-500/40"}`}>{bt.size}</button>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground italic">No brick types found</p>}
            </FormField>

            <FormField label="Construction Type">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {["Room", "Compound", "Godown", "Other"].map((ct) => (
                  <button key={ct} type="button" onClick={() => setMasonConstructionTypes(prev => prev.includes(ct) ? prev.filter(t => t !== ct) : [...prev, ct])} className={`h-9 rounded-xl text-xs font-bold border transition-all ${masonConstructionTypes.includes(ct) ? "bg-purple-500 text-white border-purple-500 shadow-sm" : "bg-background text-muted-foreground border-border hover:border-purple-500/40"}`}>{ct}</button>
                ))}
              </div>
            </FormField>

            <FormField label="Bricks Laid" required>
              <BigNumberInput value={masonQuantity} onChange={setMasonQuantity} placeholder="Enter number of bricks laid" />
            </FormField>

            {/* Editable Rate */}
            <FormField label="Rate per Brick (₹)">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-purple-500" />
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    value={masonRate}
                    onChange={(e) => setMasonRate(e.target.value)}
                    placeholder="0"
                    className="w-full h-11 pl-9 pr-3 bg-purple-500/5 border border-purple-500/20 rounded-xl text-foreground text-base font-bold focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <span className="text-[10px] text-muted-foreground font-medium shrink-0">per brick</span>
              </div>
            </FormField>

            {/* Total Display */}
            {currentQty > 0 && currentRate > 0 && (
              <div className="p-4 bg-purple-500/5 border-2 border-purple-500/20 rounded-2xl animate-in fade-in duration-200">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Bricks x Rate</p>
                    <p className="text-xs text-muted-foreground">{currentQty.toLocaleString()} x ₹{currentRate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-0.5">Total Earning</p>
                    <p className="text-2xl font-black text-purple-700">₹{(currentQty * currentRate).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            <ActionButton
              label={createMasonWorkMutation.isPending ? "Saving..." : "Save Mason Work"}
              icon={createMasonWorkMutation.isPending ? Loader2 : Save}
              variant="primary"
              size="lg"
              onClick={saveMasonWork}
              className={`w-full shadow-lg ${createMasonWorkMutation.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={createMasonWorkMutation.isPending}
            />
          </div>
        </EntryCard>
      )}

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
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search mason, site, brick type..." className="w-full h-11 pl-10 pr-10 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none" />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4 text-muted-foreground" /></button>
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
            <p className="text-[11px] text-muted-foreground mt-1">Click "Add Mason Work" above to record mason work</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((e: any) => (
              <div key={e.id} className="p-4 bg-secondary/30 rounded-2xl border border-border/50 hover:border-primary/20 transition-all group">
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
                        ) : <span>{e.machine}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <div className="text-right mr-1">
                      <p className="text-[13px] sm:text-sm font-black text-primary">₹{(e.totalAmount || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(e.date), "dd MMM")}</p>
                    </div>
                    <button onClick={() => handleEdit(e)} className="p-1.5 rounded-lg hover:bg-secondary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all" title="Edit">
                      <Edit2 className="h-3.5 w-3.5 text-amber-500" />
                    </button>
                    <button onClick={() => setDeleteEntryId(e.productionId || e.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all" title="Delete">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
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
                {(e.powder > 0 || e.cement > 0 || e.flyAsh > 0) && (
                  <div className="grid grid-cols-3 gap-3 text-[11px] font-bold text-muted-foreground pt-3 mt-2 border-t border-border/20">
                    <div className="text-center"><p className="uppercase text-[9px] mb-0.5">Powder</p><p className="text-foreground text-[12px]">{e.powder > 0 ? `${e.powder} units` : '-'}</p></div>
                    <div className="text-center"><p className="uppercase text-[9px] mb-0.5">Cement</p><p className="text-foreground text-[12px]">{e.cement > 0 ? `${e.cement} units` : '-'}</p></div>
                    <div className="text-center"><p className="uppercase text-[9px] mb-0.5">Fly Ash</p><p className="text-foreground text-[12px]">{e.flyAsh > 0 ? `${e.flyAsh} units` : '-'}</p></div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20 mt-2">
              <span className="text-sm font-bold text-foreground">Total ({filtered.length} entries)</span>
              <span className="text-lg font-bold text-primary">₹{totalEarnings.toLocaleString()}</span>
            </div>
          </div>
        )}
      </EntryCard>

      {/* Delete Confirmation */}
      {deleteEntryId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-[380px] rounded-3xl p-6 shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-bold mb-2">Delete Mason Entry?</h2>
            <p className="text-sm text-muted-foreground mb-5">This will permanently remove this entry and affect wage calculations.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteEntryId(null)} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Cancel</button>
              <button onClick={() => { deleteMutation.mutate(deleteEntryId); setDeleteEntryId(null); }} className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </MobileFormLayout>
  );
};

export default MasonLedgerPage;
