import { useState, useEffect } from "react";
import { MobileFormLayout, FormField, BigNumberInput } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { DatePickerField } from "@/components/DatePickerField";
import { PillSelector } from "@/components/PillSelector";
import { toast } from "sonner";
import { Save, Plus, X, Fuel, UtensilsCrossed, PackageOpen, MoreHorizontal, Loader2, Receipt, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings.api";
import { workersApi } from "@/api/workers.api";
import { productionApi } from "@/api/production.api";
import { expensesApi } from "@/api/expenses.api";
import { format } from "date-fns";

const quickQuantities = [500, 800, 1000, 2000];

const DailyEntry = () => {
  const queryClient = useQueryClient();
  const [entryDate, setEntryDate] = useState(new Date());
  
  // Clear last result when date changes (actual day change)
  useEffect(() => {
    if (lastResult) setLastResult(null);
  }, [format(entryDate, 'yyyy-MM-dd')]);
  const [shift, setShift] = useState("MORNING");
  const [brickTypeId, setBrickTypeId] = useState("");
  const [machineId, setMachineId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [damagedQuantity, setDamagedQuantity] = useState("");
  const [workers, setWorkers] = useState<string[]>([""]);
  const [notes, setNotes] = useState("");
  const [lastResult, setLastResult] = useState<any>(null);

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
    onSuccess: (data) => {
      toast.success("✅ Production Saved Successfully");
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setLastResult(data);
      setQuantity("");
      setDamagedQuantity("");
      setWorkers([""]);
      setNotes("");
    },
    onError: (error: any) => {
      toast.error("❌ Failed to save production", {
        description: error.response?.data?.message || error.message,
      });
    },
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
  };
  const updateWorker = (i: number, v: string) => {
    const updated = [...workers];
    updated[i] = v;
    setWorkers(updated);
  };
  const calcTotal = () => {
    return parseInt(quantity) || 0;
  };

  const calcAvailable = () => {
    const total = calcTotal();
    const damaged = parseInt(damagedQuantity) || 0;
    return Math.max(0, total - damaged);
  };

  const saveProduction = () => {
    const totalQty = calcTotal();
    const damagedQty = parseInt(damagedQuantity) || 0;

    if (totalQty <= 0) {
      toast.error("Please enter a valid quantity of bricks produced");
      return;
    }
    if (damagedQty < 0) {
      toast.error("Damaged bricks cannot be negative");
      return;
    }
    if (damagedQty > totalQty) {
      toast.error("Damaged bricks cannot be greater than produced bricks");
      return;
    }
    if (!machineId || !brickTypeId) {
      toast.error("Please select a machine and brick size");
      return;
    }

    const availableQty = calcAvailable();

    const payload = {
      date: format(entryDate, 'yyyy-MM-dd'),
      machineId,
      shift: shift as any,
      brickTypeId,
      quantity: totalQty,
      damagedBricks: damagedQty,
      notes,
      workers: workers
        .filter(w => w !== "")
        .map((workerId, index, filteredArray) => {
          const baseQty = Math.floor(availableQty / filteredArray.length);
          const remainder = availableQty % filteredArray.length;
          return {
            workerId,
            quantity: index === 0 ? baseQty + remainder : baseQty,
          };
        }),
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

  const totalToday = todayProductions.reduce((sum, p) => sum + p.availableBricks, 0);

  const machineOptions = machines.map(m => ({ label: m.name, value: m.id }));
  const brickTypeOptions = brickTypes.map(bt => ({ label: bt.size, value: bt.id }));

  return (
    <MobileFormLayout title="📖 Daily Entry">
      {lastResult && (
        <EntryCard title="✅ Production Summary" className="border-green-500/30 bg-green-500/5">
          <div className="space-y-4">
            <div className="flex justify-between items-end border-b border-green-500/10 pb-3">
              <div>
                <p className="text-[10px] font-bold text-green-600 uppercase">Available Quantity</p>
                <p className="text-3xl font-black text-green-700">{lastResult.availableBricks?.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Wastage</p>
                <p className={`text-sm font-bold ${lastResult.wastagePercentage > 5 ? 'text-red-500' : 'text-orange-500'}`}>
                  {lastResult.wastagePercentage}% ({lastResult.damagedBricks})
                </p>
              </div>
            </div>

            {lastResult.materialConsumption ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase px-1">Material Consumption</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/50 p-3 rounded-2xl border border-green-500/10 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Cement</p>
                    <p className="text-sm font-black text-foreground">{lastResult.materialConsumption.cementUsed} KG</p>
                  </div>
                  <div className="bg-white/50 p-3 rounded-2xl border border-green-500/10 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Fly Ash</p>
                    <p className="text-sm font-black text-foreground">{lastResult.materialConsumption.flyAshUsed} KG</p>
                  </div>
                  <div className="bg-white/50 p-3 rounded-2xl border border-green-500/10 text-center">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Powder</p>
                    <p className="text-sm font-black text-foreground">{lastResult.materialConsumption.powderUsed} KG</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground italic bg-secondary/20 p-2 rounded-lg text-center">
                Material config not found for this brick type.
              </p>
            )}

            <button 
              onClick={() => setLastResult(null)}
              className="w-full py-2 text-[10px] font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors"
            >
              Dismiss Summary
            </button>
          </div>
        </EntryCard>
      )}

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
              value={quantity}
              onChange={setQuantity}
              placeholder="Enter number of bricks"
            />
            {/* Quick Quantity Chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              {quickQuantities.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q.toString())}
                  className="px-5 h-10 rounded-full border border-border bg-card text-foreground text-xs font-black uppercase tracking-tight hover:border-primary/40 hover:bg-primary/4 transition-all active:scale-95 shadow-sm"
                >
                  {q.toLocaleString()}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Damaged Bricks">
            <BigNumberInput
              value={damagedQuantity}
              onChange={setDamagedQuantity}
              placeholder="Enter number of damaged bricks"
              min={0}
            />
          </FormField>

          <div className={`p-4 rounded-2xl border-2 transition-all ${parseInt(damagedQuantity) > calcTotal() ? 'bg-destructive/10 border-destructive shadow-destructive/10' : 'bg-primary/10 border-primary shadow-primary/10'}`}>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Available Bricks</p>
                <p className={`text-2xl font-black ${parseInt(damagedQuantity) > calcTotal() ? 'text-destructive' : 'text-primary'}`}>
                  {calcAvailable().toLocaleString()}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${parseInt(damagedQuantity) > calcTotal() ? 'bg-destructive/20' : 'bg-primary/20'}`}>
                {parseInt(damagedQuantity) > calcTotal() ? <X className="h-5 w-5 text-destructive" /> : <Check className="h-5 w-5 text-primary" />}
              </div>
            </div>
            {parseInt(damagedQuantity) > calcTotal() && (
              <p className="text-[10px] text-destructive font-bold mt-2">
                ⚠️ Damaged bricks cannot be greater than produced bricks
              </p>
            )}
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

        </div>
      </EntryCard>

      {/* Today's Production Summary */}
      <EntryCard title="📊 Today's Summary">
        <div className="space-y-2">
          {todayProductions.length > 0 ? (
            todayProductions.map((p, i) => (
              <div key={i} className="flex justify-between items-center py-2.5 border-b border-border/50 last:border-0">
                <span className="text-sm text-muted-foreground">{p.machine.name} ({p.shift.toLowerCase()})</span>
                <span className="text-sm font-bold text-foreground">{p.availableBricks.toLocaleString()} bricks</span>
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


    </MobileFormLayout >
  );
};

export default DailyEntry;
