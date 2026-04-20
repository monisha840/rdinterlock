import { useState } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients.api";
import { settingsApi } from "@/api/settings.api";
import { SearchableSelect } from "@/components/SearchableSelect";

const STATUS_OPTIONS = ["PENDING", "IN_PRODUCTION", "READY", "DISPATCHED", "COMPLETED"];
const STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-700",
    IN_PRODUCTION: "bg-blue-100 text-blue-700",
    READY: "bg-purple-100 text-purple-700",
    DISPATCHED: "bg-teal-100 text-teal-700",
    COMPLETED: "bg-green-100 text-green-700",
};

const ClientOrdersPage = () => {
    const queryClient = useQueryClient();
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [filterClient, setFilterClient] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [form, setForm] = useState<{
        clientId: string;
        brickTypeId: string;
        quantity: string;
        rate: string;
        totalAmount: string;
        orderDate: string;
        expectedDispatchDate: string;
        status: string;
        constructionTypes: string[];
        notes: string;
        extraItems: Array<{ name: string; price: number }>;
    }>({
        clientId: "", brickTypeId: "", quantity: "", rate: "", totalAmount: "",
        orderDate: new Date().toISOString().split("T")[0],
        expectedDispatchDate: "", status: "PENDING", constructionTypes: [], notes: "",
        extraItems: []
    });
    const [autoDetect, setAutoDetect] = useState(true);

    const { data: orders = [], isLoading } = useQuery({
        queryKey: ["client-orders", filterClient, filterStatus],
        queryFn: () => clientsApi.getAllOrders({ clientId: filterClient || undefined, status: filterStatus || undefined }),
    });

    const { data: clients = [] } = useQuery({
        queryKey: ["clients"],
        queryFn: () => clientsApi.getAll(),
    });

    const { data: brickTypes = [] } = useQuery({
        queryKey: ["brick-types"],
        queryFn: () => settingsApi.getBrickTypes(),
    });

    const createMut = useMutation({
        mutationFn: (data: any) => clientsApi.createOrder(data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-orders"] }); setShowModal(false); resetForm(); toast.success("✅ Order created"); },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }: any) => clientsApi.updateOrder(id, data),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-orders"] }); setShowModal(false); setEditing(null); resetForm(); toast.success("✅ Order updated"); },
        onError: (e: any) => toast.error("❌ Failed", { description: e.message }),
    });

    const deleteMut = useMutation({
        mutationFn: (id: string) => clientsApi.deleteOrder(id),
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["client-orders"] }); toast.success("✅ Order deleted"); },
    });

    const resetForm = () => {
        setForm({
            clientId: "", brickTypeId: "", quantity: "", rate: "", totalAmount: "",
            orderDate: new Date().toISOString().split("T")[0], expectedDispatchDate: "",
            status: "PENDING", constructionTypes: [], notes: "", extraItems: []
        });
        setAutoDetect(true);
    };

    const openEdit = (o: any) => {
        setEditing(o);
        setForm({
            clientId: o.clientId, brickTypeId: o.brickTypeId, quantity: String(o.quantity), rate: String(o.rate), totalAmount: String(o.totalAmount || ""),
            orderDate: new Date(o.orderDate).toISOString().split("T")[0],
            expectedDispatchDate: o.expectedDispatchDate ? new Date(o.expectedDispatchDate).toISOString().split("T")[0] : "",
            status: o.status, constructionTypes: o.constructionType ? o.constructionType.split(", ") : [], notes: o.notes || "",
            extraItems: o.extraItems || []
        });
        setAutoDetect(false);
        setShowModal(true);
    };

    const handleCalcChange = (field: 'quantity' | 'rate', value: string) => {
        const newForm = { ...form, [field]: value };
        if (autoDetect) {
            const q = parseInt(newForm.quantity) || 0;
            const r = parseFloat(newForm.rate) || 0;
            const extraTotal = newForm.extraItems.reduce((sum, item) => sum + (item.price || 0), 0);
            if (q > 0 || extraTotal > 0) newForm.totalAmount = String((q * r) + extraTotal);
            else newForm.totalAmount = "";
        }
        setForm(newForm);
    };

    const addExtraItem = () => {
        const name = prompt("Item name (e.g. Cement, Loading)");
        if (!name) return;
        const price = parseFloat(prompt("Price (₹)") || "0");
        const newExtraItems = [...form.extraItems, { name, price }];
        const extraTotal = newExtraItems.reduce((sum, item) => sum + (item.price || 0), 0);
        const q = parseInt(form.quantity) || 0;
        const r = parseFloat(form.rate) || 0;
        
        setForm({ 
            ...form, 
            extraItems: newExtraItems,
            totalAmount: autoDetect ? String((q * r) + extraTotal) : form.totalAmount
        });
    };

    const removeExtraItem = (idx: number) => {
        const newExtraItems = form.extraItems.filter((_, i) => i !== idx);
        const extraTotal = newExtraItems.reduce((sum, item) => sum + (item.price || 0), 0);
        const q = parseInt(form.quantity) || 0;
        const r = parseFloat(form.rate) || 0;
        
        setForm({ 
            ...form, 
            extraItems: newExtraItems,
            totalAmount: autoDetect ? String((q * r) + extraTotal) : form.totalAmount
        });
    };

    const handleTotalOverride = (val: string) => {
        setAutoDetect(false);
        setForm({ ...form, totalAmount: val });
    };

    const handleSubmit = () => {
        if (!form.clientId || !form.brickTypeId || !form.quantity || !form.totalAmount) return toast.error("Fill required fields");
        const payload = {
            clientId: form.clientId,
            brickTypeId: form.brickTypeId,
            quantity: parseInt(form.quantity),
            rate: parseFloat(form.rate) || 0,
            totalAmount: parseFloat(form.totalAmount) || 0,
            orderDate: form.orderDate,
            expectedDispatchDate: form.expectedDispatchDate || undefined,
            status: form.status,
            constructionType: form.constructionTypes.length > 0 ? form.constructionTypes.join(", ") : undefined,
            notes: form.notes || undefined,
            extraItems: form.extraItems,
        };
        if (editing) updateMut.mutate({ id: editing.id, data: payload });
        else createMut.mutate(payload);
    };

    return (
        <MobileFormLayout title="Client Orders" subtitle="Track all brick orders">
            {/* Filters */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} className="h-10 px-3 bg-card border border-border rounded-xl text-sm">
                    <option value="">All Clients</option>
                    {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-10 px-3 bg-card border border-border rounded-xl text-sm">
                    <option value="">All Status</option>
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                </select>
            </div>

            <button onClick={() => { resetForm(); setEditing(null); setShowModal(true); }} className="w-full h-11 mb-4 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4" /> New Order
            </button>

            {isLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary/40" /></div>
            ) : orders.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No orders found</p>
            ) : (
                <div className="space-y-2">
                    {orders.map((o: any) => (
                        <div key={o.id} className="p-3 bg-card border border-border rounded-xl">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h3 className="text-sm font-semibold">{o.client?.name}</h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">{o.brickType?.size} • {o.quantity} pcs{o.constructionType ? ` • ${o.constructionType}` : ''} • Est Amount: ₹{o.totalAmount?.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Ordered: {new Date(o.orderDate).toLocaleDateString()}
                                        {o.expectedDispatchDate && ` • Dispatch: ${new Date(o.expectedDispatchDate).toLocaleDateString()}`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[o.status] || "bg-gray-100 text-gray-700"}`}>{o.status?.replace("_", " ")}</span>
                                    <button onClick={() => openEdit(o)} className="p-1.5 rounded-lg hover:bg-secondary"><Edit2 className="h-3.5 w-3.5 text-amber-500" /></button>
                                    <button onClick={() => deleteMut.mutate(o.id)} className="p-1.5 rounded-lg hover:bg-secondary"><Trash2 className="h-3.5 w-3.5 text-red-500" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => { setShowModal(false); setEditing(null); resetForm(); }}>
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">{editing ? "Edit Order" : "New Order"}</h2>
                            <button onClick={() => { setShowModal(false); setEditing(null); resetForm(); }}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <SearchableSelect
                                    value={form.clientId}
                                    onChange={(id) => setForm({ ...form, clientId: id })}
                                    options={clients.map((c: any) => ({ value: c.id, label: c.name, sublabel: c.phone }))}
                                    placeholder="Select Client *"
                                    emptyText="No matching client"
                                />
                                {form.clientId && (
                                    <div className="text-xs text-muted-foreground bg-secondary/30 p-2 rounded-lg border border-border/50">
                                        {(() => {
                                            const c = clients.find((x: any) => x.id === form.clientId);
                                            if (!c) return null;
                                            return (
                                                <div className="flex justify-between font-medium">
                                                    <span>Order Total: <span className="text-foreground">₹{c.totalOrderAmount?.toLocaleString() || 0}</span></span>
                                                    <span>Advance: <span className="text-foreground">₹{c.advanceBalance?.toLocaleString() || 0}</span></span>
                                                    <span>Pending: <span className="text-destructive font-bold">₹{c.pendingAmount?.toLocaleString() || 0}</span></span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                            <select value={form.brickTypeId} onChange={(e) => setForm({ ...form, brickTypeId: e.target.value })} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                <option value="">Select Brick Type *</option>
                                {brickTypes.map((b: any) => <option key={b.id} value={b.id}>{b.size}</option>)}
                            </select>
                            <div>
                                <label className="text-xs font-medium text-foreground ml-1">Construction Type (select multiple)</label>
                                <div className="grid grid-cols-4 gap-1.5 mt-1">
                                    {["Room", "Compound", "Godown", "Other"].map((ct) => (
                                        <button key={ct} type="button" onClick={() => {
                                            const types = form.constructionTypes.includes(ct)
                                                ? form.constructionTypes.filter(t => t !== ct)
                                                : [...form.constructionTypes, ct];
                                            setForm({ ...form, constructionTypes: types });
                                        }}
                                            className={`h-9 rounded-lg text-xs font-bold border transition-all ${form.constructionTypes.includes(ct) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/40"}`}>
                                            {ct}
                                        </button>
                                    ))}
                                </div>
                            </div>
                             <div className="grid grid-cols-2 gap-2">
                                <input value={form.quantity} onChange={(e) => handleCalcChange('quantity', e.target.value)} type="number" placeholder="Quantity *" className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                                <input value={form.rate} onChange={(e) => handleCalcChange('rate', e.target.value)} type="number" placeholder="Rate per brick" className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                            </div>

                            {/* Extra Items Section */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-muted-foreground uppercase px-1">Extra Items</label>
                                    <button onClick={addExtraItem} className="text-[10px] font-bold text-primary hover:underline">+ ADD ITEM</button>
                                </div>
                                <div className="space-y-1">
                                    {form.extraItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center bg-secondary/30 p-2 rounded-lg text-xs">
                                            <span>{item.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">₹{item.price}</span>
                                                <button onClick={() => removeExtraItem(idx)}><X className="h-3 w-3 text-destructive" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {form.extraItems.length === 0 && <p className="text-[10px] text-muted-foreground italic px-1">No extra items added</p>}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-foreground ml-1">ESTIMATED AMOUNT (₹) *</label>
                                <input value={form.totalAmount} onChange={(e) => handleTotalOverride(e.target.value)} type="number" placeholder="Estimated Amount *" className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <input value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} type="date" className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                                <input value={form.expectedDispatchDate} onChange={(e) => setForm({ ...form, expectedDispatchDate: e.target.value })} type="date" placeholder="Expected Dispatch" className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                            </div>
                            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                            </select>
                            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" rows={2} className="w-full px-3 py-2 bg-secondary/50 border border-border rounded-xl text-sm resize-none" />
                        </div>
                        <div className="flex gap-2 mt-5">
                            <button onClick={() => { setShowModal(false); setEditing(null); resetForm(); }} className="flex-1 h-10 rounded-xl border border-border text-sm font-medium hover:bg-secondary">Cancel</button>
                            <button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending} className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
                                {(createMut.isPending || updateMut.isPending) ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : editing ? "Update" : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MobileFormLayout>
    );
};

export default ClientOrdersPage;
