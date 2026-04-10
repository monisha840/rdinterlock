import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Truck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  CreditCard,
  DollarSign
} from "lucide-react";
import { transportApi } from "@/api/transport.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { DragScrollContainer } from "@/components/DragScrollContainer";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const VehiclesPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  const [deleteVehicleId, setDeleteVehicleId] = useState<string | null>(null);
  const [deleteEmiId, setDeleteEmiId] = useState<string | null>(null);
  
  // Form State
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [vehicleType, setVehicleType] = useState<"COMPANY" | "VENDOR">("COMPANY");
  const [ownerName, setOwnerName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");

  // Queries
  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["transport-vehicles"],
    queryFn: () => transportApi.getVehicles(),
  });

  // Mutations
  const mutation = useMutation({
    mutationFn: (data: any) => 
      editingVehicle 
        ? transportApi.updateVehicle(editingVehicle.id, data)
        : transportApi.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport-vehicles"] });
      toast.success(editingVehicle ? "Vehicle updated" : "Vehicle added");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Operation failed");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => transportApi.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport-vehicles"] });
      toast.success("Vehicle deleted");
    }
  });

  const resetForm = () => {
    setVehicleNumber("");
    setVehicleType("COMPANY");
    setOwnerName("");
    setDriverName("");
    setStatus("ACTIVE");
    setEditingVehicle(null);
  };

  const handleEdit = (vehicle: any) => {
    setEditingVehicle(vehicle);
    setVehicleNumber(vehicle.vehicleNumber);
    setVehicleType(vehicle.vehicleType);
    setOwnerName(vehicle.ownerName);
    setDriverName(vehicle.driverName || "");
    setStatus(vehicle.status);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      vehicleNumber,
      vehicleType,
      ownerName,
      driverName,
      status
    });
  };

  // --- EMI Logic ---
  const [isEmiDialogOpen, setIsEmiDialogOpen] = useState(false);
  const [editingEmi, setEditingEmi] = useState<any>(null);
  const [emiForm, setEmiForm] = useState({
    vehicleId: "",
    amount: "",
    dueDate: new Date().toISOString().split("T")[0],
    notes: ""
  });
  const [isPayEmiDialogOpen, setIsPayEmiDialogOpen] = useState(false);
  const [payEmiForm, setPayEmiForm] = useState({
    id: "",
    paidDate: new Date().toISOString().split("T")[0],
    paymentMode: "BANK",
    notes: "",
    syncToCashBook: true
  });

  const { data: emis = [], isLoading: isLoadingEmis } = useQuery({
    queryKey: ["vehicle-emis"],
    queryFn: () => transportApi.getEmis(),
  });

  const emiMutation = useMutation({
    mutationFn: (data: any) => editingEmi
      ? transportApi.updateEmi(editingEmi.id, data)
      : transportApi.createEmi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-emis"] });
      toast.success(editingEmi ? "EMI record updated" : "EMI record created");
      setIsEmiDialogOpen(false);
      setEditingEmi(null);
      setEmiForm({ vehicleId: "", amount: "", dueDate: new Date().toISOString().split("T")[0], notes: "" });
    }
  });

  const handleEditEmi = (emi: any) => {
    setEditingEmi(emi);
    setEmiForm({
      vehicleId: emi.vehicleId,
      amount: String(emi.amount),
      dueDate: new Date(emi.dueDate).toISOString().split("T")[0],
      notes: emi.notes || ""
    });
    setIsEmiDialogOpen(true);
  };

  const payEmiMutation = useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => transportApi.updateEmi(id, { ...data, status: 'PAID' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-emis"] });
      toast.success("EMI payment recorded");
      setIsPayEmiDialogOpen(false);
    }
  });

  const deleteEmiMutation = useMutation({
    mutationFn: (id: string) => transportApi.deleteEmi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-emis"] });
      toast.success("EMI record deleted");
    }
  });

  const companyVehicles = vehicles.filter(v => v.vehicleType === "COMPANY");

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500 pb-safe">
      {/* Header section with responsive flex */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-primary flex items-center gap-3">
            <Truck className="h-7 w-7 md:h-8 md:w-8 text-primary shrink-0" />
            Fleets & EMIs
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Manage fleet records and vehicle EMI payments</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Dialog open={isEmiDialogOpen} onOpenChange={(open) => { setIsEmiDialogOpen(open); if (!open) { setEditingEmi(null); setEmiForm({ vehicleId: "", amount: "", dueDate: new Date().toISOString().split("T")[0], notes: "" }); } }}>
            <DialogTrigger asChild>
              <button onClick={() => { setEditingEmi(null); setEmiForm({ vehicleId: "", amount: "", dueDate: new Date().toISOString().split("T")[0], notes: "" }); }} className="h-10 px-4 rounded-xl border border-primary/20 bg-background hover:bg-muted transition-all flex items-center gap-2 text-sm font-bold shadow-sm active:scale-95">
                <CreditCard className="h-4 w-4 text-primary" />
                Schedule EMI
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95 max-w-[95vw] sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-black text-primary">{editingEmi ? "Edit EMI Record" : "Schedule Vehicle EMI"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();
                emiMutation.mutate({ ...emiForm, amount: parseFloat(emiForm.amount) });
              }} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Select Vehicle</label>
                  <Select value={emiForm.vehicleId} onValueChange={(v) => setEmiForm({ ...emiForm, vehicleId: v })}>
                    <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/10">
                      <SelectValue placeholder="Choose a company vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {companyVehicles.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>{v.vehicleNumber}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-muted-foreground font-bold">₹</span>
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={emiForm.amount}
                        onChange={(e) => setEmiForm({ ...emiForm, amount: e.target.value })}
                        className="h-11 pl-9 rounded-xl bg-background/50 border-primary/10 text-base"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Due Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="date"
                        value={emiForm.dueDate}
                        onChange={(e) => setEmiForm({ ...emiForm, dueDate: e.target.value })}
                        className="h-11 pl-9 rounded-xl bg-background/50 border-primary/10 text-base"
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Notes</label>
                  <Input 
                    placeholder="e.g. Monthly installment"
                    value={emiForm.notes}
                    onChange={(e) => setEmiForm({ ...emiForm, notes: e.target.value })}
                    className="h-11 rounded-xl bg-background/50 border-primary/10 text-base"
                  />
                </div>
                <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
                  <Button type="submit" disabled={emiMutation.isPending} className="w-full rounded-xl h-12 text-base font-bold">
                    {emiMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingEmi ? "Save Changes" : "Schedule EMI"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <button className="h-10 px-4 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center gap-2 text-sm font-bold shadow-lg shadow-primary/20 active:scale-95">
                <Plus className="h-4 w-4" />
                Add Vehicle
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95 max-w-[95vw] sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-xl md:text-2xl font-black text-primary">
                  {editingVehicle ? "Edit Vehicle" : "Add Vehicle"}
                </DialogTitle>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Vehicle Number</label>
                  <Input 
                    placeholder="e.g. TN-01-AB-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    className="h-11 rounded-xl bg-background/50 border-primary/10 text-base uppercase"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Type</label>
                    <Select value={vehicleType} onValueChange={(v: any) => setVehicleType(v)}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPANY">Company (RD)</SelectItem>
                        <SelectItem value="VENDOR">Vendor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Status</label>
                    <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                      <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="INACTIVE">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Owner Name</label>
                  <Input 
                    placeholder="e.g. RD Interlock"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="h-11 rounded-xl bg-background/50 border-primary/10 text-base"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Default Driver (Optional)</label>
                  <Input 
                    placeholder="e.g. Mani"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="h-11 rounded-xl bg-background/50 border-primary/10 text-base"
                  />
                </div>

                <DialogFooter className="mt-6">
                  <Button 
                    type="submit" 
                    disabled={mutation.isPending}
                    className="w-full rounded-xl h-12 text-base font-bold shadow-lg shadow-primary/20"
                  >
                    {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Vehicle"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="fleet" className="w-full">
        <TabsList className="bg-secondary/50 p-1 rounded-2xl mb-6 grid grid-cols-2 max-w-sm">
          <TabsTrigger value="fleet" className="rounded-xl px-4 py-2 font-bold text-sm">Fleet Management</TabsTrigger>
          <TabsTrigger value="emis" className="rounded-xl px-4 py-2 font-bold text-sm">EMI Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet" className="space-y-4">
          {/* Mobile View: Stacked Cards */}
          <div className="md:hidden space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
            ) : vehicles.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground italic">No vehicles registered yet.</div>
            ) : (
              vehicles.map((v: any) => (
                <div key={v.id} className="card-modern p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="text-lg font-black text-primary tracking-tight leading-none mb-2">{v.vehicleNumber}</p>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={v.vehicleType === "COMPANY" ? "default" : "secondary"} className="rounded-lg text-[10px] font-black tracking-tight">
                          {v.vehicleType}
                        </Badge>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary text-[10px] font-bold">
                          <div className={`h-1.5 w-1.5 rounded-full ${v.status === "ACTIVE" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500"}`} />
                          {v.status}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 bg-secondary/50 rounded-xl" onClick={() => handleEdit(v)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 bg-destructive/5 text-destructive rounded-xl hover:bg-destructive/10" onClick={() => {
                        setDeleteVehicleId(v.id);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/30">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Owner</p>
                      <p className="text-sm font-semibold truncate leading-tight">{v.ownerName}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Driver</p>
                      <p className="text-sm font-medium text-foreground truncate">{v.driverName || "Not assigned"}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Interactive Table */}
          <div className="hidden md:block">
            <DragScrollContainer showHint className="rounded-2xl border border-border/50 shadow-xl overflow-hidden bg-card/30 backdrop-blur-sm">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/50">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Vehicle Number</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Type</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Owner</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Driver</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-center h-12">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right h-12 px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" />
                      </TableCell>
                    </TableRow>
                  ) : vehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                        No vehicles registered yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicles.map((v: any) => (
                      <TableRow key={v.id} className="group hover:bg-muted/30 border-border/50 transition-colors">
                        <TableCell className="font-black text-primary whitespace-nowrap uppercase">{v.vehicleNumber}</TableCell>
                        <TableCell>
                          <Badge variant={v.vehicleType === "COMPANY" ? "default" : "secondary"} className="rounded-lg text-[10px] font-black tracking-tight uppercase">
                            {v.vehicleType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{v.ownerName}</TableCell>
                        <TableCell className="text-muted-foreground font-medium text-sm whitespace-nowrap">{v.driverName || "-"}</TableCell>
                        <TableCell className="text-center">
                          {v.status === "ACTIVE" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-full h-2 w-2 p-0 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                          ) : (
                            <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 rounded-full h-2 w-2 p-0" />
                          )}
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-background shadow-sm border border-transparent hover:border-border" onClick={() => handleEdit(v)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-xl hover:bg-destructive/10" onClick={() => {
                              setDeleteVehicleId(v.id);
                            }}>
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
        </TabsContent>

        <TabsContent value="emis" className="space-y-4">
          {/* Mobile View: EMI Cards */}
          <div className="md:hidden space-y-3">
             {isLoadingEmis ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" /></div>
              ) : emis.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground italic">No EMI records found.</div>
              ) : (
                emis.map((emi: any) => (
                  <div key={emi.id} className="card-modern p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-black text-primary leading-tight mb-1 uppercase">{emi.vehicle?.vehicleNumber}</p>
                        <div className="flex items-center gap-1.5">
                           <Badge variant={emi.status === 'PAID' ? 'default' : 'outline'} className={`rounded-xl px-2 py-0.5 text-[10px] font-black ${emi.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}`}>
                              {emi.status}
                            </Badge>
                            {emi.status === 'PENDING' && new Date(emi.dueDate) < new Date() && (
                              <span className="text-[10px] font-black text-destructive uppercase animate-pulse">Overdue</span>
                            )}
                        </div>
                      </div>
                      <p className="text-lg font-black tracking-tighter text-foreground whitespace-nowrap">₹{emi.amount.toLocaleString()}</p>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-y border-border/30">
                       <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Due: {new Date(emi.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                       </div>
                       {emi.paidDate && (
                         <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Paid: {new Date(emi.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                         </div>
                       )}
                    </div>

                    <div className="flex gap-2">
                      {emi.status === 'PENDING' && (
                        <button
                          onClick={() => { setPayEmiForm({ ...payEmiForm, id: emi.id }); setIsPayEmiDialogOpen(true); }}
                          className="flex-1 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                        >
                          Pay EMI Now
                        </button>
                      )}
                      <Button variant="ghost" size="icon" className="h-10 w-10 bg-secondary/50 rounded-xl" onClick={() => handleEditEmi(emi)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-10 w-10 bg-destructive/5 text-destructive rounded-xl hover:bg-destructive/10" onClick={() => {
                        setDeleteEmiId(emi.id);
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
          </div>

          {/* Desktop View: EMI Table */}
          <div className="hidden md:block">
            <DragScrollContainer showHint className="rounded-2xl border border-border/50 shadow-xl overflow-hidden bg-card/30 backdrop-blur-sm">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/50">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Vehicle</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Amount</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Due Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest h-12">Paid Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right h-12 px-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingEmis ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" />
                      </TableCell>
                    </TableRow>
                  ) : emis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">
                        No EMI records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    emis.map((emi: any) => (
                      <TableRow key={emi.id} className="group hover:bg-muted/30 border-border/50 transition-colors">
                        <TableCell className="font-black text-primary whitespace-nowrap uppercase">{emi.vehicle?.vehicleNumber}</TableCell>
                        <TableCell className="font-black text-base whitespace-nowrap">₹{emi.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm font-semibold whitespace-nowrap">
                          {new Date(emi.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          {emi.status === 'PENDING' && new Date(emi.dueDate) < new Date() && (
                            <span className="ml-2 text-destructive font-black text-[10px] uppercase tracking-tighter bg-destructive/10 px-1.5 py-0.5 rounded-lg">Overdue</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={emi.status === 'PAID' ? 'default' : 'outline'} className={`rounded-xl px-2 py-0.5 text-[10px] font-black tracking-tight ${emi.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}`}>
                            {emi.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground font-medium text-sm whitespace-nowrap">
                          {emi.paidDate ? new Date(emi.paidDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            {emi.status === 'PENDING' && (
                              <button
                                onClick={() => { setPayEmiForm({ ...payEmiForm, id: emi.id }); setIsPayEmiDialogOpen(true); }}
                                className="h-8 px-3 rounded-xl text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 text-xs font-black"
                              >
                                Pay Now
                              </button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-background shadow-sm border border-transparent hover:border-border" onClick={() => handleEditEmi(emi)}>
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-xl hover:bg-destructive/10" onClick={() => {
                              setDeleteEmiId(emi.id);
                            }}>
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
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      <Dialog open={isPayEmiDialogOpen} onOpenChange={setIsPayEmiDialogOpen}>
        <DialogContent className="rounded-2xl border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95 max-w-[95vw] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl md:text-2xl font-black text-primary">Record EMI Payment</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            payEmiMutation.mutate({ id: payEmiForm.id, data: payEmiForm });
          }} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Payment Date</label>
                <Input 
                  type="date"
                  value={payEmiForm.paidDate}
                  onChange={(e) => setPayEmiForm({ ...payEmiForm, paidDate: e.target.value })}
                  className="h-11 rounded-xl bg-background/50 border-primary/10 text-base"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Mode</label>
                <Select value={payEmiForm.paymentMode} onValueChange={(v) => setPayEmiForm({ ...payEmiForm, paymentMode: v })}>
                  <SelectTrigger className="h-11 rounded-xl bg-background/50 border-primary/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Notes</label>
              <Input 
                placeholder="Transaction ID or notes"
                value={payEmiForm.notes}
                onChange={(e) => setPayEmiForm({ ...payEmiForm, notes: e.target.value })}
                className="h-11 rounded-xl bg-background/50 border-primary/10 text-base"
              />
            </div>
            <div className="flex items-center gap-2 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <input 
                type="checkbox"
                id="syncCashBook"
                checked={payEmiForm.syncToCashBook}
                onChange={(e) => setPayEmiForm({ ...payEmiForm, syncToCashBook: e.target.checked })}
                className="h-5 w-5 rounded-md border-primary/30 text-primary focus:ring-primary/20 bg-background cursor-pointer"
              />
              <label htmlFor="syncCashBook" className="text-sm font-bold text-primary cursor-pointer select-none">Sync to Cash Book as Expense</label>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={payEmiMutation.isPending} className="w-full rounded-xl h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                {payEmiMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Vehicle Delete Confirm */}
      {deleteVehicleId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-[380px] rounded-3xl p-6 shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-bold mb-2">Delete Vehicle?</h2>
            <p className="text-sm text-muted-foreground mb-5">This will permanently remove this vehicle and related data.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteVehicleId(null)} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Cancel</button>
              <button onClick={() => { deleteMutation.mutate(deleteVehicleId); setDeleteVehicleId(null); }} className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* EMI Delete Confirm */}
      {deleteEmiId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-[380px] rounded-3xl p-6 shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
            <h2 className="text-lg font-bold mb-2">Delete EMI Record?</h2>
            <p className="text-sm text-muted-foreground mb-5">This will permanently remove this EMI record.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteEmiId(null)} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Cancel</button>
              <button onClick={() => { deleteEmiMutation.mutate(deleteEmiId); setDeleteEmiId(null); }} className="flex-1 h-11 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehiclesPage;
