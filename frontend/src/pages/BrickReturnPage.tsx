import { useState } from "react";
import { MobileFormLayout, FormField, BigNumberInput } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { DatePickerField } from "@/components/DatePickerField";
import { toast } from "sonner";
import { Save, RotateCcw, Loader2, Search, Truck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { returnsApi } from "@/api/returns.api";
import { dispatchApi } from "@/api/dispatch.api";
import { format } from "date-fns";

const BrickReturnPage = () => {
  // Page to record brick returns from customers
  const queryClient = useQueryClient();
  const [returnDate, setReturnDate] = useState(new Date());
  const [dispatchId, setDispatchId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Queries
  const { data: dispatches = [], isLoading: isLoadingDispatches } = useQuery({
    queryKey: ["dispatches-search", searchQuery],
    queryFn: () => dispatchApi.getAll(), // In a real app, maybe search by customer name/order ID
    enabled: !!searchQuery || !!dispatchId,
  });

  const selectedDispatch = dispatches.find((d: any) => d.id === dispatchId);

  // Mutations
  const createReturnMutation = useMutation({
    mutationFn: (data: any) => returnsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brick-returns"] });
      queryClient.invalidateQueries({ queryKey: ["ready-stock"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      toast.success("✅ Return Recorded Successfully");
      setDispatchId("");
      setQuantity("");
      setReason("");
      setSearchQuery("");
    },
    onError: (error: any) => {
      toast.error("❌ Failed to save return", {
        description: error.response?.data?.message || error.message,
      });
    },
  });

  const saveReturn = () => {
    if (!dispatchId || !quantity) {
      toast.error("Please select a dispatch and enter quantity");
      return;
    }

    createReturnMutation.mutate({
      date: format(returnDate, 'yyyy-MM-dd'),
      dispatchId,
      returnedQuantity: parseInt(quantity),
      reason,
    });
  };

  return (
    <MobileFormLayout title="🔄 Brick Returns">
      <EntryCard title="Record Return">
        <div className="space-y-5">
          <DatePickerField label="Return Date" date={returnDate} onDateChange={setReturnDate} />

          <FormField label="Search Dispatch (by Customer)">
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer name..."
                className="w-full h-12 pl-10 pr-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary outline-none"
              />
              <Search className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground" />
            </div>
          </FormField>

          {searchQuery && (
            <div className="space-y-2 max-h-48 overflow-y-auto p-1">
              {dispatches
                .filter((d: any) => d.customer.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => {
                      setDispatchId(d.id);
                      setSearchQuery("");
                    }}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      dispatchId === d.id ? 'bg-primary/10 border-primary shadow-sm' : 'bg-card border-border hover:border-primary/40'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-sm">{d.customer.name}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {format(new Date(d.date), "dd MMM yyyy")} • {d.brickType.size}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm text-primary">{d.quantity.toLocaleString()}</p>
                        <p className="text-[8px] text-muted-foreground uppercase">Dispatched</p>
                      </div>
                    </div>
                  </button>
                ))}
              {dispatches.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-4 italic">No matching dispatches found</p>
              )}
            </div>
          )}

          {selectedDispatch && (
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Selected Dispatch</p>
                  <p className="font-bold text-sm">{selectedDispatch.customer.name}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-white/50 p-2 rounded-lg">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Brick Type</p>
                  <p className="font-medium">{selectedDispatch.brickType.size}</p>
                </div>
                <div className="bg-white/50 p-2 rounded-lg">
                  <p className="text-[8px] font-bold text-muted-foreground uppercase">Dispatched Qty</p>
                  <p className="font-medium">{selectedDispatch.quantity.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          <FormField label="Returned Quantity" required>
            <BigNumberInput
              value={quantity}
              onChange={setQuantity}
              placeholder="How many bricks returned?"
              max={selectedDispatch ? selectedDispatch.quantity : undefined}
            />
          </FormField>

          <FormField label="Reason for Return">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Damaged during transit, excess bricks, etc."
              className="w-full p-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary outline-none min-h-[80px]"
            />
          </FormField>

          <div className="sticky bottom-20 md:bottom-4 z-10 pt-2">
            <ActionButton
              label={createReturnMutation.isPending ? "Recording..." : "Record Return"}
              icon={createReturnMutation.isPending ? Loader2 : RotateCcw}
              variant="primary"
              size="lg"
              onClick={saveReturn}
              className="w-full shadow-lg"
              disabled={createReturnMutation.isPending || !dispatchId}
            />
          </div>
        </div>
      </EntryCard>
    </MobileFormLayout>
  );
};

export default BrickReturnPage;
