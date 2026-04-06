import { useState } from "react";
import { MobileFormLayout, FormField, BigNumberInput } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { KPICard } from "@/components/KPICard";
import { DatePickerField } from "@/components/DatePickerField";
import { toast } from "sonner";
import { Save, Loader2, Wallet, X, Edit2, Trash2, Search, TrendingDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashApi } from "@/api/cash.api";
import { format } from "date-fns";

const ExpensesPage = () => {
  const queryClient = useQueryClient();

  // Form state
  const [entryDate, setEntryDate] = useState(new Date());
  const [spentFor, setSpentFor] = useState("");
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  // Fetch only DEBIT (expense) entries
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["expense-entries", filterStartDate, filterEndDate, searchQuery],
    queryFn: () => cashApi.getAll({
      type: "DEBIT",
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
      search: searchQuery || undefined,
    }),
  });

  const { data: balanceData } = useQuery({
    queryKey: ["cash-balance"],
    queryFn: () => cashApi.getBalance(),
  });

  // Create
  const createMut = useMutation({
    mutationFn: (data: any) => cashApi.create(data),
    onSuccess: () => {
      toast.success("Expense saved");
      queryClient.invalidateQueries({ queryKey: ["expense-entries"] });
      queryClient.invalidateQueries({ queryKey: ["cash-balance"] });
      queryClient.invalidateQueries({ queryKey: ["cash-entries"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      resetForm();
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  // Update
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => cashApi.update(id, data),
    onSuccess: () => {
      toast.success("Expense updated");
      queryClient.invalidateQueries({ queryKey: ["expense-entries"] });
      queryClient.invalidateQueries({ queryKey: ["cash-balance"] });
      queryClient.invalidateQueries({ queryKey: ["cash-entries"] });
      resetForm();
    },
    onError: (e: any) => toast.error("Failed", { description: e.message }),
  });

  // Delete
  const deleteMut = useMutation({
    mutationFn: (id: string) => cashApi.delete(id),
    onSuccess: () => {
      toast.success("Expense deleted");
      queryClient.invalidateQueries({ queryKey: ["expense-entries"] });
      queryClient.invalidateQueries({ queryKey: ["cash-balance"] });
      queryClient.invalidateQueries({ queryKey: ["cash-entries"] });
    },
  });

  const resetForm = () => {
    setSpentFor("");
    setNotes("");
    setAmount("");
    setPaymentMode("CASH");
    setEditingId(null);
    setEntryDate(new Date());
  };

  const handleSave = () => {
    if (!spentFor.trim() || !amount || parseFloat(amount) <= 0) {
      toast.error("Enter a valid item and amount");
      return;
    }
    const payload = {
      date: format(entryDate, "yyyy-MM-dd"),
      type: "DEBIT" as const,
      amount: parseFloat(amount),
      description: notes.trim() || spentFor.trim(),
      category: spentFor.trim(),
      paymentMode,
    };
    if (editingId) {
      updateMut.mutate({ id: editingId, data: payload });
    } else {
      createMut.mutate(payload);
    }
  };

  const startEdit = (entry: any) => {
    setEditingId(entry.id);
    setEntryDate(new Date(entry.date));
    setSpentFor(entry.category || "");
    setNotes(entry.description || "");
    setAmount(String(entry.amount));
    setPaymentMode(entry.paymentMode || "CASH");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate KPIs
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayTotal = (entries as any[]).filter((e: any) => format(new Date(e.date), "yyyy-MM-dd") === todayStr).reduce((s: number, e: any) => s + e.amount, 0);
  const totalExpenses = (entries as any[]).reduce((s: number, e: any) => s + e.amount, 0);

  const getRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return format(date, "dd MMM yyyy");
  };

  return (
    <MobileFormLayout title="Expense Ledger" subtitle="Track all factory expenses">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 mb-2">
        <KPICard
          title="Today's Expense"
          value={`₹${todayTotal.toLocaleString()}`}
          icon={TrendingDown}
          variant="accent"
        />
        <KPICard
          title="This Month Exp."
          value={`₹${(balanceData?.thisMonthExpenses || 0).toLocaleString()}`}
          icon={Wallet}
          variant="warning"
        />
      </div>

      {/* Entry Form */}
      <EntryCard title={editingId ? "Edit Expense" : "New Expense"}>
        <div className="space-y-4">
          <DatePickerField date={entryDate} onDateChange={setEntryDate} />

          <FormField label="Spent For" required>
            <input
              value={spentFor}
              onChange={(e) => setSpentFor(e.target.value)}
              placeholder="e.g. Bearing, Bolts, Diesel, Welding..."
              className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-sm font-medium focus:border-primary focus:outline-none transition-colors"
            />
          </FormField>

          <FormField label="Amount (₹)" required>
            <BigNumberInput value={amount} onChange={setAmount} />
          </FormField>

          <FormField label="Notes">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Size, quantity, details..."
              className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </FormField>

          <FormField label="Payment Mode">
            <div className="grid grid-cols-4 gap-2">
              {["CASH", "UPI", "BANK", "CHEQUE"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMode(m)}
                  className={`h-10 rounded-xl text-xs font-bold border transition-all ${
                    paymentMode === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </FormField>

          <div className="space-y-2">
            {editingId && (
              <button
                onClick={resetForm}
                className="w-full h-10 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel Editing
              </button>
            )}
            <ActionButton
              label={(createMut.isPending || updateMut.isPending) ? "Saving..." : editingId ? "Update Expense" : "Save Expense"}
              icon={(createMut.isPending || updateMut.isPending) ? Loader2 : Save}
              variant={editingId ? "primary" : "success"}
              size="lg"
              onClick={handleSave}
              className="w-full shadow-lg"
              disabled={createMut.isPending || updateMut.isPending}
            />
          </div>
        </div>
      </EntryCard>

      {/* History */}
      <EntryCard title="Expense History">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by item, amount..."
            className="w-full h-11 pl-10 pr-10 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Date Filters */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">From</label>
            <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-xs focus:border-primary outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">To</label>
            <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-xs focus:border-primary outline-none" />
          </div>
        </div>

        {/* Total */}
        {(entries as any[]).length > 0 && (
          <div className="flex justify-between items-center p-3 bg-destructive/5 border border-destructive/20 rounded-xl mb-4">
            <span className="text-xs font-bold text-muted-foreground uppercase">Total ({(entries as any[]).length} entries)</span>
            <span className="text-base font-black text-destructive">₹{totalExpenses.toLocaleString()}</span>
          </div>
        )}

        {/* Entries List */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (entries as any[]).length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8 italic">No expenses found</p>
          ) : (
            (entries as any[]).map((e: any) => (
              <div key={e.id} className="flex items-center gap-3 p-4 bg-secondary/30 rounded-2xl group border border-transparent hover:border-primary/20 transition-all">
                <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-foreground truncate">{e.category}</p>
                    <span className="text-sm font-black text-destructive shrink-0">₹{e.amount.toLocaleString()}</span>
                  </div>
                  {e.description && e.description !== e.category && (
                    <p className="text-[11px] text-muted-foreground truncate">{e.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <span className="font-medium">{getRelativeDate(e.date)}</span>
                    <span>•</span>
                    <span className="font-semibold text-primary/80">{e.paymentMode}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => startEdit(e)} className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all" title="Edit">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => { if (confirm("Delete this expense?")) deleteMut.mutate(e.id); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </EntryCard>
    </MobileFormLayout>
  );
};

export default ExpensesPage;
