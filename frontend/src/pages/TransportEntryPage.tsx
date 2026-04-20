import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Truck, 
  Plus, 
  Search, 
  Calendar as CalendarIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  IndianRupee, 
  ClipboardList,
  Filter,
  ChevronDown,
  X,
  Loader2,
  Trash2,
  Save,
  Navigation,
  Edit2,
  FileText,
  Download
} from "lucide-react";
import { transportApi } from "@/api/transport.api";
import { clientsApi } from "@/api/clients.api";
import { settingsApi } from "@/api/settings.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { DragScrollContainer } from "@/components/DragScrollContainer";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const TransportEntryPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [transportType, setTransportType] = useState<"RD_VEHICLE" | "VENDOR_VEHICLE">("RD_VEHICLE");
  const [vehicleId, setVehicleId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [driverName, setDriverName] = useState("");
  const [loads, setLoads] = useState<number>(1);
  const [transactionType, setTransactionType] = useState<"EXPENSE" | "INCOME">("EXPENSE");
  const [dieselCost, setDieselCost] = useState<number>(0);
  const [otherExpense, setOtherExpense] = useState<number>(0);
  const [rentPerLoad, setRentPerLoad] = useState<number>(0);
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [incomeAmount, setIncomeAmount] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [material, setMaterial] = useState("");
  const [syncToCashBook, setSyncToCashBook] = useState(false);
  const [brickTypeId, setBrickTypeId] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [location, setLocation] = useState("");
  const [linkedOrderId, setLinkedOrderId] = useState("");
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeView, setActiveView] = useState<"activity" | "reports">("activity");

  // Reports view state
  const [reportStartDate, setReportStartDate] = useState(format(new Date(), "yyyy-MM-01"));
  const [reportEndDate, setReportEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Queries
  const { data: vehicles = [] } = useQuery({
    queryKey: ["transport-vehicles"],
    queryFn: () => transportApi.getVehicles(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["transport-vendors"],
    queryFn: () => transportApi.getVendors(),
  });

  const { data: brickTypes = [] } = useQuery({
    queryKey: ["brick-types"],
    queryFn: () => settingsApi.getBrickTypes(),
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["transport-entries"],
    queryFn: () => transportApi.getEntries(),
  });

  // Reports data
  const { data: reportEntries = [], isLoading: isReportLoading } = useQuery({
    queryKey: ["transport-report-entries", reportStartDate, reportEndDate],
    queryFn: () => transportApi.getEntries({ startDate: reportStartDate, endDate: reportEndDate }),
    enabled: activeView === "reports",
  });

  const { data: reportSummary } = useQuery({
    queryKey: ["transport-report-summary", reportStartDate, reportEndDate],
    queryFn: () => transportApi.getSummary({ startDate: reportStartDate, endDate: reportEndDate }),
    enabled: activeView === "reports",
  });

  // Client orders for linking
  const { data: clientOrders = [] } = useQuery({
    queryKey: ["client-orders-for-transport"],
    queryFn: () => clientsApi.getAllOrders({}),
    enabled: isDialogOpen,
  });

  const { data: summary } = useQuery({
    queryKey: ["transport-summary"],
    queryFn: () => transportApi.getSummary(),
  });

  // Mutations
  const createEntryMutation = useMutation({
    mutationFn: (data: any) => transportApi.createEntry(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport-entries"] });
      queryClient.invalidateQueries({ queryKey: ["transport-summary"] });
      toast.success("Transport entry saved successfully");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save entry");
    }
  });

  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  const updateEntryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => transportApi.updateEntry(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport-entries"] });
      queryClient.invalidateQueries({ queryKey: ["transport-summary"] });
      toast.success("Transport entry updated");
      setIsDialogOpen(false);
      setEditingEntry(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update entry");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transportApi.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport-entries"] });
      queryClient.invalidateQueries({ queryKey: ["transport-summary"] });
      toast.success("Entry deleted");
    }
  });

  const handleLinkOrder = (orderId: string) => {
    setLinkedOrderId(orderId);
    if (!orderId) return;

    const order = (clientOrders as any[]).find((o: any) => o.id === orderId);
    if (order) {
      // Auto-fill from order
      if (order.brickTypeId) setBrickTypeId(order.brickTypeId);
      if (order.quantity) setQuantity(order.quantity);
      const loc = order.location || order.client?.address || "";
      if (loc) setLocation(loc);
      setMaterial("Bricks");
      toast.success("Order linked", { description: `${order.client?.name || "Client"} — ${order.brickType?.size || ""} ${order.quantity?.toLocaleString() || 0} pcs` });
    }
  };

  const handleEditEntry = (item: any) => {
    setEditingEntry(item);
    setDate(format(new Date(item.date), "yyyy-MM-dd"));
    setTransportType(item.transportType);
    setVehicleId(item.vehicleId);
    setVendorId(item.vendorId || "");
    setDriverName(item.driverName || "");
    setLoads(item.loads);
    setTransactionType(item.transactionType);
    setDieselCost(item.dieselCost || 0);
    setOtherExpense(item.otherExpense || 0);
    setRentPerLoad(item.rentPerLoad || 0);
    setExpenseAmount(item.expenseAmount || 0);
    setIncomeAmount(item.incomeAmount || 0);
    setNotes(item.notes || "");
    setMaterial(item.material || "");
    setSyncToCashBook(false);
    setBrickTypeId(item.brickTypeId || "");
    setQuantity(item.quantity || 0);
    setLocation(item.location || "");
    setLinkedOrderId(item.dispatchId || "");
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setVehicleId("");
    setVendorId("");
    setDriverName("");
    setLoads(1);
    setDieselCost(0);
    setOtherExpense(0);
    setRentPerLoad(0);
    setExpenseAmount(0);
    setIncomeAmount(0);
    setNotes("");
    setMaterial("");
    setSyncToCashBook(false);
    setBrickTypeId("");
    setQuantity(0);
    setLocation("");
    setLinkedOrderId("");
  };
  // Reset fields when switching transport type
  useEffect(() => {
    setVehicleId("");
    setVendorId("");
    setLoads(1);
    setDieselCost(0);
    setOtherExpense(0);
    setRentPerLoad(0);
    setExpenseAmount(0);
    setIncomeAmount(0);
    setMaterial("");
    setNotes("");
    setDriverName("");
  }, [transportType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build notes with linked order info
    let finalNotes = notes || "";
    if (linkedOrderId) {
      const linkedOrder = (clientOrders as any[]).find((o: any) => o.id === linkedOrderId);
      if (linkedOrder) {
        const clientName = linkedOrder.client?.name || "Client";
        const orderInfo = `Linked: ${clientName} - ${linkedOrder.brickType?.size || ""} ${linkedOrder.quantity || 0} pcs`;
        finalNotes = finalNotes ? finalNotes + " | " + orderInfo : orderInfo;
      }
    }

    const payload: any = {
      date,
      transportType,
      vehicleId,
      loads,
      material: material || undefined,
      notes: finalNotes || undefined,
      syncToCashBook,
      brickTypeId: brickTypeId || undefined,
      quantity: quantity || undefined,
      location: location || undefined,
      dispatchId: linkedOrderId || undefined,
    };

    if (transportType === "RD_VEHICLE") {
      payload.transactionType = "EXPENSE";
      payload.driverName = driverName || undefined;
      payload.dieselCost = dieselCost || 0;
      payload.otherExpense = otherExpense || 0;
      payload.expenseAmount = (dieselCost || 0) + (otherExpense || 0);
    } else {
      payload.transactionType = "INCOME";
      payload.vendorId = vendorId || undefined;
      payload.rentPerLoad = rentPerLoad || 0;
      payload.incomeAmount = (loads || 0) * (rentPerLoad || 0);
    }

    if (editingEntry) {
      updateEntryMutation.mutate({ id: editingEntry.id, data: payload });
    } else {
      createEntryMutation.mutate(payload);
    }
  };

  const filteredVehicles = vehicles.filter((v: any) => 
    transportType === "RD_VEHICLE" ? v.vehicleType === "COMPANY" : v.vehicleType === "VENDOR"
  );

  const filteredEntries = entries.filter((item: any) => {
    const matchesSearch = 
      item.vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.driverName && item.driverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.vendor?.name && item.vendor.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.material && item.material.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = filterType === "all" || item.transportType === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleTransportPDF = () => {
    try {
      if (filteredEntries.length === 0) { toast.error("No entries to export"); return; }
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16); doc.text("RD Interlock - Transport Activity Log", 14, 15);
      doc.setFontSize(10); doc.text("Generated: " + format(new Date(), "dd-MM-yyyy") + "  |  Entries: " + filteredEntries.length, 14, 22);
      autoTable(doc, {
        head: [["Date", "Type", "Vehicle", "Driver/Vendor", "Material", "Loads", "Expense", "Income"]],
        body: filteredEntries.map((i: any) => [
          format(new Date(i.date), "dd-MM-yyyy"), i.transportType === "RD_VEHICLE" ? "RD" : "Vendor",
          i.vehicle?.vehicleNumber || "-", i.transportType === "RD_VEHICLE" ? (i.driverName || "-") : (i.vendor?.name || "-"),
          i.material || "-", i.loads, i.expenseAmount > 0 ? "Rs." + i.expenseAmount.toLocaleString() : "-",
          i.incomeAmount > 0 ? "Rs." + i.incomeAmount.toLocaleString() : "-"
        ]),
        startY: 28, styles: { fontSize: 7 }, headStyles: { fillColor: [59, 130, 246] },
      });
      doc.save("transport-log-" + format(new Date(), "dd-MM-yyyy") + ".pdf");
      toast.success("PDF exported");
    } catch (err: any) { toast.error("Export failed", { description: err.message }); }
  };

  const handleTransportExcel = () => {
    try {
      if (filteredEntries.length === 0) { toast.error("No entries to export"); return; }
      const cols = ["Date", "Type", "Vehicle", "Driver/Vendor", "Material", "Loads", "Expense", "Income"];
      const rows = filteredEntries.map((i: any) => [
        format(new Date(i.date), "dd-MM-yyyy"), i.transportType === "RD_VEHICLE" ? "RD" : "Vendor",
        i.vehicle?.vehicleNumber || "-", i.transportType === "RD_VEHICLE" ? (i.driverName || "-") : (i.vendor?.name || "-"),
        i.material || "-", i.loads, i.expenseAmount || 0, i.incomeAmount || 0
      ]);
      const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transport Log");
      XLSX.writeFile(wb, "transport-log-" + format(new Date(), "dd-MM-yyyy") + ".xlsx");
      toast.success("Excel exported");
    } catch (err: any) { toast.error("Export failed", { description: err.message }); }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
            <Navigation className="h-8 w-8 text-primary" />
            Transport Management
          </h1>
          <p className="text-muted-foreground mt-1">Unified tracking for RD and Vendor vehicles</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingEntry(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingEntry(null); resetForm(); }} className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2 hover:scale-[1.02] transition-transform">
              <Plus className="h-5 w-5" />
              New Transport Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-[2rem] border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95 p-0 overflow-hidden flex flex-col max-h-[90vh]">
            <DialogHeader className="p-6 pb-2 border-b border-border/50 bg-secondary/10 shrink-0">
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                <Truck className="h-6 w-6" /> {editingEntry ? "Edit Transport Entry" : "Create Transport Entry"}
              </DialogTitle>
              <DialogDescription>{editingEntry ? "Update the transport entry details below." : "Record a new transport activity. Fill in the details below."}</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="space-y-8 p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Date</label>
                  <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="h-12 rounded-xl bg-background/50 border-primary/10 transition-all focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Transport Type</label>
                  <Tabs 
                    defaultValue="RD_VEHICLE" 
                    className="w-full"
                    onValueChange={(v: any) => {
                      setTransportType(v);
                      setTransactionType(v === "RD_VEHICLE" ? "EXPENSE" : "INCOME");
                      resetForm();
                    }}
                  >
                    <TabsList className="grid grid-cols-2 h-12 p-1 bg-muted/50 rounded-xl">
                      <TabsTrigger value="RD_VEHICLE" className="rounded-lg font-bold text-xs uppercase tracking-tight">RD Vehicle</TabsTrigger>
                      <TabsTrigger value="VENDOR_VEHICLE" className="rounded-lg font-bold text-xs uppercase tracking-tight">Vendor Vehicle</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Select Vehicle</label>
                  <Select onValueChange={setVehicleId} value={vehicleId}>
                    <SelectTrigger className="h-12 rounded-xl bg-background/50 border-primary/10">
                      <SelectValue placeholder="Select Vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredVehicles.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>{v.vehicleNumber} ({v.ownerName})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {transportType === "RD_VEHICLE" ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Driver Name</label>
                    <Input 
                      placeholder="e.g. Mani"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="h-12 rounded-xl bg-background/50 border-primary/10 transition-all focus:ring-2 focus:ring-primary/10"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Select Vendor</label>
                    <Select onValueChange={setVendorId} value={vendorId}>
                      <SelectTrigger className="h-12 rounded-xl bg-background/50 border-primary/10">
                        <SelectValue placeholder="Select Vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors.map((v: any) => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Load Count</label>
                  <Input 
                    type="number"
                    min="1"
                    value={loads}
                    onChange={(e) => setLoads(Number(e.target.value))}
                    className="h-12 rounded-xl bg-background/50 border-primary/10 transition-all focus:ring-2 focus:ring-primary/10"
                  />
                </div>

                {transportType === "RD_VEHICLE" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1 text-primary/80">Diesel Cost (₹)</label>
                      <Input 
                        type="number"
                        value={dieselCost === 0 ? "" : dieselCost}
                        onChange={(e) => setDieselCost(Number(e.target.value))}
                        className="h-12 rounded-xl bg-primary/5 border-primary/20 font-bold"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Other Expense (₹)</label>
                      <Input 
                        type="number"
                        value={otherExpense === 0 ? "" : otherExpense}
                        onChange={(e) => setOtherExpense(Number(e.target.value))}
                        className="h-12 rounded-xl bg-background/50 border-primary/10 transition-all focus:ring-2 focus:ring-primary/10"
                        placeholder="0"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1 text-success/80">Rent Per Load (₹)</label>
                      <Input 
                        type="number"
                        value={rentPerLoad === 0 ? "" : rentPerLoad}
                        onChange={(e) => setRentPerLoad(Number(e.target.value))}
                        className="h-12 rounded-xl bg-success/5 border-success/20 font-bold"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Calculated Income (₹)</label>
                      <div className="h-12 px-3 rounded-xl bg-success/10 border border-success/20 flex items-center font-bold text-success">
                        ₹ {loads * rentPerLoad}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Notes</label>
                <Input 
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-12 rounded-xl bg-background/50 border-primary/10 transition-all focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Load Material</label>
                <Input
                  placeholder="e.g. Bricks, Sand, Cement..."
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="h-12 rounded-xl bg-background/50 border-primary/10 transition-all focus:ring-2 focus:ring-primary/10"
                />
              </div>

              {/* Link to Client Order */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Link to Client Order (Optional)</label>
                <select
                  value={linkedOrderId}
                  onChange={(e) => handleLinkOrder(e.target.value)}
                  className="w-full h-12 px-3 bg-primary/5 border border-primary/20 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-primary/10 outline-none"
                >
                  <option value="">No linked order — manual entry</option>
                  {(clientOrders as any[])
                    // Only show orders that still need transport — hide already-dispatched/completed ones.
                    .filter((o: any) => ["PENDING", "IN_PRODUCTION", "READY"].includes(o.status))
                    .map((o: any) => (
                      <option key={o.id} value={o.id}>
                        {o.client?.name || "Client"} — {o.brickType?.size || "?"} — {(o.quantity || 0).toLocaleString()} pcs — {o.status}
                      </option>
                    ))
                  }
                </select>
                {linkedOrderId && (() => {
                  const order = (clientOrders as any[]).find((o: any) => o.id === linkedOrderId);
                  if (!order) return null;
                  return (
                    <div className="p-2.5 bg-primary/5 border border-primary/10 rounded-xl text-[11px] font-medium text-foreground flex items-center justify-between">
                      <div>
                        <span className="font-bold">{order.client?.name}</span>
                        <span className="text-muted-foreground"> — {order.brickType?.size} — {order.quantity?.toLocaleString()} pcs</span>
                        {order.client?.address && <span className="text-muted-foreground"> — {order.client.address}</span>}
                      </div>
                      <button type="button" onClick={() => { setLinkedOrderId(""); }} className="p-1 hover:bg-secondary rounded-lg">
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Brick Type</label>
                  <select
                    value={brickTypeId}
                    onChange={(e) => setBrickTypeId(e.target.value)}
                    className="w-full h-12 px-3 bg-background/50 border border-primary/10 rounded-xl text-sm focus:ring-2 focus:ring-primary/10 outline-none"
                  >
                    <option value="">None</option>
                    {(brickTypes as any[]).map((bt: any) => (
                      <option key={bt.id} value={bt.id}>{bt.size}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Quantity</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={quantity || ""}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="h-12 rounded-xl bg-background/50 border-primary/10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 ml-1">Location / Destination</label>
                <Input
                  placeholder="e.g. Salem, Erode..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-12 rounded-xl bg-background/50 border-primary/10 transition-all focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <div className="flex items-center space-x-2 bg-primary/5 p-4 rounded-xl border border-primary/10">
                <Checkbox
                  id="sync"
                  checked={syncToCashBook}
                  onCheckedChange={(v: any) => setSyncToCashBook(v)}
                />
                <label htmlFor="sync" className="text-sm font-medium leading-none cursor-pointer">
                  Automatically sync to Cash Book
                </label>
              </div>
            </div>

              <DialogFooter className="gap-2 sm:gap-0 p-6 pt-4 border-t border-border/50 shrink-0">
                <Button type="button" variant="ghost" onClick={() => { setIsDialogOpen(false); setEditingEntry(null); }} className="rounded-xl h-12">Cancel</Button>
                <Button
                  type="submit"
                  disabled={createEntryMutation.isPending || updateEntryMutation.isPending}
                  className="rounded-xl h-12 px-8 min-w-[120px] shadow-lg shadow-primary/20 font-black"
                >
                  {(createEntryMutation.isPending || updateEntryMutation.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEntry ? "Save Changes" : "Confirm Entry"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-2xl max-w-xs">
        <button onClick={() => setActiveView("activity")} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeView === "activity" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>Activity Log</button>
        <button onClick={() => setActiveView("reports")} className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${activeView === "reports" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}>Reports</button>
      </div>

      {activeView === "reports" ? (
        <>
          {/* Report Filters */}
          <div className="card-modern p-4 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Start Date</label>
              <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs focus:border-primary outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">End Date</label>
              <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs focus:border-primary outline-none" />
            </div>
          </div>

          {/* Report Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Total Loads</p>
              <p className="text-xl font-black">{reportSummary?.totalLoads || 0}</p>
            </div>
            <div className="p-3 rounded-2xl bg-rose-500/5 border border-rose-500/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-500 mb-1">Expense</p>
              <p className="text-xl font-black text-rose-600">₹{(reportSummary?.totalExpense || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-1">Income</p>
              <p className="text-xl font-black text-emerald-600">₹{(reportSummary?.totalIncome || 0).toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Net Cost</p>
              <p className="text-xl font-black text-white">₹{(reportSummary?.netCost || 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Report Export */}
          <div className="flex gap-2">
            <button onClick={() => {
              try {
                if (reportEntries.length === 0) { toast.error("No data"); return; }
                const doc = new jsPDF({ orientation: "landscape" });
                doc.setFontSize(16); doc.text("Transport Report", 14, 15);
                doc.setFontSize(10); doc.text("Period: " + reportStartDate + " to " + reportEndDate, 14, 22);
                autoTable(doc, {
                  head: [["Date", "Vehicle", "Type", "Loads", "Expense", "Income"]],
                  body: reportEntries.map((i: any) => [format(new Date(i.date), "dd-MM-yyyy"), i.vehicle?.vehicleNumber || "-", i.transportType === "RD_VEHICLE" ? "RD" : "Vendor", i.loads, i.expenseAmount > 0 ? "Rs." + i.expenseAmount.toLocaleString() : "-", i.incomeAmount > 0 ? "Rs." + i.incomeAmount.toLocaleString() : "-"]),
                  startY: 28, styles: { fontSize: 8 }, headStyles: { fillColor: [59, 130, 246] },
                });
                doc.save("transport-report-" + format(new Date(), "dd-MM-yyyy") + ".pdf");
                toast.success("PDF exported");
              } catch (err: any) { toast.error("Failed", { description: err.message }); }
            }} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-secondary/50 border border-border text-[11px] font-bold hover:bg-secondary transition-all active:scale-[0.98]"><FileText className="h-3.5 w-3.5" /> PDF</button>
            <button onClick={() => {
              try {
                if (reportEntries.length === 0) { toast.error("No data"); return; }
                const cols = ["Date", "Vehicle", "Type", "Loads", "Expense", "Income"];
                const rows = reportEntries.map((i: any) => [format(new Date(i.date), "dd-MM-yyyy"), i.vehicle?.vehicleNumber || "-", i.transportType === "RD_VEHICLE" ? "RD" : "Vendor", i.loads, i.expenseAmount || 0, i.incomeAmount || 0]);
                const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Report");
                XLSX.writeFile(wb, "transport-report-" + format(new Date(), "dd-MM-yyyy") + ".xlsx");
                toast.success("Excel exported");
              } catch (err: any) { toast.error("Failed", { description: err.message }); }
            }} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-all active:scale-[0.98]"><Download className="h-3.5 w-3.5" /> Excel</button>
          </div>

          {/* Report Table */}
          <Card className="rounded-2xl border-border/50 shadow-xl overflow-hidden bg-background/50">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm text-left min-w-[500px]">
                <thead className="bg-muted/30 text-xs text-muted-foreground border-b border-border uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 font-bold">Date</th>
                    <th className="py-3 px-4 font-bold">Vehicle</th>
                    <th className="py-3 px-4 font-bold">Type</th>
                    <th className="py-3 px-4 font-bold text-center">Loads</th>
                    <th className="py-3 px-4 font-bold text-right">Expense</th>
                    <th className="py-3 px-4 font-bold text-right">Income</th>
                  </tr>
                </thead>
                <tbody>
                  {isReportLoading ? (
                    <tr><td colSpan={6} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary/20" /></td></tr>
                  ) : reportEntries.length === 0 ? (
                    <tr><td colSpan={6} className="h-32 text-center text-muted-foreground italic">No entries for selected period</td></tr>
                  ) : (
                    reportEntries.map((item: any) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="py-3 px-4 font-bold">{format(new Date(item.date), "dd MMM yyyy")}</td>
                        <td className="py-3 px-4 font-bold text-primary">{item.vehicle?.vehicleNumber}</td>
                        <td className="py-3 px-4"><Badge variant="outline" className="rounded-md text-[10px] font-black">{item.transportType === "RD_VEHICLE" ? "RD" : "VENDOR"}</Badge></td>
                        <td className="py-3 px-4 text-center font-bold">{item.loads}</td>
                        <td className="py-3 px-4 text-right text-rose-500 font-bold">{item.expenseAmount > 0 ? "₹" + item.expenseAmount.toLocaleString() : "-"}</td>
                        <td className="py-3 px-4 text-right text-emerald-500 font-bold">{item.incomeAmount > 0 ? "₹" + item.incomeAmount.toLocaleString() : "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
      {/* Export */}
      <div className="flex gap-2">
        <button onClick={handleTransportPDF} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-secondary/50 border border-border text-[11px] font-bold hover:bg-secondary transition-all active:scale-[0.98]"><FileText className="h-3.5 w-3.5" /> PDF</button>
        <button onClick={handleTransportExcel} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-all active:scale-[0.98]"><Download className="h-3.5 w-3.5" /> Excel</button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-white overflow-hidden relative p-4 md:p-6">
          <div className="absolute -top-2 -right-2 opacity-10">
            <Truck className="h-16 w-16 md:h-24 md:w-24" />
          </div>
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Loads Today</p>
          <div className="text-xl md:text-3xl font-black">{summary?.totalLoads || 0}</div>
          <p className="text-[8px] md:text-[10px] mt-1 opacity-70">Total vehicle count</p>
        </Card>

        <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-rose-500 to-rose-600 text-white overflow-hidden relative p-4 md:p-6">
          <div className="absolute -top-2 -right-2 opacity-10">
            <ArrowUpRight className="h-16 w-16 md:h-24 md:w-24" />
          </div>
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Expense</p>
          <div className="text-xl md:text-3xl font-black">₹{summary?.totalExpense > 9999 ? (summary.totalExpense / 1000).toFixed(1) + 'k' : summary?.totalExpense || 0}</div>
          <p className="text-[8px] md:text-[10px] mt-1 opacity-70">Diesel + Others</p>
        </Card>

        <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative p-4 md:p-6">
          <div className="absolute -top-2 -right-2 opacity-10">
            <ArrowDownLeft className="h-16 w-16 md:h-24 md:w-24" />
          </div>
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Income</p>
          <div className="text-xl md:text-3xl font-black">₹{summary?.totalIncome > 9999 ? (summary.totalIncome / 1000).toFixed(1) + 'k' : summary?.totalIncome || 0}</div>
          <p className="text-[8px] md:text-[10px] mt-1 opacity-70">Vendor Rent</p>
        </Card>

        <Card className="rounded-2xl border-none shadow-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden relative p-4 md:p-6">
          <div className="absolute -top-2 -right-2 opacity-10">
            <IndianRupee className="h-16 w-16 md:h-24 md:w-24" />
          </div>
          <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Net Cost</p>
          <div className="text-xl md:text-3xl font-black">₹{summary?.netCost > 9999 ? (summary.netCost / 1000).toFixed(1) + 'k' : summary?.netCost || 0}</div>
          <p className="text-[8px] md:text-[10px] mt-1 opacity-70">Exp - Inc</p>
        </Card>
      </div>

      {/* Main Table View */}
      <Card className="rounded-2xl border-border/50 shadow-xl overflow-hidden bg-background/50 backdrop-blur-sm">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between border-b border-border/50 bg-muted/20 gap-4 p-4 md:p-6">
          <div>
            <CardTitle className="text-lg md:text-xl font-black flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Transport Activity Log
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Recent transport entries and details</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative group flex-1 md:flex-none">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search vehicles..." 
                className="h-10 w-full md:w-64 pl-9 rounded-xl text-sm bg-background/50 border-primary/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 md:w-auto md:px-4 rounded-xl gap-2 font-bold text-xs uppercase tracking-tight border-primary/10">
                  <Filter className="h-4 w-4" /> 
                  <span className="hidden md:inline">Filter</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[325px] rounded-2xl border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black text-primary">Filter Entries</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Transport Type</label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="RD_VEHICLE">RD Vehicle</SelectItem>
                        <SelectItem value="VENDOR_VEHICLE">Vendor Vehicle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full rounded-xl h-11 font-bold" onClick={() => setIsFilterOpen(false)}>Apply Filters</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-border/30">
            {entriesLoading ? (
              <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary/20" /></div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground italic text-sm">No entries found.</div>
            ) : (
              filteredEntries.map((item: any) => (
                <div key={item.id} className="p-4 space-y-3 active:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-black text-primary uppercase">{item.vehicle.vehicleNumber}</span>
                        <Badge variant={item.transportType === "RD_VEHICLE" ? "secondary" : "outline"} className="rounded-lg text-[9px] font-black h-4 px-1.5 leading-none">
                          {item.transportType === "RD_VEHICLE" ? "RD" : "VENDOR"}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                        {item.transportType === "RD_VEHICLE" 
                          ? `Driver: ${item.driverName || item.vehicle.driverName || 'N/A'}`
                          : `Vendor: ${item.vendor?.name || 'N/A'}`
                        }
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-muted-foreground uppercase mb-0.5">{format(new Date(item.date), "dd MMM, yyyy")}</p>
                      <div className="flex items-center justify-end gap-1">
                        <Badge className="bg-primary/5 text-primary border-primary/10 font-black text-[10px] rounded-lg h-5">
                          {item.loads} Loads
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-y border-border/20">
                    <div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Financials</p>
                      <p className={`text-sm font-black ${item.transportType === "RD_VEHICLE" ? "text-rose-500" : "text-emerald-500"}`}>
                        {item.transportType === "RD_VEHICLE"
                          ? `Exp: ₹${item.expenseAmount?.toLocaleString()}`
                          : `Inc: ₹${item.incomeAmount?.toLocaleString()}`
                        }
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Material</p>
                      <p className="text-sm font-semibold text-foreground italic truncate">{item.material || "General"}</p>
                    </div>
                  </div>
                  {(item.brickType || item.quantity || item.location) && (
                    <div className="grid grid-cols-3 gap-3 py-2 border-b border-border/20">
                      {item.brickType && (
                        <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Brick Type</p>
                          <p className="text-xs font-bold text-foreground">{item.brickType.size}</p>
                        </div>
                      )}
                      {item.quantity > 0 && (
                        <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Qty</p>
                          <p className="text-xs font-bold text-foreground">{item.quantity?.toLocaleString()}</p>
                        </div>
                      )}
                      {item.location && (
                        <div>
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Location</p>
                          <p className="text-xs font-bold text-foreground truncate">{item.location}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-1">
                    <p className="text-[10px] text-muted-foreground italic truncate max-w-[60%]">{item.notes || "No notes"}</p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-amber-600/60 hover:text-amber-600 hover:bg-amber-500/5 rounded-xl"
                        onClick={() => handleEditEntry(item)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/5 rounded-xl"
                        onClick={() => {
                          setDeleteEntryId(item.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <DragScrollContainer showHint className="w-full">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest h-12">Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Type</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Vehicle</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Material</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Driver / Vendor</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-center h-12">Loads</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right text-rose-500 h-12">Expense</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right text-emerald-500 h-12">Income</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right h-12 px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entriesLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-48 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" />
                      </TableCell>
                    </TableRow>
                  ) : filteredEntries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-48 text-center text-muted-foreground italic font-medium">
                        No transport entries found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredEntries.map((item: any) => (
                      <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors border-border/50">
                        <TableCell className="font-bold text-sm whitespace-nowrap">{format(new Date(item.date), "dd MMM")}</TableCell>
                        <TableCell>
                          <Badge variant={item.transportType === "RD_VEHICLE" ? "secondary" : "outline"} className="rounded-lg text-[10px] font-black px-2 py-0.5">
                            {item.transportType === "RD_VEHICLE" ? "RD" : "VENDOR"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          <div className="flex flex-col">
                            <span className="font-bold text-primary whitespace-nowrap uppercase">{item.vehicle.vehicleNumber}</span>
                            <span className="text-[10px] text-muted-foreground uppercase whitespace-nowrap">{item.vehicle.ownerName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium italic text-muted-foreground whitespace-nowrap">
                          {item.material || "-"}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {item.transportType === "RD_VEHICLE" ? (
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                              {item.driverName || item.vehicle.driverName || '-'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                              {item.vendor?.name || '-'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-black">
                          {item.loads}
                        </TableCell>
                        <TableCell className="text-right font-bold text-rose-500 whitespace-nowrap">
                          {item.expenseAmount > 0 ? `₹ ${item.expenseAmount.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-500 whitespace-nowrap">
                          {item.incomeAmount > 0 ? `₹ ${item.incomeAmount.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl hover:bg-background shadow-sm border border-transparent hover:border-border"
                              onClick={() => handleEditEntry(item)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive rounded-xl hover:bg-destructive/10"
                              onClick={() => setDeleteEntryId(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </DragScrollContainer>
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {/* Delete Entry Confirm */}
      {deleteEntryId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-[380px] rounded-3xl p-6 shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-bold mb-2">Delete Transport Entry?</h2>
            <p className="text-sm text-muted-foreground mb-5">This will permanently remove this entry and any linked cash records.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteEntryId(null)} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Cancel</button>
              <button onClick={() => { deleteMutation.mutate(deleteEntryId); setDeleteEntryId(null); }} className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportEntryPage;
