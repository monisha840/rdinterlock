import { useState, useEffect } from "react";
import { MobileFormLayout, FormField, BigNumberInput } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { DatePickerField } from "@/components/DatePickerField";
import { PillSelector } from "@/components/PillSelector";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, Plus, X, Fuel, UtensilsCrossed, PackageOpen, MoreHorizontal, Eye, Loader2, Receipt } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings.api";
import { workersApi } from "@/api/workers.api";
import { productionApi } from "@/api/production.api";
import { expensesApi } from "@/api/expenses.api";
import { format } from "date-fns";

const quickQuantities = [500, 800, 1000, 1500, 2000];

const DailyEntry = () => {
  const queryClient = useQueryClient();
  const [entryDate, setEntryDate] = useState(new Date());
  const [shift, setShift] = useState("MORNING");
  const [brickTypeId, setBrickTypeId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [workers, setWorkers] = useState<string[]>([""]);
  const [sameProduction, setSameProduction] = useState(true);
  const [workerQuantities, setWorkerQuantities] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState("");

  const [expenseDate, setExpenseDate] = useState(new Date());
  const [expenseCategory, setExpenseCategory] = useState("FUEL");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNotes, setExpenseNotes] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [materialQty, setMaterialQty] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");

  // Fetch Reference Data (Machines, Brick Types, Workers) - Optimized batched call
  const {
    data: metadata,
    isLoading: isMetaLoading,
    isError: isMetaError
  } = useQuery({
    queryKey: ['form-metadata'],
    queryFn: settingsApi.getFormMetadata,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 30 * 60 * 1000,   // 30 minutes garbage collection
  });

  const machines = metadata?.machines || [];
  const brickTypes = metadata?.brickTypes || [];
  const workerList = metadata?.workers || [];
  const rawMaterials = metadata?.rawMaterials || [];

  const { data: todayProductions = [], isLoading: isSummaryLoading } = useQuery({
    queryKey: ['productions', 'today', format(entryDate, 'yyyy-MM-dd')],
    queryFn: () => productionApi.getAll({ date: format(entryDate, 'yyyy-MM-dd') }),
    select: (data) => data.productions,
  });

  // Mutations
  const createProductionMutation = useMutation({
    mutationFn: productionApi.create,
    onSuccess: () => {
      toast.success("✅ Production Saved Successfully");
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setQuantity("");
      setWorkers([""]);
      setWorkerQuantities({});
      setNotes("");
    },
    onError: (error: any) => {
      toast.error("❌ Failed to save production", {
        description: error.response?.data?.message || error.message,
      });
    },
  });

  const { data: recentExpenses = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenses-recent', format(expenseDate, 'yyyy-MM-dd')],
    queryFn: () => expensesApi.getAll({ startDate: format(expenseDate, 'yyyy-MM-dd'), endDate: format(expenseDate, 'yyyy-MM-dd') }),
  });

  const createExpenseMutation = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      toast.success("✅ Expense Saved Successfully");
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expenses-recent'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setExpenseAmount("");
      setExpenseNotes("");
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

  // Set initial selections when data loads
  useEffect(() => {
    if (machines.length > 0 && !machineId) setMachineId(machines[0].id);
    if (brickTypes.length > 0 && !brickTypeId) setBrickTypeId(brickTypes[0].id);
  }, [machines, brickTypes]);

  const addWorker = () => setWorkers([...workers, ""]);
  const removeWorker = (i: number) => {
    setWorkers(workers.filter((_, idx) => idx !== i));
    const newQty = { ...workerQuantities };
    delete newQty[i];
    setWorkerQuantities(newQty);
  };
  const updateWorker = (i: number, v: string) => {
    const updated = [...workers];
    updated[i] = v;
    setWorkers(updated);
  };
  const updateWorkerQty = (i: number, v: string) => {
    setWorkerQuantities({ ...workerQuantities, [i]: v });
  };

  const calcTotal = () => {
    if (sameProduction) return parseInt(quantity) || 0;
    return Object.values(workerQuantities).reduce((sum, q) => sum + (parseInt(q) || 0), 0);
  };

  const saveProduction = () => {
    const totalQty = calcTotal();
    if (totalQty <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }
    if (!machineId || !brickTypeId) {
      toast.error("Please select a machine and brick size");
      return;
    }

    const payload = {
      date: format(entryDate, 'yyyy-MM-dd'),
      machineId,
      shift: shift as any,
      brickTypeId,
      quantity: totalQty,
      notes,
      workers: workers
        .filter(w => w !== "")
        .map((workerId, index) => ({
          workerId,
          quantity: sameProduction ? Math.floor(totalQty / workers.filter(w => w !== "").length) : parseInt(workerQuantities[index]) || 0,
        })),
    };

    createProductionMutation.mutate(payload);
  };

  const saveExpense = () => {
    if (!expenseAmount || isNaN(parseFloat(expenseAmount))) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (expenseCategory === 'MATERIAL' && !materialId) {
      toast.error("Please select a material type");
      return;
    }

    createExpenseMutation.mutate({
      date: format(expenseDate, 'yyyy-MM-dd'),
      category: expenseCategory as any,
      amount: parseFloat(expenseAmount),
      notes: expenseNotes,
      paymentMode: 'CASH',
      materialId: expenseCategory === 'MATERIAL' ? materialId : undefined,
      quantity: expenseCategory === 'MATERIAL' && materialQty ? parseFloat(materialQty) : undefined,
      pricePerUnit: expenseCategory === 'MATERIAL' && pricePerUnit ? parseFloat(pricePerUnit) : undefined,
    });
  };

  const totalToday = todayProductions.reduce((sum, p) => sum + p.quantity, 0);

  const machineOptions = machines.map(m => ({ label: m.name, value: m.id }));
  const brickTypeOptions = brickTypes.map(bt => ({ label: bt.size, value: bt.id }));

  return (
    <MobileFormLayout title="📖 Daily Entry">
      <EntryCard title="🧱 Production Entry">
        <div className="space-y-5">
          <DatePickerField date={entryDate} onDateChange={setEntryDate} />

          <FormField label="Machine">
            {isMetaLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm italic">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading machines...
              </div>
            ) : isMetaError ? (
              <div className="text-sm text-destructive italic">Failed to load machines.</div>
            ) : machines.length > 0 ? (
              <PillSelector
                options={machineOptions}
                value={machineId}
                onChange={setMachineId}
              />
            ) : (
              <div className="text-sm text-muted-foreground italic">No active machines found in settings.</div>
            )}
          </FormField>

          <FormField label="Shift">
            <div className="grid grid-cols-2 gap-2">
              <ActionButton label="☀️ Morning" variant="outline" active={shift === "MORNING"} onClick={() => setShift("MORNING")} />
              <ActionButton label="🌙 Night" variant="outline" active={shift === "NIGHT"} onClick={() => setShift("NIGHT")} />
            </div>
          </FormField>

          <FormField label="Brick Size">
            {isMetaLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm italic">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading sizes...
              </div>
            ) : isMetaError ? (
              <div className="text-sm text-destructive italic">Failed to load brick sizes.</div>
            ) : brickTypes.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {brickTypeOptions.map(opt => (
                  <ActionButton
                    key={opt.value}
                    label={opt.label}
                    variant="outline"
                    active={brickTypeId === opt.value}
                    onClick={() => setBrickTypeId(opt.value)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground italic">No active brick sizes found.</div>
            )}
          </FormField>

          <FormField label="Quantity Produced" required>
            <BigNumberInput
              value={sameProduction ? quantity : calcTotal().toString()}
              onChange={sameProduction ? setQuantity : () => { }}
              placeholder="Enter number of bricks"
            />
          </FormField>

          {/* Quick Quantity Chips */}
          <div className="flex flex-wrap gap-2">
            {quickQuantities.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sameProduction && setQuantity(q.toString())}
                className="px-4 h-9 rounded-full border border-border bg-card text-foreground text-xs font-semibold hover:border-primary/40 hover:bg-primary/4 transition-all active:scale-95 touch-target"
              >
                {q.toLocaleString()}
              </button>
            ))}
          </div>

          {/* Worker Production Mode */}
          <div className="flex items-center gap-2.5 p-3 bg-secondary/50 rounded-xl">
            <Checkbox
              id="same-production"
              checked={sameProduction}
              onCheckedChange={(checked) => setSameProduction(checked === true)}
            />
            <label htmlFor="same-production" className="text-sm font-medium text-foreground cursor-pointer">
              Same production for all workers
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">Workers</span>
              <button type="button" onClick={addWorker} className="inline-flex items-center gap-1 text-sm text-primary font-semibold touch-target">
                <Plus className="h-4 w-4" /> Add
              </button>
            </div>
            <div className="space-y-2">
              {workers.map((w, i) => (
                <div key={i} className="flex gap-2">
                  <select
                    value={w}
                    onChange={(e) => updateWorker(i, e.target.value)}
                    disabled={isMetaLoading}
                    className="flex-1 h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors disabled:opacity-50"
                  >
                    <option value="">{isMetaLoading ? "Loading workers..." : "Select worker..."}</option>
                    {workerList.map((worker) => <option key={worker.id} value={worker.id}>{worker.name}</option>)}
                  </select>
                  {!sameProduction && (
                    <input
                      type="number"
                      inputMode="numeric"
                      value={workerQuantities[i] || ""}
                      onChange={(e) => updateWorkerQty(i, e.target.value)}
                      placeholder="Qty"
                      className="w-24 h-12 px-2 bg-secondary/50 border border-border rounded-xl text-foreground text-sm text-center focus:border-primary focus:outline-none transition-colors"
                    />
                  )}
                  {workers.length > 1 && (
                    <button onClick={() => removeWorker(i)} className="text-muted-foreground hover:text-destructive touch-target px-2 transition-colors">
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Sticky-style Save */}
          <div className="sticky bottom-20 md:bottom-4 z-10 pt-2">
            <ActionButton
              label={createProductionMutation.isPending ? "Saving..." : "Save Production"}
              icon={createProductionMutation.isPending ? Loader2 : Save}
              variant="success"
              size="lg"
              onClick={saveProduction}
              className={`w-full shadow-lg ${createProductionMutation.isPending ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={createProductionMutation.isPending}
            />
          </div>

          <button className="w-full text-sm text-primary font-medium flex items-center justify-center gap-1.5 py-2 hover:bg-primary/5 rounded-xl transition-colors">
            <Eye className="h-4 w-4" /> View / Edit Entries
          </button>
        </div>
      </EntryCard>

      {/* Today's Production Summary */}
      <EntryCard title="📊 Today's Summary">
        <div className="space-y-2">
          {todayProductions.length > 0 ? (
            todayProductions.map((p, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{p.machine.name} ({p.shift.toLowerCase()})</span>
                <span className="text-sm font-bold text-foreground">{p.quantity.toLocaleString()} bricks</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center italic">No entries for this date</p>
          )}
          <div className="flex justify-between items-center pt-3 border-t-2 border-primary/20">
            <span className="text-sm font-bold text-foreground">Total</span>
            <span className="text-lg font-bold text-primary">{totalToday.toLocaleString()} bricks</span>
          </div>
        </div>
      </EntryCard>


      {/* Recent Expenses List */}
      <EntryCard title="📊 Recent Expenses">
        <div className="space-y-3">
          {isExpensesLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading expenses...
            </div>
          ) : recentExpenses.length > 0 ? (
            recentExpenses.map((e, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 bg-secondary/30 rounded-xl">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{e.notes || e.category}</p>
                  <p className="text-xs text-muted-foreground">{e.category} • Today</p>
                </div>
                <span className="text-sm font-bold text-foreground">₹{e.amount.toLocaleString()}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center italic">No expenses for this date</p>
          )}
        </div>
      </EntryCard>
    </MobileFormLayout >
  );
};

export default DailyEntry;
