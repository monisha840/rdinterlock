import { useState, useMemo } from "react";
import { format, isBefore, startOfDay } from "date-fns";
import { MobileFormLayout, FormField, BigNumberInput } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { DatePickerField } from "@/components/DatePickerField";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";
import { Save, Truck, Plus, CalendarClock, AlertTriangle, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { dispatchApi, customersApi } from "@/api/dispatch.api";
import { stockApi } from "@/api/stock.api";
import { settingsApi } from "@/api/settings.api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const DispatchPage = () => {
  const queryClient = useQueryClient();
  const [orderDate, setOrderDate] = useState(new Date());
  const [deliveryDate, setDeliveryDate] = useState(new Date());
  const [customerId, setCustomerId] = useState("");
  const [brickTypeId, setBrickTypeId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "PAID" | "PARTIAL">("PENDING");
  const [paidAmount, setPaidAmount] = useState("");

  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerLocation, setNewCustomerLocation] = useState("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);

  const today = startOfDay(new Date());

  // Queries
  const { data: customers = [], isLoading: isLoadingCustomers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.getAll(),
  });

  const { data: dispatches = [], isLoading: isLoadingDispatches } = useQuery({
    queryKey: ["dispatches"],
    queryFn: () => dispatchApi.getAll(),
  });

  const { data: metaData } = useQuery({
    queryKey: ["form-metadata"],
    queryFn: () => settingsApi.getFormMetadata(),
  });

  const { data: readyStock = [] } = useQuery({
    queryKey: ["ready-stock"],
    queryFn: () => stockApi.getReady(),
  });

  // Mutations
  const createDispatchMutation = useMutation({
    mutationFn: (data: any) => dispatchApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["ready-stock"] });
      queryClient.invalidateQueries({ queryKey: ["cash-entries"] });
      queryClient.invalidateQueries({ queryKey: ["cash-balance"] });
      toast.success("✅ Order Saved");
      setCustomerId("");
      setQuantity("");
      setPaidAmount("");
      setTotalAmount("");
      setPaymentStatus("PENDING");
    },
    onError: () => toast.error("❌ Failed to save order"),
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => customersApi.create(data),
    onSuccess: (newCust) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCustomerId(newCust.id);
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerLocation("");
      setCustomerDialogOpen(false);
      toast.success("✅ Customer Added");
    },
    onError: () => toast.error("❌ Failed to add customer"),
  });

  const saveDispatch = () => {
    if (!customerId || !quantity || !brickTypeId) {
      toast.error("Please fill all required fields");
      return;
    }
    createDispatchMutation.mutate({
      date: orderDate.toISOString(),
      customerId,
      brickTypeId,
      quantity: parseInt(quantity),
      totalAmount: parseFloat(totalAmount || "0"),
      paidAmount: parseFloat(paidAmount || (paymentStatus === "PAID" ? totalAmount : "0")),
      paymentStatus,
      vehicleType: "OWN", // Default for now
      transportCost: 0,
      loadingCost: 0,
      distanceKm: 0,
    });
  };

  const saveNewCustomer = () => {
    if (!newCustomerName.trim()) return;
    createCustomerMutation.mutate({
      name: newCustomerName.trim(),
      phone: newCustomerPhone.trim() || undefined,
      address: newCustomerLocation.trim() || undefined,
    });
  };

  const pendingDispatches = dispatches.filter(d => d.paymentStatus === "PENDING" || d.paidAmount < d.totalAmount);
  const overdueDispatches = pendingDispatches.filter(d => isBefore(new Date(d.date), today)); // In a real app, use deliveryDate if schema had it
  const upcomingDispatches = pendingDispatches.filter(d => !isBefore(new Date(d.date), today));

  if (isLoadingDispatches || isLoadingCustomers) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MobileFormLayout title="🚚 Dispatch">
      {/* Ready Stock Summary */}
      {readyStock.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
          {readyStock.map((stock: any) => (
            <div key={stock.brickType.id} className="flex-1 min-w-[140px] p-3 bg-primary/5 border border-primary/10 rounded-2xl shrink-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground whitespace-nowrap">
                {stock.brickType.size} Available
              </p>
              <p className="text-xl font-bold text-primary">{stock.currentStock.toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Pending Orders Summary */}
      {pendingDispatches.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="p-4 bg-warning/8 border border-warning/20 rounded-2xl">
            <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
            <p className="text-2xl font-bold text-warning">{pendingDispatches.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ₹{pendingDispatches.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0).toLocaleString()} due
            </p>
          </div>
          {overdueDispatches.length > 0 && (
            <div className="p-4 bg-destructive/8 border border-destructive/20 rounded-2xl">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                <p className="text-xs font-medium text-destructive">Pending</p>
              </div>
              <p className="text-2xl font-bold text-destructive">{overdueDispatches.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Payment pending</p>
            </div>
          )}
        </div>
      )}

      <EntryCard title="Customer Order">
        <div className="space-y-5">
          <FormField label="Customer Name" required>
            <div className="flex gap-2">
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="flex-1 h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Select customer...</option>
                {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                <DialogTrigger asChild>
                  <button className="h-12 w-12 rounded-xl gradient-primary text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform touch-target">
                    <Plus className="h-5 w-5" />
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-sm rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <FormField label="Customer Name" required>
                      <input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Customer name"
                        className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none" />
                    </FormField>
                    <FormField label="Phone (optional)">
                      <input value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} placeholder="Phone number" inputMode="tel"
                        className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none" />
                    </FormField>
                    <FormField label="Location (optional)">
                      <input value={newCustomerLocation} onChange={(e) => setNewCustomerLocation(e.target.value)} placeholder="City or area"
                        className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none" />
                    </FormField>
                    <ActionButton
                      label="Save Customer"
                      icon={Save}
                      variant="success"
                      size="lg"
                      onClick={saveNewCustomer}
                      className="w-full"
                      disabled={createCustomerMutation.isPending}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </FormField>

          <FormField label="Brick Size" required>
            <div className="grid grid-cols-2 gap-2">
              {metaData?.brickTypes.map((type: any) => (
                <ActionButton
                  key={type.id}
                  label={type.size}
                  variant="outline"
                  active={brickTypeId === type.id}
                  onClick={() => setBrickTypeId(type.id)}
                />
              ))}
            </div>
          </FormField>

          <FormField label="Bricks Ordered" required>
            <BigNumberInput value={quantity} onChange={setQuantity} placeholder="How many bricks?" />
          </FormField>

          <FormField label="Total Amount (₹)">
            <BigNumberInput value={totalAmount} onChange={setTotalAmount} placeholder="Order value" />
          </FormField>

          <DatePickerField label="Dispatch Date" date={orderDate} onDateChange={setOrderDate} />

          <FormField label="Payment Status">
            <div className="grid grid-cols-3 gap-2">
              <ActionButton label="⏳ Pending" variant="outline" active={paymentStatus === "PENDING"} onClick={() => setPaymentStatus("PENDING")} />
              <ActionButton label="🌗 Partial" variant="outline" active={paymentStatus === "PARTIAL"} onClick={() => setPaymentStatus("PARTIAL")} />
              <ActionButton label="✅ Paid" variant="outline" active={paymentStatus === "PAID"} onClick={() => setPaymentStatus("PAID")} />
            </div>
          </FormField>

          <FormField label="Amount Received (₹)">
            <BigNumberInput value={paidAmount} onChange={setPaidAmount} placeholder="Amount paid..." />
          </FormField>

          <div className="sticky bottom-20 md:bottom-4 z-10 pt-2">
            <ActionButton
              label={createDispatchMutation.isPending ? "Saving..." : "Save Order"}
              icon={Save}
              variant="success"
              size="lg"
              onClick={saveDispatch}
              className="w-full shadow-lg"
              disabled={createDispatchMutation.isPending}
            />
          </div>
        </div>
      </EntryCard>

      {/* Pending Dispatches */}
      {pendingDispatches.length > 0 && (
        <EntryCard title={`⏳ Pending Payments (${pendingDispatches.length})`}>
          <div className="space-y-3">
            {pendingDispatches.map((d, i) => {
              const outstanding = d.totalAmount - d.paidAmount;
              const percentPaid = d.totalAmount > 0 ? (d.paidAmount / d.totalAmount) * 100 : 0;
              const isPartial = d.paidAmount > 0 && d.paidAmount < d.totalAmount;

              return (
                <div key={d.id} className="p-3.5 rounded-xl border bg-warning/5 border-warning/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm text-foreground">{d.customer.name}</p>
                    <StatusBadge
                      label={isPartial ? "Partial" : "Pending"}
                      variant={isPartial ? "warning" : "destructive"}
                    />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                    <span>{d.quantity.toLocaleString()} • {d.brickType.size}</span>
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Ordered: {format(new Date(d.date), "dd MMM yyyy")}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      <span>Paid: ₹{d.paidAmount.toLocaleString()}</span>
                      <span>Total: ₹{d.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-warning transition-all duration-500"
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>
                    <p className="text-xs font-bold text-destructive">
                      ₹{outstanding.toLocaleString()} remaining
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </EntryCard>
      )}

      {/* All Dispatches */}
      <EntryCard title="Recent Dispatches">
        <div className="space-y-3">
          {dispatches.map((d: any) => (
            <div key={d.id} className="flex items-center gap-3 p-3.5 bg-secondary/30 rounded-xl hover:bg-secondary/50 transition-colors">
              <div className="h-10 w-10 rounded-xl bg-primary/8 flex items-center justify-center shrink-0">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{d.customer.name}</p>
                <p className="text-xs text-muted-foreground">{d.quantity.toLocaleString()} • {d.brickType.size} • {format(new Date(d.date), "dd MMM")}</p>
              </div>
              <div className="text-right space-y-1">
                <StatusBadge
                  label={d.paymentStatus === "PAID" ? "Paid" : d.paymentStatus === "PARTIAL" ? "Partial" : "Pending"}
                  variant={d.paymentStatus === "PAID" ? "success" : d.paymentStatus === "PARTIAL" ? "warning" : "destructive"}
                />
                {d.totalAmount > 0 && <p className="text-xs font-medium text-foreground">₹{d.totalAmount.toLocaleString()}</p>}
              </div>
            </div>
          ))}
        </div>
      </EntryCard>
    </MobileFormLayout>
  );
};

export default DispatchPage;
