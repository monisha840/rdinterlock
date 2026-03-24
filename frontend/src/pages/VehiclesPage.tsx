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
  XCircle
} from "lucide-react";
import { transportApi } from "@/api/transport.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Calendar, CreditCard, DollarSign } from "lucide-react";

const VehiclesPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<any>(null);
  
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
    mutationFn: (data: any) => transportApi.createEmi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-emis"] });
      toast.success("EMI record created");
      setIsEmiDialogOpen(false);
      setEmiForm({ vehicleId: "", amount: "", dueDate: new Date().toISOString().split("T")[0], notes: "" });
    }
  });

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
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary" />
            Fleets & EMIs
          </h1>
          <p className="text-muted-foreground mt-1">Manage fleet records and vehicle EMI payments</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={isEmiDialogOpen} onOpenChange={setIsEmiDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-11 px-6 rounded-xl border-primary/20 gap-2">
                <CreditCard className="h-5 w-5" />
                Schedule EMI
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-primary">Schedule Vehicle EMI</DialogTitle>
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
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="number"
                        placeholder="0.00"
                        value={emiForm.amount}
                        onChange={(e) => setEmiForm({ ...emiForm, amount: e.target.value })}
                        className="h-11 pl-9 rounded-xl bg-background/50 border-primary/10"
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
                        className="h-11 pl-9 rounded-xl bg-background/50 border-primary/10"
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
                    className="h-11 rounded-xl bg-background/50 border-primary/10"
                  />
                </div>
                <DialogFooter className="mt-6">
                  <Button type="submit" disabled={emiMutation.isPending} className="w-full rounded-xl h-11">
                    {emiMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule EMI"}
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
              <Button className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2">
                <Plus className="h-5 w-5" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-primary">
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
                    className="h-11 rounded-xl bg-background/50 border-primary/10"
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
                    className="h-11 rounded-xl bg-background/50 border-primary/10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Default Driver (Optional)</label>
                  <Input 
                    placeholder="e.g. Mani"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    className="h-11 rounded-xl bg-background/50 border-primary/10"
                  />
                </div>

                <DialogFooter className="mt-6">
                  <Button 
                    type="submit" 
                    disabled={mutation.isPending}
                    className="w-full rounded-xl h-11"
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
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="fleet" className="rounded-lg px-6">Fleet Management</TabsTrigger>
          <TabsTrigger value="emis" className="rounded-lg px-6">EMI Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="fleet">
          <Card className="rounded-2xl border-border/50 shadow-xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/50">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Vehicle Number</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Type</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Owner</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Driver</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" />
                      </TableCell>
                    </TableRow>
                  ) : vehicles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                        No vehicles registered yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    vehicles.map((v: any) => (
                      <TableRow key={v.id} className="group hover:bg-muted/20 border-border/50">
                        <TableCell className="font-black text-primary">{v.vehicleNumber}</TableCell>
                        <TableCell>
                          <Badge variant={v.vehicleType === "COMPANY" ? "default" : "secondary"} className="rounded-lg text-[10px] font-black">
                            {v.vehicleType}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{v.ownerName}</TableCell>
                        <TableCell className="text-muted-foreground italic text-sm">{v.driverName || "-"}</TableCell>
                        <TableCell className="text-center">
                          {v.status === "ACTIVE" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-full h-2 w-2 p-0 animate-pulse" />
                          ) : (
                            <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 rounded-full h-2 w-2 p-0" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleEdit(v)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-lg" onClick={() => {
                              if (confirm("Delete this vehicle?")) deleteMutation.mutate(v.id);
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emis">
          <Card className="rounded-2xl border-border/50 shadow-xl overflow-hidden">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="border-border/50">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Vehicle</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Amount</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Due Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Paid Date</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingEmis ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" />
                      </TableCell>
                    </TableRow>
                  ) : emis.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">
                        No EMI records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    emis.map((emi: any) => (
                      <TableRow key={emi.id} className="group hover:bg-muted/20 border-border/50">
                        <TableCell className="font-black text-primary">{emi.vehicle?.vehicleNumber}</TableCell>
                        <TableCell className="font-bold">₹{emi.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-sm font-medium">
                          {new Date(emi.dueDate).toLocaleDateString()}
                          {emi.status === 'PENDING' && new Date(emi.dueDate) < new Date() && (
                            <span className="ml-2 text-destructive font-black text-[10px] uppercase">Overdue</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={emi.status === 'PAID' ? 'default' : 'outline'} className={`rounded-xl px-2 py-0.5 text-[10px] font-black ${emi.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-orange-500/10 text-orange-600 border-orange-500/20'}`}>
                            {emi.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {emi.paidDate ? new Date(emi.paidDate).toLocaleDateString() : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {emi.status === 'PENDING' && (
                              <Button variant="ghost" size="sm" className="h-8 rounded-lg text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10" onClick={() => {
                                setPayEmiForm({ ...payEmiForm, id: emi.id });
                                setIsPayEmiDialogOpen(true);
                              }}>
                                Pay Now
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-lg" onClick={() => {
                              if (confirm("Delete this EMI record?")) deleteEmiMutation.mutate(emi.id);
                            }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Modal */}
      <Dialog open={isPayEmiDialogOpen} onOpenChange={setIsPayEmiDialogOpen}>
        <DialogContent className="rounded-2xl border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-primary">Record EMI Payment</DialogTitle>
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
                  className="h-11 rounded-xl bg-background/50 border-primary/10"
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
                className="h-11 rounded-xl bg-background/50 border-primary/10"
              />
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <input 
                type="checkbox"
                id="syncCashBook"
                checked={payEmiForm.syncToCashBook}
                onChange={(e) => setPayEmiForm({ ...payEmiForm, syncToCashBook: e.target.checked })}
                className="h-4 w-4 rounded border-primary/20"
              />
              <label htmlFor="syncCashBook" className="text-sm font-medium text-primary">Sync to Cash Book as Expense</label>
            </div>
            <DialogFooter className="mt-6">
              <Button type="submit" disabled={payEmiMutation.isPending} className="w-full rounded-xl h-11 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                {payEmiMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Payment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VehiclesPage;
