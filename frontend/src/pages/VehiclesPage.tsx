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

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
            <Truck className="h-8 w-8 text-primary" />
            Vehicles
          </h1>
          <p className="text-muted-foreground mt-1">Manage fleet and vendor vehicle records</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2">
              <Plus className="h-5 w-5" />
              Add New Vehicle
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
    </div>
  );
};

export default VehiclesPage;
