import { useState } from "react";
import { MobileFormLayout, FormField, BigNumberInput } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { DatePickerField } from "@/components/DatePickerField";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, ArrowDownCircle, ArrowUpCircle, Wallet, Eye, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashApi } from "@/api/cash.api";
import { format } from "date-fns";

const CashBookPage = () => {
  const queryClient = useQueryClient();
  const [entryDate, setEntryDate] = useState(new Date());
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [deductFromBalance, setDeductFromBalance] = useState(true);

  // Queries
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: () => cashApi.getBalance(),
  });

  const { data: entries = [], isLoading: isEntriesLoading } = useQuery({
    queryKey: ['cash-entries'],
    queryFn: () => cashApi.getAll({ startDate: format(new Date(), 'yyyy-MM-dd') }), // Default to today or recent
  });

  // Mutations
  const createEntryMutation = useMutation({
    mutationFn: cashApi.create,
    onSuccess: () => {
      toast.success("✅ Saved Successfully");
      queryClient.invalidateQueries({ queryKey: ['cash-entries'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setAmount("");
      setDescription("");
    },
    onError: (error: any) => {
      toast.error("❌ Failed to save entry", {
        description: error.response?.data?.message || error.message,
      });
    },
  });

  const saveEntry = () => {
    if (!amount || isNaN(parseFloat(amount)) || !description.trim()) {
      toast.error("Please enter a valid amount and description");
      return;
    }

    createEntryMutation.mutate({
      date: format(entryDate, 'yyyy-MM-dd'),
      type: type === "IN" ? "CREDIT" : "DEBIT",
      amount: parseFloat(amount),
      description: description.trim(),
      category: "GENERAL",
    });
  };

  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return format(date, 'dd MMM yyyy');
  };

  return (
    <MobileFormLayout title="💵 Cash Book">
      <KPICard
        title="Current Balance"
        value={isBalanceLoading ? "---" : `₹${balanceData?.balance?.toLocaleString() || 0}`}
        icon={Wallet}
        variant="primary"
      />

      <EntryCard title="New Entry">
        <div className="space-y-5">
          <DatePickerField date={entryDate} onDateChange={setEntryDate} />

          <FormField label="Type">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("IN")}
                className={`h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] touch-target ${type === "IN"
                    ? "bg-success/10 border-2 border-success text-success shadow-sm"
                    : "border border-border bg-card text-foreground hover:border-success/40"
                  }`}
              >
                💰 Money IN
              </button>
              <button
                type="button"
                onClick={() => setType("OUT")}
                className={`h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.97] touch-target ${type === "OUT"
                    ? "bg-destructive/10 border-2 border-destructive text-destructive shadow-sm"
                    : "border border-border bg-card text-foreground hover:border-destructive/40"
                  }`}
              >
                💸 Money OUT
              </button>
            </div>
          </FormField>

          <FormField label="Amount (₹)" required>
            <BigNumberInput value={amount} onChange={setAmount} />
          </FormField>

          <FormField label="Description" required>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this for?"
              className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </FormField>

          {type === "OUT" && (
            <div className="flex items-center gap-2.5 p-3 bg-secondary/50 rounded-xl">
              <Checkbox
                id="deduct-balance"
                checked={deductFromBalance}
                onCheckedChange={(checked) => setDeductFromBalance(checked === true)}
              />
              <label htmlFor="deduct-balance" className="text-sm font-medium text-foreground cursor-pointer">
                Deduct from cash balance
              </label>
            </div>
          )}

          <div className="sticky bottom-20 md:bottom-4 z-10 pt-2">
            <ActionButton
              label={createEntryMutation.isPending ? "Saving..." : "Save Entry"}
              icon={createEntryMutation.isPending ? Loader2 : Save}
              variant="success"
              size="lg"
              onClick={saveEntry}
              className="w-full shadow-lg"
              disabled={createEntryMutation.isPending}
            />
          </div>

          <button className="w-full text-sm text-primary font-medium flex items-center justify-center gap-1.5 py-2 hover:bg-primary/5 rounded-xl transition-colors">
            <Eye className="h-4 w-4" /> View / Edit Entries
          </button>
        </div>
      </EntryCard>

      <EntryCard title="Ledger (Live)">
        <div className="space-y-2">
          {isEntriesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : entries.length > 0 ? (
            entries.map((e, i) => (
              <div key={e.id || i} className="flex items-center gap-3 p-3.5 bg-secondary/30 rounded-xl">
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${e.type === "CREDIT" ? "bg-success/10" : "bg-destructive/10"
                  }`}>
                  {e.type === "CREDIT" ? (
                    <ArrowDownCircle className="h-4 w-4 text-success" />
                  ) : (
                    <ArrowUpCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{e.description}</p>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-primary font-medium">{e.category}</span>
                    {e.date && <span> • {getRelativeDate(e.date)}</span>}
                  </p>
                </div>
                <span className={`text-sm font-bold ${e.type === "CREDIT" ? "text-success" : "text-destructive"}`}>
                  {e.type === "CREDIT" ? "+" : "-"}₹{e.amount.toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <p className="text-center py-8 text-muted-foreground italic text-sm">No entries found for this period.</p>
          )}
        </div>
      </EntryCard>
    </MobileFormLayout>
  );
};

export default CashBookPage;
