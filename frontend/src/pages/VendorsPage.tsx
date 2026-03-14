import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2,
  Phone,
  MapPin,
  Truck
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

const VendorsPage = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Queries
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["transport-vendors"],
    queryFn: () => transportApi.getVendors(),
  });

  // Mutations
  const mutation = useMutation({
    mutationFn: (data: any) => transportApi.createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transport-vendors"] });
      toast.success("Vendor added successfully");
      setIsDialogOpen(false);
      setName("");
      setPhone("");
      setAddress("");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to add vendor");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ name, phone, address });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-primary flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Transport Vendors
          </h1>
          <p className="text-muted-foreground mt-1">Manage third-party transport partners</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2">
              <Plus className="h-5 w-5" />
              Add Vendor
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-primary">New Transport Vendor</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Vendor Name</label>
                <Input 
                  placeholder="e.g. ABC Transport"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 rounded-xl bg-background/50 border-primary/10"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Phone Number</label>
                <Input 
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 rounded-xl bg-background/50 border-primary/10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Address</label>
                <Input 
                  placeholder="e.g. Chennai, Tamil Nadu"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-11 rounded-xl bg-background/50 border-primary/10"
                />
              </div>

              <DialogFooter className="mt-6">
                <Button 
                  type="submit" 
                  disabled={mutation.isPending}
                  className="w-full rounded-xl h-11"
                >
                  {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Vendor"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-2xl border-border/50 animate-pulse h-48 bg-muted/20" />
          ))
        ) : vendors.length === 0 ? (
          <div className="col-span-full h-48 flex items-center justify-center border-2 border-dashed border-border rounded-2xl text-muted-foreground italic">
            No vendors found. Add one to get started.
          </div>
        ) : (
          vendors.map((vendor: any) => (
            <Card key={vendor.id} className="rounded-2xl border-border/50 shadow-lg hover:shadow-xl transition-all group relative overflow-hidden bg-background/50">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Truck className="h-16 w-16" />
              </div>
              <CardHeader>
                <CardTitle className="text-xl font-black text-primary truncate pr-8">{vendor.name}</CardTitle>
                <Badge variant="secondary" className="w-fit rounded-lg text-[10px] uppercase font-black">Transport Partner</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <span className="font-medium">{vendor.phone || "No phone provided"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <span className="truncate">{vendor.address || "No address provided"}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default VendorsPage;
