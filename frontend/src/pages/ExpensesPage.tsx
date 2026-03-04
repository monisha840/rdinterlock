import { useState, useEffect } from "react";
import { MobileFormLayout, FormField, BigNumberInput } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { KPICard } from "@/components/KPICard";
import { DatePickerField } from "@/components/DatePickerField";
import { toast } from "sonner";
import { Save, Fuel, UtensilsCrossed, PackageOpen, MoreHorizontal, Receipt, Eye, Users, Truck, Building, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesApi } from "@/api/expenses.api";
import { settingsApi } from "@/api/settings.api";
import { format } from "date-fns";

const categories = [
  { label: "Fuel", value: "FUEL", icon: Fuel },
  { label: "Food", value: "FOOD", icon: UtensilsCrossed },
  { label: "Material", value: "MATERIAL", icon: PackageOpen },
  { label: "Other", value: "OTHER", icon: MoreHorizontal },
];

const ExpensesPage = () => {
  const queryClient = useQueryClient();
  const [entryDate, setEntryDate] = useState(new Date());
  const [category, setCategory] = useState("FUEL");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [materialQty, setMaterialQty] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");

  const { data: metadata, isLoading: isMetaLoading } = useQuery({
    queryKey: ['form-metadata'],
    queryFn: settingsApi.getFormMetadata,
  });

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary', format(entryDate, 'yyyy-MM-dd')],
    queryFn: () => expensesApi.getSummary({ startDate: format(entryDate, 'yyyy-MM-dd'), endDate: format(entryDate, 'yyyy-MM-dd') }),
  });

  const { data: recentExpenses = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenses-recent', format(entryDate, 'yyyy-MM-dd')],
    queryFn: () => expensesApi.getAll({ startDate: format(entryDate, 'yyyy-MM-dd'), endDate: format(entryDate, 'yyyy-MM-dd') }),
  });

  const createExpenseMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      toast.success("✅ Saved Successfully");
      queryClient.invalidateQueries({ queryKey: ['expenses-recent'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setAmount("");
      setNotes("");
      setSelectedWorker("");
      setMaterialId("");
      setMaterialQty("");
      setPricePerUnit("");
    },
    onError: (error: any) => {
      toast.error("❌ Failed to save expense", {
        description: error.response?.data?.message || error.message,
      });
    },
  });

  const saveExpense = () => {
    if (!amount || isNaN(parseFloat(amount))) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (category === 'MATERIAL' && (!materialId || !materialQty || !pricePerUnit)) {
      toast.error("Please fill all material details");
      return;
    }

    createExpenseMutation.mutate({
      date: format(entryDate, 'yyyy-MM-dd'),
      category: category as any,
      amount: parseFloat(amount),
      notes,
      workerId: selectedWorker || undefined,
      paymentMode: 'CASH',
      materialId: category === 'MATERIAL' ? materialId : undefined,
      quantity: category === 'MATERIAL' ? parseFloat(materialQty) : undefined,
      pricePerUnit: category === 'MATERIAL' ? parseFloat(pricePerUnit) : undefined,
    });
  };

  const todayTotal = recentExpenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <MobileFormLayout title="💰 Expenses">
      <KPICard
        title="Today's Total Expenses"
        value={`₹${todayTotal.toLocaleString()}`}
        icon={Receipt}
        variant="warning"
      />

      <EntryCard title="Add Expense">
        <div className="space-y-5">
          <DatePickerField date={entryDate} onDateChange={setEntryDate} />

          <FormField label="Category">
            <div className="grid grid-cols-4 gap-2">
              {categories.map((c) => (
                <ActionButton
                  key={c.value}
                  label={c.label}
                  icon={c.icon}
                  variant="outline"
                  active={category === c.value}
                  onClick={() => setCategory(c.value)}
                  className="flex-col gap-1 h-auto py-3 text-xs"
                />
              ))}
            </div>
          </FormField>

          {category === 'MATERIAL' && (
            <>
              <FormField label="Material Type" required>
                <select
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                  className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
                >
                  <option value="">Select material...</option>
                  {metadata?.rawMaterials.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                  ))}
                </select>
              </FormField>

            </>
          )}

          <FormField label="Amount (₹)" required>
            <BigNumberInput value={amount} onChange={setAmount} />
          </FormField>

          <FormField label="Worker (Optional)">
            <select
              value={selectedWorker}
              onChange={(e) => setSelectedWorker(e.target.value)}
              className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
            >
              <option value="">Select worker...</option>
              {metadata?.workers.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Notes">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What was this for?"
              className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </FormField>

          <div className="sticky bottom-20 md:bottom-4 z-10 pt-2">
            <ActionButton
              label={createExpenseMutation.isPending ? "Saving..." : "Save Expense"}
              icon={createExpenseMutation.isPending ? Loader2 : Save}
              variant="accent"
              size="lg"
              onClick={saveExpense}
              className={`w-full shadow-lg ${createExpenseMutation.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={createExpenseMutation.isPending}
            />
          </div>

          <button className="w-full text-sm text-primary font-medium flex items-center justify-center gap-1.5 py-2 hover:bg-primary/5 rounded-xl transition-colors">
            <Eye className="h-4 w-4" /> View / Edit Entries
          </button>
        </div>
      </EntryCard>

      <EntryCard title="Recent Expenses">
        <div className="space-y-3">
          {isExpensesLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading expenses...
            </div>
          ) : recentExpenses.length > 0 ? (
            recentExpenses.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 bg-secondary/30 rounded-xl">
                <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{e.notes || e.category}</p>
                  <p className="text-xs text-muted-foreground">{e.category} • Today</p>
                </div>
                <span className="text-sm font-bold text-foreground">₹{e.amount.toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center italic">No expenses for this date</p>
          )}
        </div>
      </EntryCard>
    </MobileFormLayout>
  );
};

export default ExpensesPage;
