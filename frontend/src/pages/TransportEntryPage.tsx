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
          <DialogContent className="max-w-2xl rounded-2xl border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-primary flex items-center gap-2">
                <Truck className="h-6 w-6" /> Create Transport Entry
              </DialogTitle>
              <DialogDescription>Record a new transport activity. Fill in the details below.</DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Date</label>
                  <Input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11 rounded-xl bg-background/50 border-primary/10 focus:ring-primary/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Transport Type</label>
                  <Tabs 
                    defaultValue="RD_VEHICLE" 
                    className="w-full"
                    onValueChange={(v: any) => {
                      setTransportType(v);
                      setTransactionType(v === "RD_VEHICLE" ? "EXPENSE" : "INCOME");
                      resetForm();
                    }}
                  >
                    <TabsList className="grid grid-cols-2 h-11 p-1 bg-muted/50 rounded-xl">
                      <TabsTrigger value="RD_VEHICLE" className="rounded-lg font-bold text-xs uppercase tracking-tight">RD Vehicle</TabsTrigger>
                      <TabsTrigger value="VENDOR_VEHICLE" className="rounded-lg font-bold text-xs uppercase tracking-tight">Vendor Vehicle</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Select Vehicle</label>
                  <Select onValueChange={setVehicleId} value={vehicleId}>
                    <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/10">
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
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Driver Name</label>
                    <Input 
                      placeholder="e.g. Mani"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="h-11 rounded-xl bg-background/50 border-primary/10"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Select Vendor</label>
                    <Select onValueChange={setVendorId} value={vendorId}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/10">
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
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Load Count</label>
                  <Input 
                    type="number"
                    min="1"
                    value={loads}
                    onChange={(e) => setLoads(Number(e.target.value))}
                    className="h-11 rounded-xl bg-background/50 border-primary/10"
                  />
                </div>

                {transportType === "RD_VEHICLE" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 text-primary/80">Diesel Cost (₹)</label>
                      <Input 
                        type="number"
                        value={dieselCost === 0 ? "" : dieselCost}
                        onChange={(e) => setDieselCost(Number(e.target.value))}
                        className="h-11 rounded-xl bg-primary/5 border-primary/20 font-bold"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Other Expense (₹)</label>
                      <Input 
                        type="number"
                        value={otherExpense === 0 ? "" : otherExpense}
                        onChange={(e) => setOtherExpense(Number(e.target.value))}
                        className="h-11 rounded-xl bg-background/50 border-primary/10"
                        placeholder="0"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1 text-success/80">Rent Per Load (₹)</label>
                      <Input 
                        type="number"
                        value={rentPerLoad === 0 ? "" : rentPerLoad}
                        onChange={(e) => setRentPerLoad(Number(e.target.value))}
                        className="h-11 rounded-xl bg-success/5 border-success/20 font-bold"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Calculated Income (₹)</label>
                      <div className="h-11 px-3 rounded-xl bg-success/10 border border-success/20 flex items-center font-bold text-success">
                        ₹ {loads * rentPerLoad}
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Notes</label>
                <Input 
                  placeholder="Optional notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="h-11 rounded-xl bg-background/50 border-primary/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Load Material</label>
                <Input 
                  placeholder="e.g. Bricks, Sand, Cement..."
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  className="h-11 rounded-xl bg-background/50 border-primary/10"
                />
              </div>

              <div className="flex items-center space-x-2 bg-primary/5 p-4 rounded-xl border border-primary/10">
                <Checkbox 
                  id="sync" 
                  checked={syncToCashBook} 
                  onCheckedChange={(v: any) => setSyncToCashBook(v)} 
                />
                <label htmlFor="sync" className="text-sm font-medium leading-none cursor-pointer">
                  Automatically sync expense to Cash Book
                </label>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-11">Cancel</Button>
                <Button 
                  type="submit" 
                  disabled={createEntryMutation.isPending} 
                  className="rounded-xl h-11 px-8 min-w-[120px]"
                >
                  {createEntryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Entry"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-none shadow-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Truck className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80">Total Loads Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{summary?.totalLoads || 0}</div>
            <p className="text-[10px] mt-1 opacity-70">Across all vehicle types</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-xl bg-gradient-to-br from-rose-500 to-rose-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowUpRight className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80">Transport Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">₹ {summary?.totalExpense?.toLocaleString() || 0}</div>
            <p className="text-[10px] mt-1 opacity-70">Diesel + Other costs</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ArrowDownLeft className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80">Transport Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">₹ {summary?.totalIncome?.toLocaleString() || 0}</div>
            <p className="text-[10px] mt-1 opacity-70">Vendor vehicle rental income</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-xl bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <IndianRupee className="h-24 w-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-80">Net Transport Cost</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">₹ {summary?.netCost?.toLocaleString() || 0}</div>
            <p className="text-[10px] mt-1 opacity-70">Expense - Income</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table View */}
      <Card className="rounded-2xl border-border/50 shadow-xl overflow-hidden bg-background/50 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/20">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Transport Activity Log
            </CardTitle>
            <CardDescription>Recent transport entries and details</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative group">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input 
                placeholder="Search..." 
                className="h-9 w-48 pl-9 rounded-xl text-xs bg-background/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl gap-2 font-bold text-xs uppercase tracking-tight">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[300px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Filter Entries</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Transport Type</label>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="RD_VEHICLE">RD Vehicle</SelectItem>
                        <SelectItem value="VENDOR_VEHICLE">Vendor Vehicle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full rounded-xl" onClick={() => setIsFilterOpen(false)}>Apply Filters</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative w-full overflow-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent border-border/50">
                  <TableHead className="w-[100px] text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Type</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Vehicle</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Material</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Driver / Vendor</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Loads</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right text-rose-500">Expense</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right text-emerald-500">Income</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entriesLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" />
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic font-medium">
                      No transport entries found for today.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((item: any) => (
                    <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors border-border/50">
                      <TableCell className="font-bold text-sm">{format(new Date(item.date), "dd MMM")}</TableCell>
                      <TableCell>
                        <Badge variant={item.transportType === "RD_VEHICLE" ? "secondary" : "outline"} className="rounded-lg text-[10px] font-black px-2 py-0.5">
                          {item.transportType === "RD_VEHICLE" ? "RD" : "VENDOR"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        <div className="flex flex-col">
                          <span className="font-bold">{item.vehicle.vehicleNumber}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{item.vehicle.ownerName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium italic text-muted-foreground">
                        {item.material || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.transportType === "RD_VEHICLE" ? (
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                            {item.driverName || item.vehicle.driverName}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                            {item.vendor?.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-black">
                        {item.loads}
                      </TableCell>
                      <TableCell className="text-right font-bold text-rose-500">
                        {item.expenseAmount > 0 ? `₹ ${item.expenseAmount.toLocaleString()}` : "-"}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-500">
                        {item.incomeAmount > 0 ? `₹ ${item.incomeAmount.toLocaleString()}` : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransportEntryPage;
