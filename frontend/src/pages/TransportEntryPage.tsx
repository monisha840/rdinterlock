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
  Navigation
} from "lucide-react";
import { transportApi } from "@/api/transport.api";
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
  
  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Queries
  const { data: vehicles = [] } = useQuery({
    queryKey: ["transport-vehicles"],
    queryFn: () => transportApi.getVehicles(),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["transport-vendors"],
    queryFn: () => transportApi.getVendors(),
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["transport-entries"],
    queryFn: () => transportApi.getEntries(),
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

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transportApi.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport-entries"] });
      queryClient.invalidateQueries({ queryKey: ["transport-summary"] });
      toast.success("Entry deleted");
    }
  });

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
    
    const payload: any = {
      date,
      transportType,
      vehicleId,
      loads,
      material: material || undefined,
      notes: notes || undefined,
      syncToCashBook
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

    createEntryMutation.mutate(payload);
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
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2 hover:scale-[1.02] transition-transform">
              <Plus className="h-5 w-5" />
              New Transport Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl rounded-[2rem] border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95 p-0 overflow-hidden">
            <DialogHeader className="p-6 pb-2 border-b border-border/50 bg-secondary/10">
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                <Truck className="h-6 w-6" /> Create Transport Entry
              </DialogTitle>
              <DialogDescription>Record a new transport activity. Fill in the details below.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-8 p-6">
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

              <DialogFooter className="gap-2 sm:gap-0 mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-12">Cancel</Button>
                <Button 
                  type="submit" 
                  disabled={createEntryMutation.isPending} 
                  className="rounded-xl h-12 px-8 min-w-[120px] shadow-lg shadow-primary/20 font-black"
                >
                  {createEntryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Entry"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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

                  <div className="flex justify-between items-center pt-1">
                    <p className="text-[10px] text-muted-foreground italic truncate max-w-[70%]">{item.notes || "No notes"}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/5 rounded-xl"
                      onClick={() => {
                        if (window.confirm("Delete this entry?")) deleteMutation.mutate(item.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100"
                            onClick={() => {
                              if (window.confirm("Are you sure you want to delete this entry?")) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  );
};

export default TransportEntryPage;
