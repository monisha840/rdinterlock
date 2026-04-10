import { useState } from "react";
import { MobileFormLayout, FormField, BigNumberInput } from "@/components/MobileFormLayout";
import { EntryCard } from "@/components/EntryCard";
import { ActionButton } from "@/components/ActionButton";
import { KPICard } from "@/components/KPICard";
import { StatusBadge } from "@/components/StatusBadge";
import { DatePickerField } from "@/components/DatePickerField";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Save, ArrowDownCircle, ArrowUpCircle, Wallet, Eye, Loader2, X, Check, ChevronsUpDown, User, Calendar, Briefcase, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cashApi } from "@/api/cash.api";
import apiClient from "@/api/apiClient";
import { format } from "date-fns";
import { workersApi } from "@/api/workers.api";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Search, Download, FileSpreadsheet, FileJson, Upload } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ConfirmModal";

const CashBookPage = () => {
  const queryClient = useQueryClient();
  const [entryDate, setEntryDate] = useState(new Date());
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [amount, setAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'BANK' | 'CHEQUE' | 'BANK_TRANSFER'>("CASH");
  const [category, setCategory] = useState("");
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [linkedId, setLinkedId] = useState("");
  const [deductFromBalance, setDeductFromBalance] = useState(true);

  // Filters
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importResults, setImportResults] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [deleteCashId, setDeleteCashId] = useState<string | null>(null);

  const categoriesIn = ["Client Payment", "Advance Return", "Other Income"];
  const groupedCategoriesOut = {
    "Material & Spares": ["Material", "Bearings", "PLC Elements", "Mould (Die)", "Bolts", "Welding", "Lathe"],
    "Utilities & Rent": ["E.B (Electricity Bill)", "Gas", "WiFi", "Rent"],
    "Daily Tracking Improvements": ["Diesel", "Maintenance", "Labour", "Transport", "Office Expense", "Miscellaneous"],
    "Staff & Workers": ["Worker Advance", "Staff Advance", "Worker Wages", "Staff Salary"],
    "Office / Misc": ["Food", "Rice", "Tea", "Video Editing", "S.V Expense", "Other Expense"]
  };
  const allCategoriesOut = Object.values(groupedCategoriesOut).flat();

  // Queries
  const { data: balanceData, isLoading: isBalanceLoading } = useQuery({
    queryKey: ['cash-balance'],
    queryFn: () => cashApi.getBalance(),
  });

  const { data: entries = [], isLoading: isEntriesLoading } = useQuery({
    queryKey: ['cash-entries', filterStartDate, filterEndDate, filterType, filterCategory, searchQuery],
    queryFn: () => cashApi.getAll({
      startDate: filterStartDate,
      endDate: filterEndDate,
      type: filterType === "IN" ? "CREDIT" : filterType === "OUT" ? "DEBIT" : undefined,
      category: filterCategory || undefined,
      search: searchQuery || undefined
    }),
  });

  const { data: ledgerEntries = [], isLoading: isLedgerLoading } = useQuery({
    queryKey: ['worker-ledger', selectedWorkerId],
    queryFn: () => workersApi.getLedger(selectedWorkerId),
    enabled: !!selectedWorkerId,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => apiClient.get('/clients').then(res => (res as any).data),
  });

  const { data: workers = [] } = useQuery({
    queryKey: ['workers'],
    queryFn: () => workersApi.getAll(true),
  });

  const workerList = workers.filter((w: any) => w.employeeType === 'Worker');
  const staffList = workers.filter((w: any) => w.employeeType === 'Staff');

  // Mutations
  const createEntryMut = useMutation({
    mutationFn: (data: any) => cashApi.create(data),
    onSuccess: () => {
      toast.success("✅ Saved Successfully");
      queryClient.invalidateQueries({ queryKey: ['cash-entries'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-orders-all'] });
      setAmount("");
      setDescription("");
      setCategory("");
    },
    onError: (error: any) => {
      toast.error("❌ Failed to save entry", {
        description: error.response?.data?.message || error.message,
      });
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: string) => cashApi.delete(id),
    onSuccess: () => {
      toast.success("🗑️ Entry Deleted");
      queryClient.invalidateQueries({ queryKey: ['cash-entries'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    }
  });

  const updateEntryMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => cashApi.update(id, data),
    onSuccess: () => {
      toast.success("✅ Entry Updated");
      queryClient.invalidateQueries({ queryKey: ['cash-entries'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      setEditingEntry(null);
      setAmount("");
      setDescription("");
      setCategory("");
    },
    onError: (error: any) => {
      toast.error("❌ Failed to update", { description: error.response?.data?.message || error.message });
    },
  });

  const startEditEntry = (entry: any) => {
    setEditingEntry(entry);
    setEntryDate(new Date(entry.date));
    setType(entry.type === "CREDIT" ? "IN" : "OUT");
    setAmount(String(entry.amount));
    setCategory(entry.category);
    setDescription(entry.description || "");
    setPaymentMode(entry.paymentMode || "CASH");
    setLinkedId(entry.customerId || entry.workerId || "");
    setDeductFromBalance(!entry.isRecordOnly);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveEntry = () => {
    if (!amount || isNaN(parseFloat(amount)) || !category) {
      toast.error("Please enter a valid amount and category");
      return;
    }

    const payload: any = {
      date: format(entryDate, 'yyyy-MM-dd'),
      type: type === "IN" ? "CREDIT" : "DEBIT",
      amount: parseFloat(amount),
      description: description.trim() || category,
      category: category,
      paymentMode: paymentMode,
    };

    if (category === "Client Payment") payload.customerId = linkedId;
    if (["Worker Advance", "Staff Advance", "Worker Wages", "Staff Salary"].includes(category)) payload.workerId = linkedId;
    if (type === "OUT") payload.isRecordOnly = !deductFromBalance;

    if (editingEntry) {
      updateEntryMut.mutate({ id: editingEntry.id, data: payload });
    } else {
      createEntryMut.mutate(payload);
    }
  };

  // Strip internal IDs from description (TransportID, EMI ID, etc.)
  const cleanDescription = (desc: string) => {
    if (!desc) return desc;
    return desc.replace(/\s*\((TransportID|EMI ID):\s*[^)]+\)/g, '').trim();
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

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const tableColumn = ["Date", "Client", "Location", "Type", "Category", "Method", "Amount"];
      const tableRows: any[] = [];

      let totalIn = 0;
      let totalOut = 0;

      entries.forEach((e: any) => {
        const rowData = [
          format(new Date(e.date), 'dd-MM-yyyy'),
          e.customer?.name || e.worker?.name || "-",
          e.customer?.address || "-",
          e.type === 'CREDIT' ? 'Money IN' : 'Money OUT',
          e.category,
          e.paymentMode,
          e.amount
        ];
        tableRows.push(rowData);
        if (e.type === 'CREDIT') totalIn += e.amount;
        else totalOut += e.amount;
      });

      doc.setFontSize(18);
      doc.text("Cash Book Report", 14, 15);
      doc.setFontSize(11);
      doc.text("Generated on: " + format(new Date(), 'dd-MM-yyyy HH:mm'), 14, 22);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
      });

      const finalY = ((doc as any).lastAutoTable?.finalY || 200) + 10;
      doc.text("Total Money IN: Rs." + totalIn.toLocaleString(), 14, finalY);
      doc.text("Total Money OUT: Rs." + totalOut.toLocaleString(), 14, finalY + 7);
      doc.text("Net Balance: Rs." + (totalIn - totalOut).toLocaleString(), 14, finalY + 14);

      doc.save("cashbook-report-" + format(new Date(), 'dd-MM-yyyy') + ".pdf");
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error("PDF export failed", { description: err.message });
    }
  };

  const handleExportExcel = () => {
    const data = entries.map((e: any) => ({
      Date: format(new Date(e.date), 'dd-MM-yyyy'),
      Client: e.customer?.name || e.worker?.name || "-",
      Phone: e.customer?.phone || "-",
      Location: e.customer?.address || "-",
      Category: e.category,
      Type: e.type === 'CREDIT' ? 'Money IN' : 'Money OUT',
      Method: e.paymentMode,
      Amount: e.amount,
      Notes: e.description
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cashbook");
    XLSX.writeFile(wb, `cashbook-report-${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiClient.post('/cash/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setImportResults((res as any).data);
      queryClient.invalidateQueries({ queryKey: ['cash-entries'] });
      queryClient.invalidateQueries({ queryKey: ['cash-balance'] });
      toast.success("Import processing complete!");
    } catch (err: any) {
      toast.error("Import failed", { description: err.response?.data?.message || err.message });
    } finally {
      setIsImporting(false);
      e.target.value = "";
    }
  };

  return (
    <MobileFormLayout title="💵 Unified Cash Book">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <KPICard
          title="Current Balance"
          value={isBalanceLoading ? "---" : `₹${balanceData?.balance?.toLocaleString() || 0}`}
          icon={Wallet}
          variant="primary"
        />
        <KPICard
          title="Today Money IN"
          value={isBalanceLoading ? "---" : `₹${balanceData?.todayMoneyIn?.toLocaleString() || 0}`}
          icon={ArrowDownCircle}
          variant="success"
        />
        <KPICard
          title="Today Money OUT"
          value={isBalanceLoading ? "---" : `₹${balanceData?.todayMoneyOut?.toLocaleString() || 0}`}
          icon={ArrowUpCircle}
          variant="accent"
        />
        <KPICard
          title="This Month Exp."
          value={isBalanceLoading ? "---" : `₹${balanceData?.thisMonthExpenses?.toLocaleString() || 0}`}
          icon={Wallet}
          variant="warning"
        />
      </div>

      <EntryCard title={editingEntry ? "Edit Entry" : "New Entry"}>
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

          <FormField label="Category" required>
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  role="combobox"
                  aria-expanded={categoryOpen}
                  className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors flex items-center justify-between"
                >
                  {category ? category : "Select Category"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] md:w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search category..." />
                  <CommandList className="max-h-[300px] overflow-y-auto">
                    <CommandEmpty>No category found.</CommandEmpty>
                    {type === "IN" ? (
                      <CommandGroup>
                        {categoriesIn.map((c) => (
                          <CommandItem
                            key={c}
                            value={c}
                            onSelect={() => {
                              setCategory(c);
                              setLinkedId("");
                              setCategoryOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                category === c ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {c}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ) : (
                      Object.entries(groupedCategoriesOut).map(([group, cats]) => (
                        <CommandGroup key={group} heading={group}>
                          {cats.map((c) => (
                            <CommandItem
                              key={c}
                              value={c}
                              onSelect={() => {
                                setCategory(c);
                                setLinkedId("");
                                setCategoryOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  category === c ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {c}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      ))
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </FormField>

          {category === "Client Payment" && (
            <FormField label="Select Client" required>
              <select
                value={linkedId}
                onChange={(e) => setLinkedId(e.target.value)}
                className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Select Client</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormField>
          )}

          {(category === "Worker Advance" || category === "Worker Wages") && (
            <FormField label="Select Worker" required>
              <select
                value={linkedId}
                onChange={(e) => setLinkedId(e.target.value)}
                className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Select Worker</option>
                {workerList.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                ))}
              </select>
            </FormField>
          )}

          {category === "Staff Advance" || category === "Staff Salary" ? (
            <FormField label="Select Staff Member" required>
              <select
                value={linkedId}
                onChange={(e) => setLinkedId(e.target.value)}
                className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
              >
                <option value="">Select Staff</option>
                {staffList.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
            </FormField>
          ) : null}


          <FormField label="Amount (₹)" required>
            <BigNumberInput value={amount} onChange={setAmount} />
          </FormField>

          <FormField label="Notes">
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Further details..."
              className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </FormField>

          <FormField label="Payment Mode">
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as any)}
              className="w-full h-12 px-3 bg-secondary/50 border border-border rounded-xl text-foreground text-sm focus:border-primary focus:outline-none transition-colors"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
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

          <div className="sticky bottom-20 md:bottom-4 z-10 pt-2 space-y-2">
            {editingEntry && (
              <button
                onClick={() => {
                  setEditingEntry(null);
                  setAmount("");
                  setDescription("");
                  setCategory("");
                }}
                className="w-full h-10 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel Editing
              </button>
            )}
            <ActionButton
              label={(createEntryMut.isPending || updateEntryMut.isPending) ? "Saving..." : editingEntry ? "Update Entry" : "Save Entry"}
              icon={(createEntryMut.isPending || updateEntryMut.isPending) ? Loader2 : Save}
              variant={editingEntry ? "primary" : "success"}
              size="lg"
              onClick={saveEntry}
              className="w-full shadow-lg"
              disabled={createEntryMut.isPending || updateEntryMut.isPending}
            />
          </div>
        </div>
      </EntryCard>

      <EntryCard title="Transaction History">
        {/* Search */}
        <div className="relative group mb-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Search by category, vendor, amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-11 pr-11 bg-secondary/30 border border-border rounded-2xl text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-secondary transition-colors"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Import Results Summary */}
        {importResults && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl relative animate-in fade-in slide-in-from-top-2">
            <button
              onClick={() => setImportResults(null)}
              className="absolute top-3 right-3 p-1 hover:bg-primary/10 rounded-full transition-colors"
            >
              <X className="h-4 w-4 text-primary" />
            </button>
            <h4 className="font-bold text-sm text-primary mb-2 flex items-center gap-2">
              <Check className="h-4 w-4" /> Import Completed
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-2 bg-background/50 rounded-xl border border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Added</p>
                <p className="text-lg font-black text-success">{importResults.added}</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded-xl border border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Skipped</p>
                <p className="text-lg font-black text-warning">{importResults.duplicates}</p>
              </div>
              <div className="text-center p-2 bg-background/50 rounded-xl border border-border/50">
                <p className="text-[10px] font-bold text-muted-foreground uppercase">Errors</p>
                <p className="text-lg font-black text-destructive">{importResults.errors}</p>
              </div>
            </div>
            {importResults.details.length > 0 && (
              <div className="mt-3 max-h-24 overflow-y-auto px-2 space-y-1">
                {importResults.details.map((detail: string, idx: number) => (
                  <p key={idx} className="text-[10px] text-muted-foreground italic">• {detail}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Date Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { label: "Today", value: "today" },
            { label: "This Week", value: "week" },
            { label: "This Month", value: "month" },
            { label: "This Year", value: "year" },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => {
                const now = new Date();
                let start = new Date();
                let end = new Date();

                if (btn.value === "today") {
                  start = now;
                  end = now;
                } else if (btn.value === "week") {
                  const day = now.getDay();
                  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                  start = new Date(now.setDate(diff));
                  end = new Date();
                } else if (btn.value === "month") {
                  start = new Date(now.getFullYear(), now.getMonth(), 1);
                  end = new Date();
                } else if (btn.value === "year") {
                  start = new Date(now.getFullYear(), 0, 1);
                  end = new Date();
                }

                setFilterStartDate(format(start, 'yyyy-MM-dd'));
                setFilterEndDate(format(end, 'yyyy-MM-dd'));
              }}
              className="h-9 px-4 bg-secondary/50 border border-border rounded-xl text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all active:scale-[0.98]"
            >
              {btn.label}
            </button>
          ))}
          <button
            onClick={() => {
              setFilterStartDate("");
              setFilterEndDate("");
            }}
            className="h-9 px-4 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs font-bold hover:bg-destructive hover:text-white transition-all active:scale-[0.98]"
          >
            Clear Dates
          </button>
        </div>

        {/* Export / Import Actions */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={handleExportPDF}
            className="h-9 px-3.5 bg-secondary/50 border border-border rounded-xl text-[11px] font-bold flex items-center gap-1.5 hover:bg-secondary transition-all active:scale-[0.98]"
          >
            <Download className="h-3.5 w-3.5" /> PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="h-9 px-3.5 bg-secondary/50 border border-border rounded-xl text-[11px] font-bold flex items-center gap-1.5 hover:bg-secondary transition-all active:scale-[0.98]"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <div className="relative ml-auto">
            <input
              type="file"
              id="excel-import"
              className="hidden"
              accept=".xlsx, .xls, .csv"
              onChange={handleImportExcel}
              disabled={isImporting}
            />
            <label
              htmlFor="excel-import"
              className={`h-9 px-4 bg-primary text-primary-foreground rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-all active:scale-[0.98] ${isImporting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Import
            </label>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-secondary/10 p-4 rounded-2xl border border-border/50">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs focus:border-primary outline-none"
            >
              <option value="">All Types</option>
              <option value="IN">Money IN</option>
              <option value="OUT">Money OUT</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs focus:border-primary outline-none"
            >
              <option value="">All Categories</option>
              {categoriesIn.map(c => (
                <option key={`in-${c}`} value={c}>{c}</option>
              ))}
              {allCategoriesOut.map(c => (
                <option key={`out-${c}`} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs focus:border-primary outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">Person (Staff/Worker)</label>
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs focus:border-primary outline-none"
            >
              <option value="">All Transactions</option>
              <optgroup label="Staff">
                {staffList.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </optgroup>
              <optgroup label="Workers">
                {workerList.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name} ({w.role})</option>
                ))}
              </optgroup>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase px-1">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="w-full h-10 px-3 bg-background border border-border rounded-xl text-xs focus:border-primary outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          {isEntriesLoading || isLedgerLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (selectedWorkerId ? ledgerEntries : entries).length > 0 ? (
            (selectedWorkerId ? ledgerEntries : entries).map((e: any, i: number) => {
              if (selectedWorkerId) {
                // Render Ledger Entry
                const isPositive = e.type === 'EARNING' || e.type === 'WORK';
                const isFinancial = e.type === 'CREDIT' || e.type === 'DEBIT';

                return (
                  <div key={e.id || i} className="flex flex-col gap-2 p-3.5 sm:p-4 bg-secondary/30 rounded-2xl group border border-border/40 hover:border-primary/20 transition-all">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 ${
                        e.type === 'WORK' ? "bg-primary/10" :
                        e.type === 'ATTENDANCE' ? "bg-info/10" :
                        isPositive ? "bg-success/10" : "bg-destructive/10"
                      }`}>
                        {e.type === 'WORK' ? <Briefcase className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-primary" /> :
                         e.type === 'ATTENDANCE' ? <Calendar className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-info" /> :
                         isPositive ? <ArrowDownCircle className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-success" /> : <ArrowUpCircle className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-destructive" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col min-w-0">
                            <p className="font-bold text-[13px] sm:text-sm text-foreground truncate">{e.category}</p>
                            <p className="text-[10px] font-bold text-primary/80 uppercase truncate">{cleanDescription(e.description)}</p>
                          </div>
                          {e.amount > 0 && (
                            <span className={`text-sm font-black ${isPositive ? "text-success" : "text-destructive"}`}>
                              {isPositive ? "+" : "-"}₹{e.amount.toLocaleString()}
                            </span>
                          )}
                          {e.quantity > 0 && (
                            <span className="text-xs font-bold text-primary">
                              {e.quantity} pcs
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <span className="font-medium">{getRelativeDate(e.date)}</span>
                          {e.paymentMode && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-primary/80">{e.paymentMode}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }

              // Render Standard Cash Entry
              const displayDesc = cleanDescription(e.description);
              return (
                <div key={e.id || i} className="flex flex-col gap-2 p-3.5 sm:p-4 bg-secondary/30 rounded-2xl group border border-border/40 hover:border-primary/20 transition-all">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0 ${e.type === "CREDIT" ? "bg-success/10" : "bg-destructive/10"
                      }`}>
                      {e.type === "CREDIT" ? (
                        <ArrowDownCircle className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-success" />
                      ) : (
                        <ArrowUpCircle className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-destructive" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col min-w-0">
                          <p className="font-bold text-[13px] sm:text-sm text-foreground truncate">{e.category}</p>
                          {e.vendorName && (
                            <p className="text-[10px] font-bold text-primary/80 uppercase truncate">🏭 {e.vendorName}</p>
                          )}
                        </div>
                        <span className={`text-[13px] sm:text-sm font-black shrink-0 ${e.type === "CREDIT" ? "text-success" : "text-destructive"}`}>
                          {e.type === "CREDIT" ? "+" : "-"}₹{e.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className="text-[11px] sm:text-xs font-medium text-muted-foreground">{getRelativeDate(e.date)}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-[11px] sm:text-xs font-semibold text-primary/80">{e.paymentMode}</span>
                      </div>
                    </div>
                  </div>

                  {(e.customer || e.worker || (displayDesc && displayDesc !== e.category)) && (
                    <div className="ml-[46px] sm:ml-[52px] border-t border-border/40 pt-2 flex flex-col gap-1">
                      {(e.customer || e.worker) && (
                        <p className="text-[11px] font-bold text-foreground/80 flex items-center gap-1 truncate">
                          👤 {e.customer?.name || e.worker?.name}
                        </p>
                      )}
                      {displayDesc && displayDesc !== e.category && (
                        <p className="text-[11px] text-muted-foreground italic break-words">
                          📝 {displayDesc}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 mt-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEditEntry(e)}
                      className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white transition-all active:scale-90"
                      title="Edit Entry"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteCashId(e.id)}
                      className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all active:scale-90"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center py-12 text-muted-foreground italic text-sm">No transactions found match your filters.</p>
          )}
        </div>
      </EntryCard>
      <ConfirmModal
        isOpen={!!deleteCashId}
        onClose={() => setDeleteCashId(null)}
        onConfirm={() => { if (deleteCashId) { deleteEntryMutation.mutate(deleteCashId); setDeleteCashId(null); } }}
        title="Delete Transaction?"
        description="Are you sure you want to delete this transaction? This cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </MobileFormLayout>
  );
};

export default CashBookPage;
