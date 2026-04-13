import { useState, useMemo, useRef, useEffect } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Loader2, X, Download, IndianRupee, Tag, Search, MapPin, ChevronDown, ChevronRight, Truck, Check, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients.api";
import { settingsApi } from "@/api/settings.api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

const PAYMENT_METHODS = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE", "OTHER"];

const DeliveryLedger = ({ clientId }: { clientId: string }) => {
    const { data: ledger, isLoading } = useQuery({
        queryKey: ["client-ledger-detail", clientId],
        queryFn: () => clientsApi.getLedger(clientId),
        enabled: !!clientId,
    });

    if (isLoading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary/40" /></div>;

    const deliveryLedger = ledger?.deliveryLedger || [];
    const pendingAmount = ledger?.pendingAmount || 0;

    if (deliveryLedger.length === 0) {
        return (
            <div className="mt-3 p-3 bg-secondary/20 rounded-xl text-center">
                <p className="text-xs text-muted-foreground italic">No deliveries yet</p>
            </div>
        );
    }

    return (
        <div className="mt-3 space-y-2">
            {/* Rows — Card layout for mobile, table-like for larger */}
            {deliveryLedger.map((d: any) => (
                <div key={d.id} className="p-3 bg-secondary/20 rounded-xl border border-border/40 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[11px] font-bold text-foreground">{format(new Date(d.date), "dd/MM/yy")}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-md font-bold">{d.brickType}</span>
                            {d.constructionType && <span className="text-[10px] text-muted-foreground truncate">{d.constructionType}</span>}
                        </div>
                        <span className={cn("text-[11px] font-black shrink-0", d.balancePending > 0 ? "text-red-600" : "text-green-600")}>
                            ₹{(d.balancePending || 0).toLocaleString()}
                        </span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] font-medium text-muted-foreground">
                        <span>Qty: <span className="text-foreground font-bold">{d.quantity.toLocaleString()}</span></span>
                        <span>Amount: <span className="text-foreground font-bold">₹{(d.amount || 0).toLocaleString()}</span></span>
                        <span>Recd: <span className="text-green-600 font-bold">₹{(d.paidAmount || 0).toLocaleString()}</span></span>
                    </div>
                </div>
            ))}

            {/* Footer */}
            <div className="flex justify-between items-center px-2 pt-3 border-t-2 border-primary/20">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Balance Pending Payment</span>
                <span className={cn("text-sm font-black", pendingAmount > 0 ? "text-red-600" : "text-green-600")}>
                    ₹{Math.max(0, pendingAmount).toLocaleString()}
                </span>
            </div>
        </div>
    );
};

const ClientSearchSelect = ({ clients, value, onChange }: { clients: any[]; value: string; onChange: (id: string) => void }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = clients.find((c: any) => c.id === value);
    const filtered = clients.filter((c: any) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return c.name?.toLowerCase().includes(q) || c.address?.toLowerCase().includes(q);
    });

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    return (
        <div ref={containerRef} className="relative">
            {value && selected ? (
                <div className="flex items-center justify-between h-11 px-3 bg-secondary/50 border border-primary/30 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span className="text-sm font-semibold text-foreground truncate">{selected.name}</span>
                        {selected.address && <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">({selected.address})</span>}
                    </div>
                    <button onClick={() => { onChange(""); setQuery(""); }} className="p-1 hover:bg-secondary rounded-lg shrink-0">
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                        onFocus={() => setOpen(true)}
                        placeholder="Search client by name or location *"
                        className="w-full h-11 pl-9 pr-3 bg-secondary/50 border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                    />
                </div>
            )}
            {open && !value && (
                <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filtered.length === 0 ? (
                        <p className="p-3 text-xs text-muted-foreground text-center">No clients found</p>
                    ) : (
                        filtered.map((c: any) => (
                            <button
                                key={c.id}
                                onClick={() => { onChange(c.id); setOpen(false); setQuery(""); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0"
                            >
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                                    {c.address && <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5 shrink-0" />{c.address}</p>}
                                </div>
                                {(c.pendingAmount || 0) > 0 && (
                                    <span className="text-[10px] font-bold text-red-600 shrink-0">₹{c.pendingAmount.toLocaleString()}</span>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const ClientLedgerPage = () => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("ALL");
    const [formType, setFormType] = useState<"PAYMENT" | "ADVANCE" | "RETURN">("PAYMENT");
    const [expandedClient, setExpandedClient] = useState<string | null>(null);
    const [form, setForm] = useState({ 
        clientId: "", orderId: "", amount: "", 
        paymentDate: new Date().toISOString().split("T")[0], 
        paymentMethod: "CASH", notes: "",
        brickTypeId: "", returnedQuantity: "" 
    });

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ["clients", search],
        queryFn: () => clientsApi.getAll(search || undefined)
    });

    const { data: orders = [] } = useQuery({
        queryKey: ["client-orders-for-payment", form.clientId],
        queryFn: () => clientsApi.getAllOrders({ clientId: form.clientId }),
        enabled: !!form.clientId && formType === "PAYMENT",
    });

    const { data: brickTypes = [] } = useQuery({
        queryKey: ["brick-types"],
        queryFn: () => settingsApi.getBrickTypes(),
    });

    const createMut = useMutation({
        mutationFn: (data: any) => clientsApi.createPayment(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            setShowModal(false);
            resetForm();
            toast.success(`✅ ${formType === "ADVANCE" ? "Advance" : "Payment"} recorded`);
        },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const returnMut = useMutation({
        mutationFn: (data: any) => clientsApi.createReturn(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            setShowModal(false);
            resetForm();
            toast.success("✅ Return recorded");
        },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => clientsApi.deletePayment(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); toast.success("✅ Deleted successfully"); },
    });

    const resetForm = () => {
        setForm({ 
            clientId: "", orderId: "", amount: "", 
            paymentDate: new Date().toISOString().split("T")[0], 
            paymentMethod: "CASH", notes: "",
            brickTypeId: "", returnedQuantity: ""
        });
        setEditing(null);
    };

    const openModal = (type: "PAYMENT" | "ADVANCE" | "RETURN", clientId?: string) => {
        setFormType(type);
        resetForm();
        if (clientId) setForm(prev => ({ ...prev, clientId }));
        setShowModal(true);
    };

    const handleSubmit = () => {
        if (formType === "RETURN") {
            if (!form.clientId || !form.brickTypeId || !form.returnedQuantity) return toast.error("Fill required fields");
            returnMut.mutate({
                clientId: form.clientId,
                brickTypeId: form.brickTypeId,
                returnedQuantity: parseInt(form.returnedQuantity),
                date: form.paymentDate,
                notes: form.notes || undefined
            });
            return;
        }

        if (!form.clientId || !form.amount) return toast.error("Fill required fields");
        const payload = {
            clientId: form.clientId,
            orderId: (formType === "PAYMENT" && form.orderId) ? form.orderId : undefined,
            type: formType,
            amount: parseFloat(form.amount),
            paymentDate: form.paymentDate,
            paymentMethod: form.paymentMethod,
            notes: form.notes || undefined,
        };
        createMut.mutate(payload);
    };

    const filteredClients = useMemo(() => {
        let result = clients;
        if (filterType === "PAYMENT") result = result.filter((c: any) => c.totalPaid > 0);
        if (filterType === "ADVANCE") result = result.filter((c: any) => (c.advanceBalance || 0) > 0);
        if (filterType === "PENDING") result = result.filter((c: any) => (c.pendingAmount || 0) > 0);
        return result;
    }, [clients, filterType]);

    // Summaries
    const totalReceived = clients.reduce((s: number, c: any) => s + (c.totalPaid || 0), 0);
    const totalAdvance = clients.reduce((s: number, c: any) => s + (c.advanceBalance || 0), 0);

    const handleLedgerPDF = () => {
        try {
            if (filteredClients.length === 0) { toast.error("No data to export"); return; }
            const doc = new jsPDF();
            doc.setFontSize(16); doc.text("RD Interlock - Client Ledger", 14, 15);
            doc.setFontSize(10); doc.text("Generated: " + format(new Date(), "dd-MM-yyyy"), 14, 22);
            autoTable(doc, {
                head: [["Client", "Location", "Total Paid", "Advance Balance", "Pending"]],
                body: filteredClients.map((c: any) => [c.name, c.address || "-", "Rs." + (c.totalPaid || 0).toLocaleString(), "Rs." + (c.advanceBalance || 0).toLocaleString(), "Rs." + (c.pendingAmount || 0).toLocaleString()]),
                startY: 28, styles: { fontSize: 8 }, headStyles: { fillColor: [59, 130, 246] },
            });
            doc.save("client-ledger-" + format(new Date(), "dd-MM-yyyy") + ".pdf");
            toast.success("PDF exported");
        } catch (err: any) { toast.error("Export failed", { description: err.message }); }
    };

    const handleLedgerExcel = () => {
        try {
            if (filteredClients.length === 0) { toast.error("No data to export"); return; }
            const cols = ["Client", "Location", "Total Paid", "Advance Balance", "Pending"];
            const rows = filteredClients.map((c: any) => [c.name, c.address || "-", c.totalPaid || 0, c.advanceBalance || 0, c.pendingAmount || 0]);
            const ws = XLSX.utils.aoa_to_sheet([cols, ...rows]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Client Ledger");
            XLSX.writeFile(wb, "client-ledger-" + format(new Date(), "dd-MM-yyyy") + ".xlsx");
            toast.success("Excel exported");
        } catch (err: any) { toast.error("Export failed", { description: err.message }); }
    };

    return (
        <MobileFormLayout title="Client Ledger" subtitle="Payment & Advance tracking">
            {/* Export */}
            <div className="flex gap-2 mb-3">
                <button onClick={handleLedgerPDF} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-secondary/50 border border-border text-[11px] font-bold hover:bg-secondary transition-all active:scale-[0.98]"><FileText className="h-3.5 w-3.5" /> PDF</button>
                <button onClick={handleLedgerExcel} className="h-9 px-3 flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-all active:scale-[0.98]"><Download className="h-3.5 w-3.5" /> Excel</button>
            </div>
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                    <p className="text-[10px] sm:text-xs text-green-600 font-medium">Total Received</p>
                    <p className="text-base sm:text-lg font-bold text-green-700">₹{totalReceived.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-center">
                    <p className="text-[10px] sm:text-xs text-blue-600 font-medium">Total Advance</p>
                    <p className="text-base sm:text-lg font-bold text-blue-700">₹{totalAdvance.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-center">
                    <p className="text-[10px] sm:text-xs text-purple-600 font-medium">Clients</p>
                    <p className="text-base sm:text-lg font-bold text-purple-700">{clients.length}</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => openModal("PAYMENT")} className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                    <Plus className="h-4 w-4" /> Add Payment
                </button>
                <button onClick={() => openModal("ADVANCE")} className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
                    <Plus className="h-4 w-4" /> Add Advance
                </button>
                <button onClick={() => openModal("RETURN")} className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors col-span-2">
                    <Plus className="h-4 w-4" /> Add Brick Return
                </button>
            </div>

            {/* Search & Filter */}
            <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name or location..."
                        className="w-full h-10 pl-9 pr-3 bg-card border border-border rounded-xl text-sm focus:border-primary focus:outline-none"
                    />
                </div>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-[120px] h-10 px-3 bg-card border border-border rounded-xl text-sm focus:outline-none">
                    <option value="ALL">All</option>
                    <option value="PAYMENT">Payment</option>
                    <option value="ADVANCE">Advance</option>
                    <option value="PENDING">Pending</option>
                </select>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
            ) : filteredClients.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No clients found</p>
            ) : (
                <div className="space-y-3">
                    {filteredClients.map((c: any) => (
                        <div key={c.id} className="p-4 bg-card border border-border rounded-2xl shadow-sm hover:border-primary/20 transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-base text-foreground">{c.name}</h3>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> {c.address || "No Location"}
                                    </p>
                                </div>
                                 <div className="flex gap-1">
                                    <button onClick={() => openModal("PAYMENT", c.id)} className="p-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-primary" title="Quick Payment">
                                        <Plus className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => openModal("RETURN", c.id)} className="p-1.5 rounded-lg bg-secondary/50 hover:bg-secondary text-orange-600" title="Quick Return">
                                        < IndianRupee className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-2 py-2 border-t border-b border-border/50 my-2">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                                    <div className="flex items-center gap-1.5 py-1 px-2.5 bg-green-50 text-green-700 rounded-lg font-semibold">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                        Payment: ₹{c.totalPaid?.toLocaleString() || 0}
                                    </div>
                                    <div className="flex items-center gap-1.5 py-1 px-2.5 bg-blue-50 text-blue-700 rounded-lg font-semibold">
                                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                        Advance: ₹{c.advanceBalance?.toLocaleString() || 0}
                                    </div>
                                    <div className="flex items-center gap-1.5 py-1 px-2.5 bg-red-50 text-red-700 rounded-lg font-bold">
                                        <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                                        Pending: ₹{c.pendingAmount?.toLocaleString() || 0}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-2 pt-1 text-[11px] text-muted-foreground">
                                <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">Mode: <span className="text-foreground font-medium">{c.latestPaymentMethod || 'N/A'}</span></span>
                                    <span className="flex items-center gap-1">Date: <span className="text-foreground font-medium">{c.latestPaymentDate ? new Date(c.latestPaymentDate).toLocaleDateString() : 'N/A'}</span></span>
                                </div>
                            </div>

                            {/* Delivery Ledger Toggle */}
                            <button
                                onClick={() => setExpandedClient(expandedClient === c.id ? null : c.id)}
                                className="w-full mt-3 h-9 flex items-center justify-center gap-1.5 rounded-xl bg-secondary/50 border border-border/50 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                            >
                                <Truck className="h-3.5 w-3.5" />
                                Delivery Ledger
                                {expandedClient === c.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>

                            {/* Expanded Delivery Ledger */}
                            {expandedClient === c.id && <DeliveryLedger clientId={c.id} />}
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50">
                    <div className="bg-card rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl max-h-[85vh] overflow-y-auto pb-safe sm:pb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">
                                {editing ? (formType === 'ADVANCE' ? "Edit Advance" : formType === 'RETURN' ? "Edit Return" : "Edit Payment") : (formType === 'ADVANCE' ? "Add Advance" : formType === 'RETURN' ? "Add Return" : "Add Payment")}
                            </h2>
                            <button onClick={() => { setShowModal(false); resetForm(); }}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <ClientSearchSelect
                                    clients={clients}
                                    value={form.clientId}
                                    onChange={(id) => setForm({ ...form, clientId: id, orderId: "" })}
                                />
                                {form.clientId && (
                                    <div className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg border border-border/50">
                                        {(() => {
                                            const c: any = clients.find((x: any) => x.id === form.clientId);
                                            if (!c) return null;
                                            return (
                                                <div className="flex flex-wrap gap-x-3 gap-y-1 font-medium">
                                                    <span>Order Total: <span className="text-foreground">₹{c.totalOrderAmount?.toLocaleString() || 0}</span></span>
                                                    <span>Advance: <span className="text-foreground">₹{c.advanceBalance?.toLocaleString() || 0}</span></span>
                                                    <span>Pending: <span className="text-destructive font-bold">₹{c.pendingAmount?.toLocaleString() || 0}</span></span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                            {formType === "PAYMENT" && form.clientId && orders.length > 0 && (
                                <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })} className="w-full h-11 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                    <option value="">Link to Order (optional)</option>
                                    {orders.map((o: any) => <option key={o.id} value={o.id}>{o.brickType?.size} — {o.quantity} pcs — ₹{o.totalAmount?.toLocaleString()} ({o.status})</option>)}
                                </select>
                            )}
                            {formType === "PAYMENT" && form.clientId && (
                                <p className="text-xs text-muted-foreground mt-1 px-1">If client has Advance Balance, it will be automatically applied to the order.</p>
                            )}
                            
                            {formType === "RETURN" ? (
                                <>
                                    <select 
                                        value={form.brickTypeId} 
                                        onChange={(e) => setForm({ ...form, brickTypeId: e.target.value })} 
                                        className="w-full h-11 px-3 bg-secondary/50 border border-border rounded-xl text-sm"
                                    >
                                        <option value="">Select Brick Type *</option>
                                        {brickTypes.map((b: any) => <option key={b.id} value={b.id}>{b.size}</option>)}
                                    </select>
                                    <input value={form.returnedQuantity} onChange={(e) => setForm({ ...form, returnedQuantity: e.target.value })} type="number" placeholder="Returned Quantity *" className="w-full h-11 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                                </>
                            ) : (
                                <input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" placeholder="Amount (₹) *" className="w-full h-11 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                            )}

                            <input value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} type="date" className="w-full h-11 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                            
                            {formType !== "RETURN" && (
                                <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-full h-11 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                                </select>
                            )}

                            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={3} className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm resize-none" />
                        </div>
                        <div className="flex gap-2 mt-5 sticky bottom-0 pt-3 pb-1 bg-card">
                            <button onClick={() => { setShowModal(false); resetForm(); }} className="flex-1 h-11 rounded-xl border border-border text-sm font-medium hover:bg-secondary transition-colors">Cancel</button>
                            <button onClick={handleSubmit} disabled={createMut.isPending || returnMut.isPending} className={cn("flex-1 h-11 rounded-xl text-white text-sm font-semibold transition-colors disabled:opacity-50", formType === 'ADVANCE' ? 'bg-blue-600 hover:bg-blue-700' : formType === 'RETURN' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-primary hover:bg-primary/90')}>
                                {(createMut.isPending || returnMut.isPending) ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MobileFormLayout>
    );
};

export default ClientLedgerPage;
