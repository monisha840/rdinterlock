import { useState } from "react";
import { MobileFormLayout } from "@/components/MobileFormLayout";
import { toast } from "sonner";
import { Plus, Edit2, Trash2, Loader2, X } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients.api";
import { settingsApi } from "@/api/settings.api";

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
    const [form, setForm] = useState({ clientId: "", brickTypeId: "", quantity: "", rate: "", orderDate: new Date().toISOString().split("T")[0], expectedDispatchDate: "", status: "PENDING", notes: "" });

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

    const resetForm = () => setForm({ clientId: "", brickTypeId: "", quantity: "", rate: "", orderDate: new Date().toISOString().split("T")[0], expectedDispatchDate: "", status: "PENDING", notes: "" });

    const openEdit = (o: any) => {
        setEditing(o);
        setForm({
            clientId: o.clientId, brickTypeId: o.brickTypeId, quantity: String(o.quantity), rate: String(o.rate),
            orderDate: new Date(o.orderDate).toISOString().split("T")[0],
            expectedDispatchDate: o.expectedDispatchDate ? new Date(o.expectedDispatchDate).toISOString().split("T")[0] : "",
            status: o.status, notes: o.notes || "",
        });
        setShowModal(true);
    };

    const handleSubmit = () => {
        if (!form.clientId || !form.brickTypeId || !form.quantity) return toast.error("Fill required fields");
        const payload = {
            clientId: form.clientId,
            brickTypeId: form.brickTypeId,
            quantity: parseInt(form.quantity),
            rate: parseFloat(form.rate) || 0,
            totalAmount: parseInt(form.quantity) * (parseFloat(form.rate) || 0),
            orderDate: form.orderDate,
            expectedDispatchDate: form.expectedDispatchDate || undefined,
            status: form.status,
            notes: form.notes || undefined,
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
                                    <p className="text-xs text-muted-foreground mt-0.5">{o.brickType?.size} • {o.quantity} pcs • ₹{o.totalAmount?.toLocaleString()}</p>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-card rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">{editing ? "Edit Order" : "New Order"}</h2>
                            <button onClick={() => { setShowModal(false); setEditing(null); resetForm(); }}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-3">
                            <select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                <option value="">Select Client *</option>
                                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select value={form.brickTypeId} onChange={(e) => setForm({ ...form, brickTypeId: e.target.value })} className="w-full h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm">
                                <option value="">Select Brick Type *</option>
                                {brickTypes.map((b: any) => <option key={b.id} value={b.id}>{b.size}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <input value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} type="number" placeholder="Quantity *" className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                                <input value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} type="number" placeholder="Rate per brick" className="h-10 px-3 bg-secondary/50 border border-border rounded-xl text-sm" />
                            </div>
                            {form.quantity && form.rate && (
                                <p className="text-xs text-muted-foreground">Total: ₹{(parseInt(form.quantity) * parseFloat(form.rate)).toLocaleString()}</p>
                            )}
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
